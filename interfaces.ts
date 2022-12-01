import { Project } from 'ts-morph';

export interface ServiceSchema {
  name: string;
  description: string;
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
}

export type MiddlewareOptions = {
  project: Project;
  schema: ServiceSchema;
  directoryPath: string;
};

export type MiddlewareFn = (opts: MiddlewareOptions) => Promise<void>;
