#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { generateIndexFile } from './files/generateIndexFile';
import { generateInterfacesFile } from './files/generateInterfacesFile';
import { generateMethods } from './files/generateMethods';
import { generateServerFile } from './files/generateServerFile';
import { ServiceSchema } from './interfaces';
import { ServiceGenerator } from './ServiceGenerator';

async function main() {
  try {
    const program = new Command();
    program.description('Генерация нового сервиса по json schema').requiredOption('--schema  <path>', 'путь до схемы');

    program.parse();

    const options = program.opts();
    const pathToSchema = path.resolve(options.schema);

    if (!fs.existsSync(pathToSchema)) {
      throw new Error(`${pathToSchema} не найден`);
    }
    const directoryPath = path.dirname(pathToSchema);

    console.log('Начинаем генерацию ', directoryPath);
    const schema: ServiceSchema = (await import(pathToSchema)).default;

    const generator = new ServiceGenerator([
      generateInterfacesFile,
      generateMethods,
      generateIndexFile,
      generateServerFile,
    ]);
    await generator.generate(schema, directoryPath);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main().catch(console.error);
