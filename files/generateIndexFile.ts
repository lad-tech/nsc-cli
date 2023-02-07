import * as path from 'path';
import { ImportSpecifierStructure, MethodDeclarationStructure, OptionalKind, StructureKind } from 'ts-morph';
import { FILE_EXTENTION, INDEX_FILE_NAME, INTERFACES_FILE_NAME, TOOLKIT_MODULE_NAME } from '../constants';
import { MiddlewareFn, MiddlewareOptions } from '../interfaces';
import { isIgnore } from '../utils';

export const generateIndexFile: MiddlewareFn = async (opts: MiddlewareOptions): Promise<void> => {
  const { project, schema, directoryPath } = opts;
  const methods: OptionalKind<MethodDeclarationStructure>[] = [];
  const imports: OptionalKind<ImportSpecifierStructure>[] = [];
  const filePath = path.join(directoryPath, `${INDEX_FILE_NAME}${FILE_EXTENTION}`);
  if (await isIgnore(directoryPath, filePath)) {
    return;
  }
  for (const methodName in schema.methods) {
    const method = schema.methods[methodName];
    const returnType = `${methodName}Response`;
    const requestType = `${methodName}Request`;
    imports.push(
      ...[
        {
          name: requestType,
        },
        {
          name: returnType,
        },
      ],
    );
    const requestT = method?.options?.useStream?.request ? 'Readable' : requestType;
    const returnT = method?.options?.useStream?.response ? 'Readable' : returnType;
    methods.push({
      kind: StructureKind.Method,
      name: method.action,
      isAsync: true,
      returnType: `Promise<${returnT}>`,
      statements: `return this.request<${returnT}>(\`\${name}.\${methods.${methodName}.action}\`, payload, methods.${methodName});`,
      parameters: [
        {
          kind: StructureKind.Parameter,
          name: 'payload',
          type: requestT,
        },
      ],
    });
  }
  const hasEvents = Object.keys(schema.events?.list || {}).length > 0;
  if (hasEvents) {
    imports.push({
      name: `Emitter${schema.name}External`,
    });
  }
  project.createSourceFile(
    filePath,
    {
      statements: [
        {
          kind: StructureKind.ImportDeclaration,
          isTypeOnly: true,
          namedImports: imports,

          moduleSpecifier: `./${INTERFACES_FILE_NAME}`,
        },

        {
          kind: StructureKind.ImportDeclaration,
          namedImports: hasEvents ? ['name', 'methods', 'events'] : ['name', 'methods'],
          moduleSpecifier: './service.json',
        },
        {
          kind: StructureKind.ImportDeclaration,
          namedImports: ['Client', 'Baggage', 'CacheSettings'],
          moduleSpecifier: TOOLKIT_MODULE_NAME,
        },
        {
          kind: StructureKind.ImportDeclaration,
          isTypeOnly: true,
          namedImports: ['NatsConnection'],
          moduleSpecifier: 'nats',
        },
        {
          kind: StructureKind.ImportDeclaration,
          namedImports: ['Readable'],
          moduleSpecifier: 'stream',
        },
        {
          kind: StructureKind.Class,
          name: schema.name,
          ctors: [
            {
              kind: StructureKind.Constructor,
              statements: `super({ broker, serviceName: name, baggage, cache, ${hasEvents ? 'events' : ''} }); `,
              parameters: [
                {
                  kind: StructureKind.Parameter,
                  name: 'broker',
                  type: 'NatsConnection',
                },
                {
                  kind: StructureKind.Parameter,
                  name: 'baggage?',

                  type: 'Baggage',
                },
                {
                  kind: StructureKind.Parameter,
                  name: 'cache?',
                  type: 'CacheSettings',
                },
              ],
            },
          ],
          methods,
          isExported: true,
          isDefaultExport: true,
          extends: hasEvents ? `Client<Emitter${schema.name}External>` : 'Client',
        },
      ],
    },
    {
      overwrite: true,
    },
  );
};
