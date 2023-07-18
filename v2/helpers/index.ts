import * as fs from 'fs/promises';
import { format, Options } from 'prettier';
import { ModuleKind, Project, ProjectOptions, QuoteKind, ScriptTarget } from 'ts-morph';

export const DefaultProjectSettings: ProjectOptions = {
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
};

export const BaseTsConfig = {
  compilerOptions: {
    declaration: true,
    sourceMap: true,
    strictNullChecks: true,
    strict: true,
    module: 'commonjs',
    target: 'es2019',
    allowJs: false,
    resolveJsonModule: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    lib: ['es2019'],
    typeRoots: ['../node_modules/@types', '../@types/'],
  },
  exclude: ['node_modules'],
} as const;

export async function setStyleInProject(project: Project, prettierConfigPath?: string) {
  let prettierConf: Options = {
    singleQuote: true,
    trailingComma: 'all',
    arrowParens: 'avoid',
    bracketSpacing: true,
    useTabs: false,
    printWidth: 120,
  };
  try {
    const prettierConfigFilePath = prettierConfigPath || '.prettierrc.json';
    await fs.access(prettierConfigFilePath);
    const confFile = await fs.readFile(prettierConfigFilePath);
    prettierConf = JSON.parse(confFile.toString());
  } catch (e) {
    console.log('Use default style guide');
  }

  for (const file of project.getSourceFiles()) {
    if (file.getFilePath().endsWith('.ts')) {
      await fs.writeFile(file.getFilePath(), format(file.getFullText(), prettierConf));
    }
  }
}
