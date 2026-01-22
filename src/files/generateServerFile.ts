import * as path from 'path';
import {
  ImportDeclarationStructure,
  PropertyAssignmentStructure,
  StructureKind,
  SyntaxKind,
  VariableDeclarationKind,
} from 'ts-morph';
import { FILE_EXTENTION, SERVICE_RUN_FILE_NAME, TOOLKIT_MODULE_NAME } from '../constants';
import { MiddlewareFn, MiddlewareOptions, ServiceSchema } from '../interfaces';
import { isIgnore } from '../utils';

export const generateServerFile: MiddlewareFn = async (opts: MiddlewareOptions): Promise<void> => {
  const { project, schema, directoryPath } = opts;
  const filePath = path.join(directoryPath, `${SERVICE_RUN_FILE_NAME}${FILE_EXTENTION}`);
  if (await isIgnore(directoryPath, filePath)) {
    return;
  }
  const existsFile = project.addSourceFileAtPathIfExists(filePath);

  const shutdown: string | undefined = '';
  const hasEvents = Object.keys(schema.events?.list || {}).length > 0;

  const methodImports: ImportDeclarationStructure[] = getMethodsImports(schema, hasEvents, opts.schemaFileName);

  const methodNames = Object.keys(schema.methods);

  if (existsFile) {
    const imports = existsFile.getImportDeclarations();
    imports.forEach(i => {
      const specifier = i.getModuleSpecifierValue();
      if (
        specifier.startsWith('./methods/') ||
        specifier === `./${opts.schemaFileName}` ||
        specifier === `./${opts.schemaFileName}.js` ||
        (opts.schemaFileName.endsWith('.json') && specifier === `./${opts.schemaFileName}`)
      ) {
        i.remove();
      }
    });

    existsFile.addImportDeclarations(methodImports);
    
    // // Добавляем деструктуризацию schemaData после импортов
    // const importDeclarations = existsFile.getImportDeclarations();
    // const schemaImport = importDeclarations.find(
    //   i => i.getModuleSpecifierValue() === `./${opts.schemaFileName}`
    // );
    // if (schemaImport) {
    //   const importIndex = schemaImport.getChildIndex();
    //   const nextStatement = existsFile.getStatements()[importIndex + 1];
    //   // Проверяем, что следующая строка не является уже деструктуризацией schemaData
    //   if (!nextStatement || 
    //       (nextStatement.getKind() === SyntaxKind.VariableStatement && 
    //        !nextStatement.getText().includes('schemaData'))) {
    //     existsFile.insertVariableStatement(importIndex + 1, {
    //       declarationKind: VariableDeclarationKind.Const,
    //       declarations: [
    //         {
    //           name: hasEvents ? '{ name, events }' : '{ name }',
    //           initializer: 'schemaData',
    //         },
    //       ],
    //     });
    //   }
    // }
    
    const service = existsFile
      .getFunctionOrThrow('main')
      .getDescendantsOfKind(SyntaxKind.NewExpression)
      .find((ex: { getText: () => string | string[] }) => ex.getText().includes('Service'));

    const ServiceArguments = service?.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression)?.[0]?.getProperties();
    const methodsArray = ServiceArguments?.find(
      arg => (arg.getStructure() as PropertyAssignmentStructure)?.name === 'methods',
    );

    methodsArray?.set({
      initializer: `[${methodNames.join(',')}]`,
    });
    const events = !!ServiceArguments?.find(
      arg => (arg.getStructure() as PropertyAssignmentStructure)?.name === 'events',
    );
    //  если в схеме есть евенты
    if (hasEvents) {
      // в файле они отсутствуют
      if (!events) {
        service?.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression)?.[0]?.addProperties('events');
      }
    } else {
      service?.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression)?.[0]?.getProperty('events')?.remove();
    }

    await existsFile.save();
  } else {
    //  создать новый файл
    const initParams = `{
    name,
    brokerConnection,
    methods: [${methodNames.join(',')}],
   ${hasEvents ? 'events,' : ''}
    gracefulShutdown:${
      shutdown?.length
        ? shutdown
        : JSON.stringify({
            additional: [],
          })
    }
  }`;
    const file = project.createSourceFile(
      filePath,
      {
        statements: [
          {
            kind: StructureKind.ImportDeclaration,
            namedImports: ['Service'],
            moduleSpecifier: TOOLKIT_MODULE_NAME,
          },
          {
            kind: StructureKind.ImportDeclaration,
            namedImports: ['connect', 'NatsConnection'],
            moduleSpecifier: 'nats',
          },
          ...methodImports,
          {
            kind: StructureKind.VariableStatement,
            declarationKind: VariableDeclarationKind.Const,
            declarations: [
              {
                name: hasEvents ? '{ name, events }' : '{ name }',
                initializer: 'serviceSchema',
              },
            ],
          },
          {
            kind: StructureKind.Function,
            name: 'main',
            isExported: true,
            isAsync: true,
            parameters: [
              {
                kind: StructureKind.Parameter,
                name: 'broker?',
                type: 'NatsConnection',
              },
            ],
            statements: [
              {
                kind: StructureKind.VariableStatement,
                declarationKind: VariableDeclarationKind.Const,

                declarations: [
                  {
                    name: 'brokerConnection',
                    initializer:
                      '  broker ||\n' +
                      '      (await connect({\n' +
                      '        servers: [`localhost:4222`],\n' +
                      '        maxReconnectAttempts: -1,\n' +
                      '      }))',
                  },
                ],
              },
              '// Этот файл генерируется автоматически, этот вызов важен для генерации',

              `const service =  new Service(${initParams});`,
              `await service.start();`,
              `return service;`,
            ],
          },
        ],
      },
      {
        overwrite: true,
      },
    );

    await file.save();
  }
};

function getMethodsImports(schema: ServiceSchema, hasEvents: boolean, schemaFileName: string) {
  const methodImports: ImportDeclarationStructure[] = Object.keys(schema.methods).map(name => {
    return {
      kind: StructureKind.ImportDeclaration,
      namedImports: [name],
      moduleSpecifier: `./methods/${name}.js`,
    };
  });
  methodImports.push({
    kind: StructureKind.ImportDeclaration,
    defaultImport: 'serviceSchema',
    moduleSpecifier: `./${schemaFileName}`,
    attributes: [
      {
        kind: StructureKind.ImportAttribute,
        name: 'type',
        value: 'json',
      },
    ],
  });
  return methodImports;
}
