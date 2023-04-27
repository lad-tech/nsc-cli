import fs from 'fs';
import path from 'path';
import { Project } from 'ts-morph';
import { generateIndexFile } from '../files/generateIndexFile';
import { generateInterfacesFile } from '../files/generateInterfacesFile';
import { generateMethods } from '../files/generateMethods';
import { generatePackageJson } from '../files/generatePackageJson';
import { generateServerFile } from '../files/generateServerFile';
import { MiddlewareFn } from '../interfaces';
import { GeneratorAbstract, GeneratorSettings } from './GeneratorAbstract';
import { BaseTsConfig, DefaultProjectSettings, setStyleInProject } from './helpers';

export class MicroService extends GeneratorAbstract {
  private middlewares: MiddlewareFn[] = [
    generateInterfacesFile,
    generateMethods,
    generateIndexFile,
    generateServerFile,
    generatePackageJson,
  ];

  public async generate(settings: GeneratorSettings) {
    try {
      const { schema, directoryPath } = settings;
      const project = new Project(DefaultProjectSettings);
      const tsconfigPath = path.join(directoryPath, 'tsconfig.json');
      //  ts-config
      if (!fs.existsSync(tsconfigPath)) {
        project.createSourceFile(tsconfigPath, JSON.stringify(BaseTsConfig, null, 2), {
          overwrite: false,
        });
      }
      for (const fn of this.middlewares) {
        await fn({ project, schema, directoryPath });
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
