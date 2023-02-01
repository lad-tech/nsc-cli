#!/usr/bin/env node

import Ajv from 'ajv';
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { generateIndexFile } from './files/generateIndexFile';
import { generateInterfacesFile } from './files/generateInterfacesFile';
import { generateMethods } from './files/generateMethods';
import { generatePackageJson } from './files/generatePackageJson';
import { generateServerFile } from './files/generateServerFile';
import { ServiceSchema } from './interfaces';
import * as ValidateSchema from './schemaValidator.json';
import { ServiceGenerator } from './ServiceGenerator';

async function main() {
  try {
    // Ajv.name
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
    const validate = new Ajv().compile(ValidateSchema);
    const valid = validate(schema);
    if (!valid) {
      console.log(validate.errors);
      throw new Error('validate error');
    }
    const service = new ServiceGenerator([
      generateInterfacesFile,
      generateMethods,
      generateIndexFile,
      generateServerFile,
      generatePackageJson,
    ]);
    await service.generate(schema, directoryPath);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main().catch(console.error);

// TODO
// 4) Парсить gracefullshutdown и при перегенерации подставлять назад
