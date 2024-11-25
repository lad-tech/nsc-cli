import fs from 'fs';
import path from 'path';
import { StructureKind } from 'ts-morph';
import { CrudMiddlewareFn } from '../../crud/interfaces';

/**
 * Функция для генерации файлов di.types.ts и di.config.ts
 */
export const generateDiFiles: CrudMiddlewareFn = async opts => {
  const { crudSchema, project, rootPath } = opts;
  const className = crudSchema.entityName;

  // Определение имен классов репозитория и сервиса
  const repositoryName = `${className}Repository`;
  const serviceName = `${className}Service`;

  // Пути к директории DI
  const diDirectoryPath = path.resolve(rootPath);

  // Создание директории DI, если она не существует
  if (!fs.existsSync(diDirectoryPath)) {
    fs.mkdirSync(diDirectoryPath, { recursive: true });
  }

  // --- Генерация di.types.ts ---
  const diTypesFilePath = path.resolve(diDirectoryPath, 'di.types.ts');
  const diTypesFile = project.createSourceFile(diTypesFilePath, '', { overwrite: true });

  // Определение символов
  const typesSymbolProperties = [
    {
      name: repositoryName,
      value: `${className}Repository`,
    },
    {
      name: serviceName,
      value: `${serviceName}Service`,
    },
    // Добавьте дополнительные стандартные зависимости при необходимости

    {
      name: 'Configurator',
      value: `${serviceName}Logger`,
    },
    {
      name: 'Logger',
      value: `${serviceName}Logger`,
    },
  ];

  // Добавление экспорта const TYPES
  diTypesFile.addVariableStatement({
    kind: StructureKind.VariableStatement,
    isExported: true,
    declarations: [
      {
        name: 'TYPES',
        initializer: `{ ${typesSymbolProperties
          .map(prop => `${prop.name}: Symbol.for('${prop.value}')`)
          .join(',\n  ')} }`,
      },
    ],
  });

  await diTypesFile.save();
  console.log('Файл di.types.ts сгенерирован:', diTypesFile.getFilePath());

  // --- Генерация di.config.ts ---
  const diConfigFilePath = path.resolve(diDirectoryPath, 'di.config.ts');
  const diConfigFile = project.createSourceFile(diConfigFilePath, '', { overwrite: true });

  // Импорты в di.config.ts
  diConfigFile.addImportDeclarations([
    {
      moduleSpecifier: '@lad-tech/nsc-toolkit',
      namedImports: ['container'],
    },
    {
      moduleSpecifier: 'general',
      namedImports: ['Configurator', 'logger'],
    },
    {
      moduleSpecifier: 'general/AuthToolkit',
      namedImports: ['AuthToolkit'],
    },
    {
      moduleSpecifier: './di.types',
      namedImports: ['TYPES'],
    },
    {
      moduleSpecifier: `./repository`,
      namedImports: [repositoryName],
    },
    {
      moduleSpecifier: `./domain/aggregates`,
      namedImports: [serviceName],
    },
  ]);

  // Добавление импорта reflect-metadata
  diConfigFile.addImportDeclaration({
    moduleSpecifier: 'reflect-metadata',
  });

  // Добавление блока try-catch и конфигурации контейнера
  const tryBlock = `
    container.symbol(TYPES.${serviceName}).to.Singleton(${serviceName});
    container.symbol(TYPES.${repositoryName}).to.Singleton(${repositoryName});
    container.symbol(TYPES.Configurator).to.Adapter(Configurator);
    container.symbol(TYPES.Logger).to.Constant(logger);
  `;

  diConfigFile.addStatements(`
    try {
      ${tryBlock}
    } catch (err) {
      console.error(err);
    }
  `);

  // Экспорт контейнера
  diConfigFile.addExportDeclaration({
    namedExports: ['container'],
  });

  await diConfigFile.save();
  console.log('Файл di.config.ts сгенерирован:', diConfigFile.getFilePath());
};
