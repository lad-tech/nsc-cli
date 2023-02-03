import * as path from 'path';
import {
  ImportDeclarationStructure,
  PropertyAssignmentStructure,
  StructureKind,
  SyntaxKind,
  VariableDeclarationKind,
} from 'ts-morph';
import { FILE_EXTENTION, SERVICE_RUN_FILE_NAME, TOOLKIT_MODULE_NAME } from '../constants';
import { MiddlewareFn, MiddlewareOptions } from '../interfaces';
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
  const methodImports: ImportDeclarationStructure[] = Object.keys(schema.methods).map(name => {
    return {
      kind: StructureKind.ImportDeclaration,
      namedImports: [name],
      moduleSpecifier: `./methods/${name}`,
    };
  });
  methodImports.push({
    kind: StructureKind.ImportDeclaration,
    namedImports: hasEvents ? ['name', 'events'] : ['name'],
    moduleSpecifier: './service.json',
  });
  const methodNames = Object.keys(schema.methods);
  if (existsFile) {
    const imports = existsFile.getImportDeclarations();
    imports.forEach(i => {
      if (
        i.getModuleSpecifierValue().startsWith('./methods/') ||
        i.getModuleSpecifierValue().startsWith('./service.json')
      ) {
        i.remove();
      }
    });

    existsFile.addImportDeclarations(methodImports);
    const service = existsFile
      .getFunctionOrThrow('main')
      .getDescendantsOfKind(SyntaxKind.NewExpression)
      .find(ex => ex.getText().includes('Service'));
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
    if (hasEvents && !events) {
      service?.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression)?.[0]?.addProperties('events');
    } else {
      service?.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression)?.[0]?.getProperty('events')?.remove();
    }
    await existsFile.save();
    return;
  }

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
          namedImports: ['connect'],
          moduleSpecifier: 'nats',
        },
        ...methodImports,
        {
          kind: StructureKind.Function,
          name: 'main',
          isAsync: true,
          statements: [
            {
              kind: StructureKind.VariableStatement,
              declarationKind: VariableDeclarationKind.Const,

              declarations: [
                {
                  name: 'brokerConnection',
                  initializer: 'await connect({ servers: [`localhost:4222`] })',
                },
              ],
            },
            '// Этот файл генерируется автоматически, этот вызов важен для генерации',

            `await new Service(${initParams}).start();`,
          ],
        },
      ],
    },
    {
      overwrite: true,
    },
  );

  file?.addStatements([]);

  await file.save();
};
