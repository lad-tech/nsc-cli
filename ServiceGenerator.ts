import * as fs from 'fs';
import * as path from 'path';
import { ModuleKind, Project, QuoteKind, ScriptTarget, ts } from 'ts-morph';
import { MiddlewareFn, ServiceSchema } from './interfaces';

export class ServiceGenerator {
  constructor(private middlewares: MiddlewareFn[]) {}

  public async generate(schema: ServiceSchema, directoryPath: string) {
    try {
      const project = new Project({
        manipulationSettings: {
          quoteKind: QuoteKind.Single,
          useTrailingCommas: true,
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
      const tsconfigPath = path.join(directoryPath, 'tsconfig.json');

      if (!fs.existsSync(tsconfigPath)) {
        console.log('Создаем конфигурацию ts');
        const tsconfig = await import(path.resolve(__dirname, 'config.json'));
        project.createSourceFile(tsconfigPath, JSON.stringify(tsconfig, null, 2), {
          overwrite: true,
        });
      } else {
        console.log('tsconfig уже есть, пропускаем');
      }

      for (const fn of this.middlewares) {
        await fn({ project, schema, directoryPath });
      }

      // await project.save();
      const files = project.getSourceFiles();

      for (const file of files) {
        file.formatText({
          indentStyle: ts.IndentStyle.Smart,
          convertTabsToSpaces: true,
          baseIndentSize: 0,
          indentSize: 2,
          tabSize: 2,
        });
      }

      await project.save();
    } catch (err) {
      console.error(err);
    }
  }
}
