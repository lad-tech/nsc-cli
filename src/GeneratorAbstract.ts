import { ServiceSchema } from './interfaces';

export interface GeneratorSettings {
  schema: ServiceSchema;
  directoryPath: string;
  prettierConfigPath?: string;
  schemaFileName: string;
}

export abstract class GeneratorAbstract {
  public abstract generate(settings: GeneratorSettings): void;
}
