import { Project } from 'ts-morph';
import { JSONSchema } from 'json-schema-to-typescript';

/**
 * Определение типа JSON схемы
 */
export type JsonSchema = JSONSchema;

type JsonSchemaLike = {
  $id: string;
  type: string;
  properties: Record<string, JsonSchema>;
  [key: string]: unknown;
};

/**
 * Определение метода в схеме сервиса
 */
export interface MethodDefinition {
  action: string;
  description: string;
  request: JsonSchema;
  response: JsonSchema;
  options: Partial<{
    cache: number;
    runTimeValidation?: {
      request?: boolean;
      response?: boolean;
    };
    useStream?: {
      request?: boolean;
      response?: boolean;
    };
  }>;
}

export interface ServiceSchema {
  name: string;
  description: string;
  Ref?: JsonSchemaLike;
  methods: Record<string, MethodDefinition>;
  events?: {
    streamOptions: {
      prefix: string;
      actions: {
        action: string;
        storage: string;
        retentionPolicy: string;
        discardPolicy: string;
        messageTTL?: number;
        duplicateTrackingTime: number;
        replication: number;
        rollUps: boolean;
      };
    };
    list: {
      [k: string]: {
        action: string;
        description: string;
        options?: {
          stream: boolean;
        };
        event: {
          [k: string]: unknown;
        };
      };
    };
  };
}

export type MiddlewareOptions = {
  project: Project;
  schema: ServiceSchema;
  directoryPath: string;
  schemaFileName: string;
};

export type MiddlewareFn = (opts: MiddlewareOptions) => Promise<void>;
