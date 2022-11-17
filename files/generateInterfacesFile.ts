import { compile } from 'json-schema-to-typescript';
import path from 'path';
import { Project } from 'ts-morph';
import { FILE_EXTENTION, INTERFACES_FILE_NAME } from '../constants';
import { MiddlewareFn, ServiceSchema } from '../interfaces';

export const generateInterfacesFile: MiddlewareFn = async (
  project: Project,
  schema: ServiceSchema,
  directoryPath: string,
): Promise<void> => {
  let interfaces = '';

  for (const methodName in schema.methods) {
    const method = schema.methods[methodName];
    const returnType = `${methodName}Response`;
    const requestType = `${methodName}Request`;
    const requestInterface = await compile(method.request, requestType);
    const responseInterface = await compile(method.response, returnType);
    interfaces += requestInterface + '\n';
    interfaces += responseInterface + '\n';
  }
  project.createSourceFile(path.join(directoryPath, `${INTERFACES_FILE_NAME}${FILE_EXTENTION}`), interfaces, {
    overwrite: true,
  });
};
