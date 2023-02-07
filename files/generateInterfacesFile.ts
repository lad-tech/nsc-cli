import { compile } from 'json-schema-to-typescript';
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

  for (const methodName in schema.methods) {
    const method = schema.methods[methodName];
    const returnType = `${methodName}Response`;
    const requestType = `${methodName}Request`;
    const requestInterface = await compile(method.request, requestType, {
      bannerComment: '',
    });
    const responseInterface = await compile(method.response, returnType, {
      bannerComment: '',
    });
    interfaces += requestInterface + '\n';
    interfaces += responseInterface + '\n';
  }
  const events = schema.events?.list || {};
  const eventsData = [];
  const generalEventsData: Array<{ name: string; interfaceName: string; isStream: boolean }> = [];
  for (const eventName in events) {
    const event = events[eventName];

    const eventInterfaceName = `${eventName}Event`;
    const eventInterface = await compile(event.event, eventInterfaceName, {
      bannerComment: '',
      additionalProperties: false,
    });

    interfaces += eventInterface + '\n';
    const isStream = event?.options?.stream || false;
    generalEventsData.push({
      name: eventName,
      interfaceName: eventInterfaceName,
      isStream,
    });
  }
  let externalEvents = `export interface Emitter${schema.name}External{ \n`;
  let internalEvents = `export interface Emitter${schema.name}{ \n`;

  generalEventsData.forEach(e => {
    externalEvents += ` ${e.name}: ${e.isStream ? 'EventStreamHandler' : 'EventHandler'}<${e.interfaceName}>;\n`;
    internalEvents += `${e.name}: (params: ${e.interfaceName}) => void;\n`;
  });
  externalEvents += '} \n';
  internalEvents += '} \n';
  interfaces += internalEvents + '\n' + externalEvents + '\n';

  const file = project.createSourceFile(filePath, '', {
    overwrite: true,
  });
  file.addStatements([
    {
      kind: StructureKind.ImportDeclaration,
      isTypeOnly: true,
      namedImports: ['EventHandler', 'EventStreamHandler'],
      moduleSpecifier: `@lad-tech/nsc-toolkit`,
    },
    '\n/**\n' +
      ' * Данный файл сгенерирован автоматически. Для модификации интерфейсов исправьте схему сервиса\n' +
      ' */',
    interfaces,
  ]);
};
