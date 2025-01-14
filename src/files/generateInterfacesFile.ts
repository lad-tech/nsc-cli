import fs from 'fs/promises';
import { compile } from 'json-schema-to-typescript';
import * as Path from 'path';
import * as path from 'path';
import { StructureKind } from 'ts-morph';
import { FILE_EXTENTION, INTERFACES_FILE_NAME } from '../constants';
import { MiddlewareFn, MiddlewareOptions } from '../interfaces';
import { isIgnore } from '../utils';

export const generateInterfacesFile: MiddlewareFn = async (opts: MiddlewareOptions): Promise<void> => {
  const { project, schema, directoryPath } = opts;
  const filePath = path.join(directoryPath, `${INTERFACES_FILE_NAME}${FILE_EXTENTION}`);
  if (await isIgnore(directoryPath, filePath)) {
    return;
  }
  let interfaces = '';
  const refPath = path.resolve(directoryPath);
  if (schema.Ref?.['$id']) {
    const RefSchemaName = Path.resolve(refPath, schema.Ref['$id']);
    await fs.writeFile(RefSchemaName, JSON.stringify(schema.Ref, null, 2));
  }
  for (const methodName in schema.methods) {
    const method = schema.methods[methodName];
    const returnType = `${methodName}Response`;
    const requestType = `${methodName}Request`;

    const requestInterface = await compile(method.request, requestType, {
      bannerComment: '',
      additionalProperties: true,
      strictIndexSignatures: true,
      maxItems: -1,
      cwd: refPath,
      $refOptions: {},
    });

    const responseInterface = await compile(method.response, returnType, {
      bannerComment: '',
      additionalProperties: true,
      strictIndexSignatures: true,
      cwd: refPath,
      maxItems: -1,
      $refOptions: {},
    });
    interfaces += requestInterface + '\n';
    interfaces += responseInterface + '\n';
  }

  const events = schema.events?.list || {};
  const generalEventsData: Array<{ name: string; interfaceName: string; isStream: boolean }> = [];
  for (const eventName in events) {
    const event = events[eventName];

    const eventInterfaceName = `${eventName}Event`;
    const eventInterface = await compile(event.event, eventInterfaceName, {
      bannerComment: '',
      additionalProperties: false,
      cwd: refPath,
      $refOptions: {},
    });

    interfaces += eventInterface + '\n';
    const isStream = event?.options?.stream || false;
    generalEventsData.push({
      name: eventName,
      interfaceName: eventInterfaceName,
      isStream,
    });
  }

  let externalEvents = `export interface Emitter${schema.name}External extends Emitter{ \n`;
  let internalEvents = `export interface Emitter${schema.name}{ \n`;

  generalEventsData.forEach(e => {
    externalEvents += ` ${e.name}: ${e.isStream ? 'EventStreamHandler' : 'EventHandler'}<${e.interfaceName}>;\n`;
    internalEvents += `${e.name}: (params: ${e.interfaceName}, uniqId?: string, rollupId?: string) => void;\n`;
  });
  externalEvents += '} \n';
  internalEvents += ' \n [eventName: string]: (params: any, uniqId?: string, rollupId?: string) => void; \n } \n';
  if (generalEventsData.length) {
    interfaces += internalEvents + '\n' + externalEvents + '\n';
  }

  const file = project.createSourceFile(filePath, '', {
    overwrite: true,
  });
  file.addStatements([
    generalEventsData.length
      ? {
          kind: StructureKind.ImportDeclaration,
          isTypeOnly: true,
          namedImports: ['EventHandler', 'EventStreamHandler', 'Emitter'],
          moduleSpecifier: `@lad-tech/nsc-toolkit`,
        }
      : '',
    '\n/**\n' +
      ' * Данный файл сгенерирован автоматически. Для модификации интерфейсов исправьте схему сервиса\n' +
      ' */',
    interfaces,
  ]);
  if (schema.Ref?.['$id']) {
    const RefSchemaName = Path.resolve(refPath, schema.Ref['$id']);
    await fs.rm(RefSchemaName);
  }

  file.fixUnusedIdentifiers();
  const declarations = new Set<string>();
  file.getInterfaces().forEach(i => {
    const name = i.getName();
    if (declarations.has(name)) {
      i.remove();
    }
    declarations.add(name);
  });

  file.getTypeAliases().forEach(i => {
    const name = i.getName();
    if (declarations.has(name)) {
      i.remove();
    }
    declarations.add(name);
  });
};
