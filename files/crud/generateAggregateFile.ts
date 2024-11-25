import fs from 'fs';
import path from 'path';
import { Scope } from 'ts-morph';
import { CrudMiddlewareFn } from '../../v2/crud/interfaces';

export const generateAggregateFile: CrudMiddlewareFn = async opts => {
  const { crudSchema, project, rootPath } = opts;
  const schema = crudSchema.entityData;
  const className = crudSchema.entityName;

  const aggregateDirectoryPath = path.resolve(rootPath, 'domain', 'aggregates', className);

  if (!fs.existsSync(aggregateDirectoryPath)) {
    fs.mkdirSync(aggregateDirectoryPath, { recursive: true });
  }

  if (schema.properties) {
    const classFile = project.createSourceFile(
      path.resolve(aggregateDirectoryPath, `${className}.ts`),
      "import { randomUUID } from 'node:crypto';" + `\n import { ${className}Params } from './interfaces';`,
      {
        overwrite: true,
      },
    );
    const props = schema.properties;
    const fields = [
      ...Object.keys(props).map(prop => {
        const propertySchema = props[prop];
        return {
          name: prop,
          type: getType(propertySchema),
          hasQuestionToken: !schema.required?.includes(prop),
          scope: Scope.Public,
          isReadonly: false,
          isStatic: false,
        };
      }),
      {
        name: 'id',
        type: 'string',
        scope: Scope.Public,
        isReadonly: true,
        isStatic: false,
      },
      {
        name: 'created',
        type: 'Date',
        scope: Scope.Public,
        isReadonly: false,
        isStatic: false,
      },
      {
        name: 'updated',
        type: 'Date',
        scope: Scope.Public,
        isReadonly: false,
        isStatic: false,
      },
    ];
    schema.required?.push('id', 'created', 'updated');
    const myAggregate = classFile.addClass({
      kind: undefined,
      name: className,
      isExported: true,
      properties: fields,
      ctors: [
        {
          parameters: [
            {
              name: 'params',
              type: `${className}Params & Partial<{
              id: string;
              created: Date;
              updated: Date;
            }>`,
            },
          ],
          statements:
            Object.keys(props)
              .map((prop: string) => {
                const isOptional = !schema.required?.includes(prop);
                return `this.${prop} = params.${prop}${isOptional ? ' ?? undefined' : ''};`;
              })
              .join('\n') +
            `
            this.id = params.id ?? randomUUID();
            this.created = params.created ? new Date(params.created) : new Date();
            this.updated = params.updated ? new Date(params.updated) : new Date();
            `,
        },
      ],
    });

    // // Добавляем дополнительные методы
    myAggregate.addMethod({
      name: 'toJSON',
      statements: `return { ${fields.map(prop => ` ${prop.name}: this.${prop.name} ,`).join('\n')} }`,
    });
    myAggregate.addMethod({
      name: 'getView',
      statements: `return { ${fields.map(prop => ` ${prop.name}: this.${prop.name} ,`).join('\n')} }`,
    });

    classFile.saveSync();

    //   Создание interfaces.ts
    const interfacesFile = project.createSourceFile(path.resolve(aggregateDirectoryPath, `interfaces.ts`), ``, {
      overwrite: true,
    });

    interfacesFile.addInterface({
      name: `${className}Params`,
      isExported: true,
      properties: Object.keys(props).map(prop => {
        const propertySchema = props[prop];
        return {
          name: prop,
          type: getType(propertySchema),
          hasQuestionToken: !schema.required?.includes(prop),
        };
      }),
    });
    interfacesFile.addStatements([
      `export type ${className}Db= ${className}Params & {   id: string;
              created: Date;
              updated: Date;
              }`,
    ]);
    interfacesFile.saveSync();

    const indexFile = project.createSourceFile(
      path.resolve(aggregateDirectoryPath, `index.ts`),
      `export * from './${className}';  export * from './interfaces';`,
      {
        overwrite: true,
      },
    );
    indexFile.saveSync();
    console.log('Класс сгенерирован:', classFile.getFilePath());
  }
};

function getType(propertySchema: any): string {
  switch (propertySchema?.type) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return `${getType(propertySchema.items)}[]`;
    case 'object':
      return 'Record<string, any>';
    default:
      return 'any';
  }
}
