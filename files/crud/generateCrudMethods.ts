import fs from 'fs';
import path from 'path';
import { Scope } from 'ts-morph';
import { CrudMiddlewareFn } from '../../v2/crud/interfaces';

/**
 * Вспомогательная функция для преобразования JSON Schema типов в TypeScript типы
 */
function getType(propertySchema: any): string {
  switch (propertySchema?.type) {
    case 'string':
      if (propertySchema.enum) {
        return propertySchema.enum.map((val: string) => `'${val}'`).join(' | ');
      }
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return `${getType(propertySchema.items)}[]`;
    case 'object':
      if (propertySchema.properties) {
        return `{ ${Object.keys(propertySchema.properties)
          .map(key => `${key}: ${getType(propertySchema.properties[key])}`)
          .join('; ')} }`;
      }
      return 'Record<string, any>';
    default:
      return 'any';
  }
}

/**
 * Функция для генерации CRUD-методов в папку methods, каждый метод в отдельной папке
 */
export const generateCrudMethods: CrudMiddlewareFn = async opts => {
  const { crudSchema, project, rootPath, serviceSchema } = opts;
  const schema = crudSchema.entityData;
  const entityName = crudSchema.entityName;

  const methodsDirectoryPath = path.resolve(rootPath, 'methods');

  // Создание директории methods, если она не существует
  if (!fs.existsSync(methodsDirectoryPath)) {
    fs.mkdirSync(methodsDirectoryPath, { recursive: true });
  }

  // Определение CRUD-операций и соответствующих им методных имен
  const crudOperations = [
    { operation: 'Create', methodName: `${entityName}Create` },
    { operation: 'Read', methodName: `Get${entityName}ById` },
    { operation: 'Get', methodName: `Get${entityName}s` },
    { operation: 'Update', methodName: `Update${entityName}` },
    { operation: 'Delete', methodName: `Delete${entityName}ById` },
  ];

  // Генерация каждого CRUD-метода
  for (const currentOperation of crudOperations) {
    const { operation, methodName } = currentOperation;

    const methodFolderPath = path.resolve(methodsDirectoryPath, methodName);
    const filePath = path.resolve(methodFolderPath, `${methodName}.ts`);

    // Создание папки для метода, если она не существует
    if (!fs.existsSync(methodFolderPath)) {
      fs.mkdirSync(methodFolderPath, { recursive: true });
    }

    // Определение настроек метода из service.schema.json, если они есть
    const methodSettings =
      serviceSchema.methods && serviceSchema.methods[methodName] ? serviceSchema.methods[methodName] : {};

    // Определение интерфейсов для запросов и ответов
    const requestInterface = `${methodName}Request`;
    const responseInterface = `${methodName}Response`;

    // Создание файла метода
    const methodFile = project.createSourceFile(filePath, '', { overwrite: true });

    // Добавление импортов
    const importDeclarations = [
      {
        moduleSpecifier: '@lad-tech/nsc-toolkit',
        namedImports: ['BaseMethod', 'inject'],
      },
      // Добавляем 'preparePagination' только для метода 'List'
      ...(operation === 'Get'
        ? [
            {
              moduleSpecifier: 'general',
              namedImports: ['preparePagination'],
            },
          ]
        : []),
      {
        moduleSpecifier: '../../di.types',
        namedImports: ['TYPES'],
      },
      {
        moduleSpecifier: '../../interfaces',
        namedImports: [requestInterface, responseInterface],
      },
      {
        moduleSpecifier: '../../domain/aggregates/' + entityName,
        namedImports: [entityName],
      },
      {
        moduleSpecifier: '../../repositories',
        namedImports: [`${entityName}Repository`],
      },
      {
        moduleSpecifier: '../../service.schema.json',
        namedImports: ['methods'],
      },
    ];

    methodFile.addImportDeclarations(importDeclarations);

    // Создание класса метода
    const classDeclaration = methodFile.addClass({
      name: methodName,
      isExported: true,
      extends: 'BaseMethod',
    });

    // Добавление статических настроек
    classDeclaration.addProperty({
      isStatic: true,
      name: 'settings',
      initializer: `methods.${methodName}`,
      type: 'any', // Можно уточнить тип, если известен
    });

    // Добавление инъекции репозитория
    classDeclaration.addProperty({
      decorators: [
        {
          name: 'inject',
          arguments: [`TYPES.${entityName}Repository`],
        },
      ],
      name: 'repository',
      type: `${entityName}Repository`,
      scope: Scope.Private,
    });

    // Определение параметров и тела метода handler
    let handlerParameters = '';
    let handlerBody = '';

    switch (operation) {
      case 'Create':
        handlerParameters = `data: ${requestInterface}`;
        handlerBody = `
          this.logger.info({ methods: '${methodName} started', data });
          const aggregate = new ${entityName}(data);
          const createdEntity = await this.repository.create(aggregate);
          return createdEntity.getView();
        `;
        break;
      case 'Read':
        handlerParameters = `{ id }: ${requestInterface}`;
        handlerBody = `
          this.logger.info({ methods: '${methodName} started', id });
          const entity = await this.repository.findById(id);
          if (!entity) {
            throw new Error('${entityName} not found');
          }
          return { data: entity.getView() };
        `;
        break;
      case 'Update':
        handlerParameters = `{ id, changes}: ${requestInterface}`;
        handlerBody = `
          this.logger.info({ methods: '${methodName} started', id, data });
           const entity = await this.repository.findById(id);
          if (!entity) {
            throw new Error('Entity not found');
          }
          let key: keyof ${requestInterface}['changes'];
          for (key in changes) {
            (entity as any)[key] = changes[key];
          }

          await this.repository.update(entity);

          return { data: entity.getView() };
        `;
        break;
      case 'Delete':
        handlerParameters = `{ id }: ${requestInterface}`;
        handlerBody = `
           this.logger.info({ methods: 'DeleteNotificationById started', id });
            const entity = await this.repository.deleteById(id);
            if (!entity) {
              throw new Error('Entity not found');
            }
            return { data: entity.getView() };
        `;
        break;
      case 'Get':
        handlerParameters = `{  filter, page, size }: ${requestInterface}`;
        handlerBody = `
           this.logger.info({ methods: 'GetNotifications started' });
            const { meta, data } = await this.repository.getList({
              ...filter,
              page,
              size,
            });
            return {
              data: data.map(entity => entity.getView()),
              meta,
            };
        `;
        break;
      default:
        handlerParameters = '';
        handlerBody = '';
    }

    // Добавление метода handler
    classDeclaration.addMethod({
      name: 'handler',
      isAsync: true,
      parameters: [
        {
          name: handlerParameters.split(':')[0].trim(),
          type: handlerParameters.split(':')[1].trim(),
        },
      ],
      returnType: `Promise<${responseInterface}>`,
      statements: handlerBody.trim(),
    });

    // Сохранение файла метода
    methodFile.saveSync();
    console.log(`Метод ${methodName}.ts сгенерирован:`, methodFile.getFilePath());
  }
};
