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
} from './files';
import { GeneratorAbstract, GeneratorSettings } from './GeneratorAbstract';
import { BaseTsConfig, DefaultProjectSettings, setStyleInProject } from './helpers';

import { MiddlewareFn } from './interfaces';

export class MicroService extends GeneratorAbstract {
  private middlewares: MiddlewareFn[] = [
    generateInterfacesFile,
    generateMethods,
    generateIndexFile,
    generateServerFile,
    generatePackageJson,
    generateStartFile,
  ];

  public async generate(settings: GeneratorSettings) {
    try {
      const { schema, directoryPath, schemaFileName } = settings;
      const project = new Project(DefaultProjectSettings);
      const tsconfigPath = path.join(directoryPath, 'tsconfig.json');
      //  ts-config
      if (!fs.existsSync(tsconfigPath)) {
        project.createSourceFile(tsconfigPath, JSON.stringify(BaseTsConfig, null, 2), {
          overwrite: false,
        });
      }
      for (const fn of this.middlewares) {
        await fn({ project, schema, directoryPath, schemaFileName });
      }
      await project.save();
      console.log('Generation completed successfully, format style');

      await setStyleInProject(project);

      console.log('Done');
    } catch (err) {
      console.error('Error', err);
      process.exit(1);
    }
  }
}
