import { mkdir, access } from 'fs/promises';
import { constants } from 'fs';
import * as path from 'path';
import { StructureKind, VariableDeclarationKind } from 'ts-morph';
import { FILE_EXTENTION, INTERFACES_FILE_NAME, TOOLKIT_MODULE_NAME } from '../constants.js';
import { MiddlewareFn, MiddlewareOptions } from '../interfaces.js';

/**
 * Функция-middleware для генерации файлов обработчиков методов и тестовых файлов
 * @param opts - Опции генерации, включая проект, схему и путь к директории
 * @throws {GenerationError} Если генерация файла не удалась
 */
export const generateMethods: MiddlewareFn = async (opts: MiddlewareOptions): Promise<void> => {
  const { project, schema, directoryPath } = opts;

  const methodsDirectoryPath = path.join(directoryPath, 'methods');
  try {
    await access(methodsDirectoryPath, constants.F_OK);
  } catch {
    await mkdir(methodsDirectoryPath);
  }

  for (const methodName in schema.methods) {
    const method = schema.methods[methodName];
    const returnType = `${methodName}Response`;
    const requestType = `${methodName}Request`;

    const methodsDirectoryFolderPath = path.join(directoryPath, 'methods', methodName);
    try {
      await access(methodsDirectoryFolderPath, constants.F_OK);
    } catch {
      await mkdir(methodsDirectoryFolderPath);
    }

    const filePath = path.join(methodsDirectoryFolderPath, `index${FILE_EXTENTION}`);
    const testFilePath = path.join(methodsDirectoryFolderPath, `index.test${FILE_EXTENTION}`);

    try {
      await access(filePath, constants.F_OK);
      continue; // File exists
    } catch {
      // File doesn't exist, continue with generation
    }
    const useStream = Boolean(method?.options?.useStream?.request) || Boolean(method?.options?.useStream?.response);
    const requestT = method?.options?.useStream?.request ? 'Readable' : requestType;
    const returnT = method?.options?.useStream?.response ? 'Readable' : returnType;
    project.createSourceFile(
      filePath,
      {
        statements: [
          {
            kind: StructureKind.ImportDeclaration,
            isTypeOnly: true,
            namedImports: [returnType, requestType],
            moduleSpecifier: `../../${INTERFACES_FILE_NAME}.js`,
          },
          {
            kind: StructureKind.ImportDeclaration,
            defaultImport: 'serviceSchema',
            moduleSpecifier: `../../${opts.schemaFileName}`,
            attributes: [
              {
                kind: StructureKind.ImportAttribute,
                name: 'type',
                value: 'json',
              },
            ],
          },


          useStream
            ? {
              kind: StructureKind.ImportDeclaration,
              namedImports: ['Readable'],
              moduleSpecifier: 'stream',
            }
            : '',
          {
            kind: StructureKind.ImportDeclaration,
            namedImports: ['BaseMethod'],
            moduleSpecifier: TOOLKIT_MODULE_NAME,
          },
          {
            kind: StructureKind.Class,
            name: methodName,
            properties: [
              {
                kind: StructureKind.Property,
                name: 'settings',
                isStatic: true,
                initializer: `serviceSchema.methods.${methodName}`,
              },
            ],
            methods: [
              {
                name: 'handler',
                isAsync: true,
                returnType: `Promise<${returnT}>`,
                statements: `this.logger.info('${methodName} started'); \n // TODO: Implement ${methodName} handler logic \n throw new Error('Method not implemented');`,
                parameters: [
                  {
                    kind: StructureKind.Parameter,
                    name: 'payload',
                    type: requestT,
                  },
                ],
              },
            ],
            decorators: [],
            isExported: true,

            extends: `BaseMethod`,
          },
        ],
      },
      {
        overwrite: true,
      },
    );

    const test = project.createSourceFile(
      testFilePath,
      {
        statements: [
          {
            kind: StructureKind.ImportDeclaration,
            namedImports: [methodName],
            moduleSpecifier: `.`,
          },
        ],
      },
      { overwrite: true },
    );
    test.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const, // defaults to "let"
      declarations: [
        {
          name: 'ctx',
          initializer: `{
            repository: {},
            errors: {
            },
            emitter: {},
            logger: console,
          
          }`,
        },
      ],
    });
    test.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const, // defaults to "let"
      declarations: [
        {
          name: 'testData',
          type: 'any',
          initializer: '{}',
        },
      ],
    });
    test.applyTextChanges([
      {
        newText:
          `describe('Проверка ${methodName}', () => {\n` +
          '    beforeEach(jest.clearAllMocks);\n' +
          `    test.skip('Успех', async () => {\n` +
          '     // TODO  Написать тест \n' +
          `          await new ${methodName}().handler.call(ctx, testData);` +
          '      });\n' +
          "  test.skip('Ошибка синхронизации', async () => {\n" +
          "    // ctx.repository[].mockRejectedValue(new Error('runtime'));\n" +
          `    await expect(new ${methodName}().handler.call(ctx, testData)).rejects.toThrow();\n` +
          '  });' +
          '})\n',
        span: {
          start: 350,
          length: 100,
        },
      },
    ]);

    await test.save();
  }
};
