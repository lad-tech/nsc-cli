import * as path from 'path';
import {
  FunctionDeclarationStructure,
  ImportDeclarationStructure,
  Node,
  StatementStructures,
  StructureKind,
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
  // console.log('qq', filePath, existsFile);

  if (existsFile) {
    const statements = existsFile.getStructure().statements as StatementStructures[];
    const main = statements.find(
      statement => statement.kind == StructureKind.Function && statement?.name == 'main',
    ) as FunctionDeclarationStructure;
    console.log(
      '--->',
      Node.isSignaturedDeclaration((main.statements as any[])[1].declarations[0].initializer),
      (main.statements as any[])[1].declarations[0],
    );
  }

  const methodNames = Object.keys(schema.methods);

  const methodImports: ImportDeclarationStructure[] = Object.keys(schema.methods).map(name => {
    return {
      kind: StructureKind.ImportDeclaration,
      namedImports: [name],
      moduleSpecifier: `./methods/${name}`,
    };
  });
  const hasEvents = Object.keys(schema.events?.list || {}).length > 0;
  const initParams = `{
    name,
    brokerConnection,
    methods: [${methodNames.join(',')}],
   ${hasEvents ? 'events,' : ''}
    gracefulShutdown: {
      additional: []
    }
  }`;
  const file = project.createSourceFile(
    filePath,
    {
      statements: [
        {
          kind: StructureKind.ImportDeclaration,
          namedImports: ['name', 'events'],
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
                  name: 'service',
                  type: 'Service',
                  initializer: `new Service(${initParams})`,
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
