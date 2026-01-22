import * as path from 'path';
import { ImportSpecifierStructure, MethodDeclarationStructure, OptionalKind, StructureKind, VariableDeclarationKind } from 'ts-morph';
import {
  FILE_EXTENTION,
  INDEX_FILE_NAME,
  INTERFACES_FILE_NAME,
  TOOLBELT_MODULE_NAME,
  TOOLKIT_MODULE_NAME,
} from '../constants';
import { MiddlewareFn, MiddlewareOptions } from '../interfaces';
import { isIgnore } from '../utils';

export const generateIndexFile: MiddlewareFn = async (opts: MiddlewareOptions): Promise<void> => {
  const { project, schema, directoryPath, schemaFileName } = opts;
  const methods: OptionalKind<MethodDeclarationStructure>[] = [];
  const imports: OptionalKind<ImportSpecifierStructure>[] = [];
  const filePath = path.join(directoryPath, `${INDEX_FILE_NAME}${FILE_EXTENTION}`);
  if (await isIgnore(directoryPath, filePath)) {
    return;
  }
  let isUseStream: boolean = false;
  for (const methodName in schema.methods) {
    const method = schema.methods[methodName];

    const isRequestStream = Boolean(method.options?.useStream?.request);
    const isResponseStream = Boolean(method.options?.useStream?.response);
    isUseStream = isUseStream || isResponseStream || isRequestStream;
    const responseType = `${methodName}Response`;
    const requestType = `${methodName}Request`;
    if (!isRequestStream) {
      imports.push({
        name: requestType,
      });
    }
    if (!isResponseStream) {
      imports.push({
        name: responseType,
      });
    }

    const requestT = method?.options?.useStream?.request ? 'Readable' : requestType;
    const returnT = method?.options?.useStream?.response ? 'Readable' : responseType;

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
  const importFields = ['name', 'methods'];
  if (hasEvents) {
    imports.push({
      name: `Emitter${schema.name}External`,
    });
    importFields.push('events');
  }
  if (schema.Ref?.$id) {
    importFields.push('Ref');
  }

  project.createSourceFile(
    filePath,
    {
      statements: [
        {
          kind: StructureKind.ImportDeclaration,
          isTypeOnly: true,
          namedImports: imports,

          moduleSpecifier: `./${INTERFACES_FILE_NAME}.js`,
        },

        {
          kind: StructureKind.ImportDeclaration,
          defaultImport: "serviceSchema",
          moduleSpecifier: `./${schemaFileName}`,
          attributes: [
            {
              kind: StructureKind.ImportAttribute,
              name: 'type',
              value: 'json',

            },
          ],
        },
        {
          kind: StructureKind.VariableStatement,
          declarationKind: VariableDeclarationKind.Const,
          declarations: [
            {
              name: '{ name, methods, Ref }',
              initializer: 'serviceSchema',
            },
          ],
        },

        {
          kind: StructureKind.ImportDeclaration,
          namedImports: ['Client', 'Baggage', 'CacheSettings'],
          moduleSpecifier: TOOLKIT_MODULE_NAME,
        },
        {
          kind: StructureKind.ImportDeclaration,
          namedImports: ['Logs'],
          moduleSpecifier: TOOLBELT_MODULE_NAME,
        },
        {
          kind: StructureKind.ImportDeclaration,
          isTypeOnly: true,
          namedImports: ['NatsConnection'],
          moduleSpecifier: 'nats',
        },
        isUseStream
          ? {
            kind: StructureKind.ImportDeclaration,
            namedImports: ['Readable'],
            moduleSpecifier: 'stream',
          }
          : '',
        {
          kind: StructureKind.Class,
          name: schema.name,

          ctors: [
            {
              kind: StructureKind.Constructor,
              statements: `super({ broker, serviceName: name, baggage, cache,loggerOutputFormatter ${hasEvents ? ',events' : ''
                } ${schema.Ref?.$id ? ',Ref' : ''} }); `,
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
                {
                  kind: StructureKind.Parameter,
                  name: 'loggerOutputFormatter?',
                  type: 'Logs.OutputFormatter',
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
