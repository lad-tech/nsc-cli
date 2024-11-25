#!/usr/bin/env node

import Ajv from 'ajv';
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { Project } from 'ts-morph';
import * as ValidateSchema from '../../crudSchemaValidator.json';
import { generateAggregateFile } from '../../files/crud/generateAggregateFile';
import { generateCrudMethods } from '../../files/crud/generateCrudMethods';
import { generateDiFiles } from '../../files/crud/generateDiFile';
import { generateGeneralFiles } from '../../files/crud/generateGeneralFiles';
import { generateRepositoryFile } from '../../files/crud/generateRepositoryFile';
import { generateSchemaFile } from '../../files/crud/generateSchemaFile';
import { generateIndexFile } from '../../files/generateIndexFile';
import { generateInterfacesFile } from '../../files/generateInterfacesFile';
import { generateServerFile } from '../../files/generateServerFile';
import { generateStartFile } from '../../files/generateStartFile';
import { MiddlewareOptions, ServiceSchema } from '../../interfaces';
import { CrudMiddlewareFnOpts, CrudSchema } from '../crud/interfaces';
import { BaseTsConfig, DefaultProjectSettings, setStyleInProject } from '../helpers';

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

    console.log('Start generation in ', directoryPath);
    const crudSchema: CrudSchema = (await import(pathToSchema)).default;
    const serviceSchema: ServiceSchema = (await import(pathToServiceSchema)).default;

    const validate = new Ajv().compile(ValidateSchema);
    const valid = validate(crudSchema);
    if (!valid) {
      console.log(validate.errors);
      throw new Error('validate error');
    }
    const project = new Project(DefaultProjectSettings);
    const [firstSymbol, ...otherSymbols] = crudSchema.entityName;
    crudSchema.entityName = `${firstSymbol.toUpperCase()}${otherSymbols.join('').toLowerCase()}`;
    const tsconfigPath = path.join(directoryPath, 'tsconfig.json');
    //  ts-config
    if (!fs.existsSync(tsconfigPath)) {
      project.createSourceFile(tsconfigPath, JSON.stringify(BaseTsConfig, null, 2), {
        overwrite: false,
      });
    }
    const opts: CrudMiddlewareFnOpts = {
      project,
      crudSchema,
      serviceSchema,
      pathToServiceSchema,
      rootPath: directoryPath,
    };
    const baseOpts: MiddlewareOptions = {
      project,
      schema: serviceSchema,
      directoryPath,
      schemaFileName: `${path.basename(pathToServiceSchema)}`,
    };
    //  Модифицируем схему сервиса
    await generateSchemaFile(opts);
    //  Тут проверка наличия наших стандартных штук
    await generateGeneralFiles(opts);
    await generateAggregateFile(opts);
    await generateRepositoryFile(opts);
    await generateInterfacesFile(baseOpts);
    await generateDiFiles(opts);
    await generateCrudMethods(opts);
    await generateCrudMethods(opts);
    await generateIndexFile(baseOpts);
    await generateServerFile(baseOpts);
    await generateStartFile(baseOpts);
    await setStyleInProject(project);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main().catch(console.error);