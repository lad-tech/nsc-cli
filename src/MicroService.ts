import fs from 'fs';
import path from 'path';
import { Project } from 'ts-morph';
import {
  generateIndexFile,
  generateInterfacesFile,
  generateMethods,
  generatePackageJson,
  generateServerFile,
  generateStartFile,
} from './files/index.js';
import { GeneratorAbstract, GeneratorSettings } from './GeneratorAbstract.js';
import { BaseTsConfig, DefaultProjectSettings, setStyleInProject } from './helpers/index.js';
import { logger } from './logger/index.js';
import { GenerationError } from './errors/index.js';

import { MiddlewareFn } from './interfaces.js';

export class MicroService extends GeneratorAbstract {
  private middlewares: MiddlewareFn[] = [
    generateInterfacesFile,
    generateMethods,
    generateIndexFile,
    generateServerFile,
    generatePackageJson,
    generateStartFile,
  ];

  public async generate(settings: GeneratorSettings): Promise<void> {
    const { schema, directoryPath, schemaFileName } = settings;

    try {
      logger.info('Starting service generation...');
      const project = new Project(DefaultProjectSettings);
      const tsconfigPath = path.join(directoryPath, 'tsconfig.json');

      if (!fs.existsSync(tsconfigPath)) {
        logger.debug('Creating tsconfig.json');
        project.createSourceFile(tsconfigPath, JSON.stringify(BaseTsConfig, null, 2), {
          overwrite: false,
        });
      }

      for (const fn of this.middlewares) {
        const generatorName = fn.name || 'unknown';
        logger.debug(`Running generator: ${generatorName}`);

        try {
          await fn({ project, schema, directoryPath, schemaFileName });
        } catch (err) {
          throw new GenerationError(`Generator "${generatorName}" failed`, err as Error);
        }
      }

      await project.save();
      logger.info('Files generated, applying code style...');

      await setStyleInProject(project);

      logger.success('Service generation completed successfully!');
    } catch (err) {
      if (err instanceof GenerationError) {
        logger.error(err.message);
        if (err.cause) {
          logger.debug('Cause:', err.cause);
        }
      }
      throw err;
    }
  }
}
