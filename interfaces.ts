import { Project } from 'ts-morph';

type JsonSchemaLike = {
  $id: string;
  [key: string]: unknown;
};
export interface ServiceSchema {
  name: string;
  description: string;
  Ref?: JsonSchemaLike;
  methods: Record<
    string,
    {
      action: string;
      description: string;
      request: object;
      response: object;
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
  >;
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
