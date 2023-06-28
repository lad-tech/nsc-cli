import fs from 'fs';
import * as path from 'path';
import { StructureKind, VariableDeclarationKind } from 'ts-morph';
import { FILE_EXTENTION, INTERFACES_FILE_NAME, TOOLKIT_MODULE_NAME } from '../constants';
import { MiddlewareFn, MiddlewareOptions } from '../interfaces';

export const generateMethods: MiddlewareFn = async (opts: MiddlewareOptions): Promise<void> => {
  const { project, schema, directoryPath } = opts;

  const methodsDirectoryPath = path.join(directoryPath, 'methods');
  if (!fs.existsSync(methodsDirectoryPath)) {
    fs.mkdirSync(methodsDirectoryPath);
  }
  for (const methodName in schema.methods) {
    const method = schema.methods[methodName];
    const returnType = `${methodName}Response`;
    const requestType = `${methodName}Request`;

    const methodsDirectoryFolderPath = path.join(directoryPath, 'methods', methodName);
    if (!fs.existsSync(methodsDirectoryFolderPath)) {
      fs.mkdirSync(methodsDirectoryFolderPath);
    }
    const filePath = path.join(methodsDirectoryFolderPath, `index${FILE_EXTENTION}`);
    const testFilePath = path.join(methodsDirectoryFolderPath, `index.test${FILE_EXTENTION}`);

    if (fs.existsSync(filePath)) {
      continue;
    }
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
            moduleSpecifier: `../../${INTERFACES_FILE_NAME}`,
          },
          {
            kind: StructureKind.ImportDeclaration,
            namedImports: ['methods'],
            moduleSpecifier: `../../${opts.schemaFileName}`,
          },
          {
            kind: StructureKind.ImportDeclaration,
            namedImports: ['Readable'],
            moduleSpecifier: 'stream',
          },
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
                initializer: `methods.${methodName}`,
              },
            ],
            methods: [
              {
                name: 'handler',
                isAsync: true,
                returnType: `Promise<${returnT}>`,
                statements: `this.logger.info('${methodName} started'); \n // TODO WTF??? \n throw new Error('Not Implemented');`,
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
          name: 'context',
          initializer: '{}',
        },
      ],
    });
    test.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const, // defaults to "let"
      declarations: [
        {
          name: 'testData',
          type: 'any',
          initializer: `{
            repository: {},
            errors: {
            },
            logger: console,
          
          }`,
        },
      ],
    });
    test.applyTextChanges([
      {
        newText:
          `describe('Проверка ${methodName}', () => {\n` +
          '    beforeEach(jest.clearAllMocks);\n' +
          `    test.skip('Успех', async () => {\n` +
          ' // TODO  Написать тест \n' +
          '      })\n' +
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
