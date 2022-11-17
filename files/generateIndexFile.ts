import path from 'path';
import { ImportSpecifierStructure, MethodDeclarationStructure, OptionalKind, Project, StructureKind } from 'ts-morph';
import { FILE_EXTENTION, INDEX_FILE_NAME, INTERFACES_FILE_NAME, TOOLKIT_MODULE_NAME } from '../constants';
import { MiddlewareFn, ServiceSchema } from '../interfaces';

export const generateIndexFile: MiddlewareFn = async (
  project: Project,
  schema: ServiceSchema,
  directoryPath: string,
): Promise<void> => {
  const methods: OptionalKind<MethodDeclarationStructure>[] = [];
  const imports: OptionalKind<ImportSpecifierStructure>[] = [];
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
    methods.push({
      kind: StructureKind.Method,
      name: method.action,
      isAsync: true,
      returnType: `Promise<${returnType}>`,
      statements: `return this.request<${returnType}>(\`\${name}.\${methods.WeirdSum.action}\`, payload, methods.WeirdSum);`,
      parameters: [
        {
          kind: StructureKind.Parameter,
          name: 'payload',
          type: requestType,
        },
      ],
    });
  }

  project.createSourceFile(
    path.join(directoryPath, `${INDEX_FILE_NAME}${FILE_EXTENTION}`),
    {
      statements: [
        {
          kind: StructureKind.ImportDeclaration,
          isTypeOnly: true,
          namedImports: imports,

          moduleSpecifier: `./${INTERFACES_FILE_NAME}`,
        },

        // reexport
        // {
        //   kind: StructureKind.ExportDeclaration,
        //   moduleSpecifier: `${INTERFACES_FILE_NAME}${FILE_EXTENTION}`,
        //   namespaceExport: `${schema.name}`,
        // },
        {
          kind: StructureKind.ImportDeclaration,
          namedImports: ['name', 'methods'],
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
          kind: StructureKind.Class,
          name: schema.name,
          ctors: [
            // 'constructor(nats: NatsConnection, baggage?: Baggage, cacheSettings?: CacheSettings) {\n' +
            // '    super(nats, name, baggage, cacheSettings);\n' +
            // '  }'
            {
              kind: StructureKind.Constructor,
              statements: 'super(nats, name, baggage, cacheSettings);',
              parameters: [
                {
                  kind: StructureKind.Parameter,
                  name: 'nats',
                  type: 'NatsConnection',
                },
                {
                  kind: StructureKind.Parameter,
                  name: 'baggage?',

                  type: 'Baggage',
                },
                {
                  kind: StructureKind.Parameter,
                  name: 'cacheSettings?',
                  type: 'CacheSettings',
                },
              ],
            },
          ],
          methods,
          isExported: true,
          isDefaultExport: true,
          extends: 'Client',
        },
      ],
    },
    {
      overwrite: true,
    },
  );
};
