import { compile } from 'json-schema-to-typescript';
import * as path from 'path';
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
      additionalProperties: false,
    });
    const responseInterface = await compile(method.response, returnType, {
      additionalProperties: false,
    });
    interfaces += requestInterface + '\n';
    interfaces += responseInterface + '\n';
  }
  project.createSourceFile(filePath, interfaces, {
    overwrite: true,
  });
};
