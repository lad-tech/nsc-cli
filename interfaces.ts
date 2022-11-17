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
        runTimeValidation: {
          request: boolean;
        };
      }>;
    }
  >;
}

export type MiddlewareFn = (project: Project, schema: ServiceSchema, directoryPath: string) => Promise<void>;
