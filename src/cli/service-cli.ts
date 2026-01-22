#!/usr/bin/env node

import Ajv from 'ajv';
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ServiceSchema } from '../interfaces.js';
import { MicroService } from '../MicroService.js';
import ValidateSchema from '../serviceSchemaValidator.json' with { type: 'json' };

async function main() {
  try {
    const program = new Command();
    program
      .description('Генерация нового сервиса по json schema')
      .requiredOption('--schema  <path>', 'Путь до схемы')
      .createOption('--prettierConfig <string>', 'Путь до конфига prettier');
    program.parse();

    const options = program.opts();
    const prettierConfigPath = options.prettierConfig;
    const pathToSchema = path.resolve(options.schema);

    if (!fs.existsSync(pathToSchema)) {
      throw new Error(`${pathToSchema} not found`);
    }

    const directoryPath = path.dirname(pathToSchema);
    const schemaFileName = `${path.basename(pathToSchema)}`;

    console.log('Start generation in ', directoryPath);

    const schema: ServiceSchema = (await import(pathToSchema)).default;
    const validate = new Ajv().compile(ValidateSchema);
    const valid = validate(schema);
    if (!valid) {
      console.log(validate.errors);
      throw new Error('validate error');
    }

    await new MicroService().generate({
      schema,
      directoryPath,
      prettierConfigPath,
      schemaFileName,
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main().catch(console.error);
