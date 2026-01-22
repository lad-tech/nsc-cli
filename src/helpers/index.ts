import * as fs from 'fs/promises';
import { format, Options } from 'prettier';
import { ModuleKind, ModuleResolutionKind, Project, ProjectOptions, QuoteKind, ScriptTarget } from 'ts-morph';

export const DefaultProjectSettings: ProjectOptions = {
  manipulationSettings: {
    quoteKind: QuoteKind.Single,
    useTrailingCommas: true,
  },
  compilerOptions: {
    target: ScriptTarget.ES2022,
    declaration: true,
    sourceMap: true,
    strictNullChecks: true,
    strict: true,
    module: ModuleKind.ESNext,
    moduleResolution: ModuleResolutionKind.Bundler,
    allowJs: false,
    resolveJsonModule: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    lib: ['ES2022'],
  },
};

export const BaseTsConfig = {
  compilerOptions: {
    declaration: true,
    sourceMap: true,
    strictNullChecks: true,
    strict: true,
    module: 'ESNext',
    moduleResolution: 'bundler',
    target: 'ES2022',
    allowJs: false,
    resolveJsonModule: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    lib: ['ES2022'],
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
    parser: 'babel-ts',
  };
  try {
    const prettierConfigFilePath = prettierConfigPath || '.prettierrc.json';
    await fs.access(prettierConfigFilePath);
    const confFile = await fs.readFile(prettierConfigFilePath);
    prettierConf = JSON.parse(confFile.toString());
  } catch {
    console.log('Use default style guide');
  }
  prettierConf['parser'] = 'babel-ts';
  for (const file of project.getSourceFiles()) {
    if (file.getFilePath().endsWith('.ts')) {
      await fs.writeFile(file.getFilePath(), await format(file.getFullText(), prettierConf));
    }
  }
}
