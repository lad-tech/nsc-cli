import { JSONSchema7 } from 'json-schema';
import { Project } from 'ts-morph';
import { ServiceSchema } from '../../interfaces';

export interface CrudSchema {
  entityName: string;
  entityData: JSONSchema7;
  filterColumns: string[]; // Колонки для фильтрации
}

export interface CrudMiddlewareFnOpts {
  crudSchema: CrudSchema;
  serviceSchema: ServiceSchema;
  pathToServiceSchema: string;
  project: Project;
  rootPath: string;
}

export type CrudMiddlewareFn = (opts: CrudMiddlewareFnOpts) => Promise<void>;
