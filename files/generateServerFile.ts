import * as fs from 'fs';
import * as path from 'path';
import { ImportDeclarationStructure, StructureKind } from 'ts-morph';
import { FILE_EXTENTION, SERVICE_RUN_FILE_NAME, TOOLKIT_MODULE_NAME } from '../constants';
import { MiddlewareFn, MiddlewareOptions } from '../interfaces';
import { isIgnore } from '../utils';

export const generateServerFile: MiddlewareFn = async (opts: MiddlewareOptions): Promise<void> => {
  const { project, schema, directoryPath } = opts;
  const methodNames = Object.keys(schema.methods);
  const methodImports: ImportDeclarationStructure[] = Object.keys(schema.methods).map(name => {
    return {
      kind: StructureKind.ImportDeclaration,
      namedImports: [name],
      moduleSpecifier: `./methods/${name}`,
    };
  });
  const filePath = path.join(directoryPath, `${SERVICE_RUN_FILE_NAME}${FILE_EXTENTION}`);
  if (await isIgnore(directoryPath, filePath)) {
    return;
  }

  const file = project.createSourceFile(
    filePath,
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
    fs.readFileSync(path.resolve(__dirname, '../handleErrors.ts.tpl')).toString(),
    'main().catch(console.error);',
  ]);

  await file.save();
};
