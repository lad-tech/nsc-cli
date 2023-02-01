import * as path from 'path';
import { ImportDeclarationStructure, StructureKind, SyntaxKind, VariableDeclarationKind } from 'ts-morph';
import { FILE_EXTENTION, SERVICE_RUN_FILE_NAME, TOOLKIT_MODULE_NAME } from '../constants';
import { MiddlewareFn, MiddlewareOptions } from '../interfaces';
import { isIgnore } from '../utils';

export const generateServerFile: MiddlewareFn = async (opts: MiddlewareOptions): Promise<void> => {
  const { project, schema, directoryPath } = opts;
  const filePath = path.join(directoryPath, `${SERVICE_RUN_FILE_NAME}${FILE_EXTENTION}`);
  if (await isIgnore(directoryPath, filePath)) {
    return;
  }
  const existsFile = project.addSourceFileAtPath(filePath);
  const shutdown: string | undefined = '';
  const hasEvents = Object.keys(schema.events?.list || {}).length > 0;
  const methodImports: ImportDeclarationStructure[] = Object.keys(schema.methods).map(name => {
    return {
      kind: StructureKind.ImportDeclaration,
      namedImports: [name],
      moduleSpecifier: `./methods/${name}`,
    };
  });
  methodImports.push(
    {
      kind: StructureKind.ImportDeclaration,
      namedImports: hasEvents ? ['name', 'events'] : ['name'],
      moduleSpecifier: './service.json',
    },
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
  );
  const methodNames = Object.keys(schema.methods);
  if (existsFile) {
    const imports = existsFile.getImportDeclarations();
    imports.forEach(i => i.remove());
    existsFile.addImportDeclarations(methodImports);

    //   shutdown = existsFile // try {
    //     .getFunctionOrThrow('main')
    //     .getVariableDeclarationOrThrow('initParams')
    //     .getInitializerIfKind(SyntaxKind.ObjectLiteralExpression)
    //     ?.getPropertyOrThrow('gracefulShutdown')
    //     .getChildAtIndex(2)
    //     .getFullText();
    // } catch (err) {
    //   console.error(err);
    // }
    existsFile
      .getFunctionOrThrow('main')
      .getVariableDeclarationOrThrow('initParams')
      .getInitializerIfKind(SyntaxKind.ObjectLiteralExpression)
      ?.getPropertyOrThrow('methods')
      .set({
        initializer: `[${methodNames.join(',')}]`,
      });
    const eventProp = existsFile
      .getFunction('main')
      ?.getVariableDeclaration('initParams')
      ?.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
    if (hasEvents && !eventProp?.getProperty('events')) {
      eventProp?.addProperties('events');
    } else {
      eventProp?.getProperty('events')?.remove();
    }

    return;
  }

  const initParams = `{
    name,
    brokerConnection,
    methods: [${methodNames.join(',')}],
   ${hasEvents ? 'events,' : ''}
    gracefulShutdown:${
      shutdown && shutdown.length
        ? shutdown
        : JSON.stringify({
            additional: ['qwweee'],
          })
    }
  }`;
  const file = project.createSourceFile(
    filePath,
    {
      statements: [
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
            {
              kind: StructureKind.VariableStatement,
              declarationKind: VariableDeclarationKind.Const,

              declarations: [
                {
                  name: 'initParams',
                  initializer: initParams,
                },
              ],
            },
            {
              kind: StructureKind.VariableStatement,
              declarationKind: VariableDeclarationKind.Const,
              declarations: [
                {
                  name: 'service',
                  type: 'Service',
                  initializer: `new Service(initParams)`,
                },
              ],
            },

            `await service.start();     
          `,
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
