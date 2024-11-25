#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { Project } from 'ts-morph';
import { generateAggregateFile } from '../../files/crud/generateAggregateFile';
import { generateGeneralFiles } from '../../files/crud/generateGeneralFiles';
import { generateRepositoryFile } from '../../files/crud/generateRepositoryFile';
import { generateSchemaFile } from '../../files/crud/generateSchemaFile';
import { ServiceSchema } from '../../interfaces';
import { CrudMiddlewareFnOpts, CrudSchema } from '../crud/interfaces';
import { DefaultProjectSettings, setStyleInProject } from '../helpers';

async function main() {
  try {
    const program = new Command();
    program.description('Генерация нового crud для сервиса').requiredOption('--schema  <path>', 'Путь до схемы');
    program.parse();

    const options = program.opts();
    const pathToSchema = path.resolve(options.schema);

    if (!fs.existsSync(pathToSchema)) {
      throw new Error(`${pathToSchema} not found`);
    }

    const directoryPath = path.dirname(pathToSchema);
    const schemaFileName = `${path.basename(pathToSchema)}`;
    const pathToServiceSchema = path.resolve(directoryPath, 'service.schema.json');
    if (!fs.existsSync(pathToServiceSchema)) {
      throw new Error(`${pathToServiceSchema} not found`);
    }

    console.log('Start generation in ', directoryPath);
    const crudSchema: CrudSchema = (await import(pathToSchema)).default;
    const serviceSchema: ServiceSchema = (await import(pathToServiceSchema)).default;
    const project = new Project(DefaultProjectSettings);
    const [firstSymbol, ...otherSymbols] = crudSchema.entityName;
    crudSchema.entityName = `${firstSymbol.toUpperCase()}${otherSymbols.join('').toLowerCase()}`;
    const opts: CrudMiddlewareFnOpts = {
      project,
      crudSchema,
      serviceSchema,
      pathToServiceSchema,
      rootPath: directoryPath,
    };
    //  Модифицируем схему сервиса
    await generateSchemaFile(opts);
    //  Тут проверка наличия наших стандартных штук
    await generateGeneralFiles(opts);
    await generateAggregateFile(opts);
    await generateRepositoryFile(opts);
    await setStyleInProject(project);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main().catch(console.error);
