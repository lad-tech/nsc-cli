import fs from 'fs';
import path from 'path';
import { ImportDeclarationStructure, StructureKind } from 'ts-morph';
import { FILE_EXTENTION, SERVICE_RUN_FILE_NAME, TOOLKIT_MODULE_NAME } from '../constants';
import { MiddlewareFn, MiddlewareOptions } from '../interfaces';

export const generateServerFile: MiddlewareFn = async (opts: MiddlewareOptions): Promise<void> => {
  const { project, schema, directoryPath } = opts;
  const methodNames = Object.keys(schema.methods);
  const methodImports: ImportDeclarationStructure[] = Object.keys(schema.methods).map(name => {
    return {
      kind: StructureKind.ImportDeclaration,
      namedImports: [name],
      moduleSpecifier: `./methods/${schema.methods[name].action}`,
    };
  });

  const file = project.createSourceFile(
    path.join(directoryPath, `${SERVICE_RUN_FILE_NAME}${FILE_EXTENTION}`),
    {
      statements: [
        {
          kind: StructureKind.ImportDeclaration,
          namedImports: ['name'],
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
            'const brokerConnection = await connect({ servers: [`localhost:4222`] });',
            `await new Service({
   name,
   brokerConnection,
   methods: [${methodNames.join(',')}],
   events: [],
 }).start();
          
          `,
          ],
        },
      ],
    },
    {
      overwrite: true,
    },
  );

  file?.addStatements([
    'main().catch(console.error);',
    fs.readFileSync(path.resolve(__dirname, '../handleErrors.ts.tpl')).toString(),
  ]);

  await file.save();
};
