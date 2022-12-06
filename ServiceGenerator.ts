import * as fs from 'fs';
import * as path from 'path';
import { ModuleKind, Project, QuoteKind, ScriptTarget } from 'ts-morph';
import { MiddlewareFn, ServiceSchema } from './interfaces';

export class ServiceGenerator {
  constructor(private middlewares: MiddlewareFn[]) {}

  public async generate(schema: ServiceSchema, directoryPath: string) {
    try {
      const project = new Project({
        manipulationSettings: {
          quoteKind: QuoteKind.Single,
        },
        compilerOptions: {
          target: ScriptTarget.ES2021,
          declaration: true,
          sourceMap: true,
          strictNullChecks: true,
          strict: true,
          module: ModuleKind.CommonJS,
          allowJs: false,
          resolveJsonModule: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          lib: ['es2019'],
        },
      });
      const tsconfig = await import(path.resolve(__dirname, 'config.json'));

      if (!fs.existsSync(tsconfig)) {
        console.log('Создаем конфигурацию ts');
        project.createSourceFile(path.join(directoryPath, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2), {
          overwrite: true,
        });
      } else {
        console.log('tsconfig уже есть, пропускаем');
      }

      for (const fn of this.middlewares) {
        await fn({ project, schema, directoryPath });
      }
      await project.save();
    } catch (err) {
      console.error(err);
    }
  }
}
