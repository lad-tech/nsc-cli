#!/usr/bin/env node

import Ajv from 'ajv';
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { Project } from 'ts-morph';
import { CrudMiddlewareFnOpts, CrudSchema } from '../crud/interfaces';
import * as ValidateSchema from '../crudSchemaValidator.json';
import {
  generateAggregateFile,
  generateCrudMethods,
  generateDiFiles,
  generateGeneralFiles,
  generateIndexFile,
  generateInterfacesFile,
  generateRepositoryFile,
  generateSchemaFile,
  generateServerFile,
  generateStartFile,
} from '../files';
import { generateRoutes } from '../files/crud/generateRoutesFile';
import { BaseTsConfig, DefaultProjectSettings, setStyleInProject } from '../helpers';
import { MiddlewareOptions, ServiceSchema } from '../interfaces';

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
    const pathToServiceSchema = path.resolve(directoryPath, 'service.schema.json');

    console.log('Start generation in ', directoryPath);
    const crudSchema: CrudSchema = (await import(pathToSchema)).default;
    if (!fs.existsSync(pathToServiceSchema)) {
      const folderName = path.basename(path.dirname(pathToSchema));
      const capitalizedFolderName = folderName.charAt(0).toUpperCase() + folderName.slice(1);

      fs.writeFileSync(
        pathToServiceSchema,
        JSON.stringify(
          {
            "name": `${capitalizedFolderName}`,
            "description": "Generated service",
            methods: {

            },
          },
          null,
          2,
        ),
      );
    }
    const serviceSchema: ServiceSchema = (await import(pathToServiceSchema)).default || {};

    const validate = new Ajv().compile(ValidateSchema);
    const valid = validate(crudSchema);
    if (!valid) {
      console.log(validate.errors);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      throw new Error('validate error', validate.errors?.toString());
    }
    const project = new Project(DefaultProjectSettings);
    const [firstSymbol, ...otherSymbols] = crudSchema.entityName;
    crudSchema.entityName = `${firstSymbol.toUpperCase()}${otherSymbols.join('').toLowerCase()}`;
    const tsconfigPath = path.join(directoryPath, 'tsconfig.json');
    // ts-config
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
    await generateDiFiles(opts);
    await generateCrudMethods(opts);
    await generateCrudMethods(opts);
    await generateRoutes(opts);

    // из старых файлов
    await generateInterfacesFile(baseOpts);
    await generateIndexFile(baseOpts);
    await generateServerFile(baseOpts);
    await generateStartFile(baseOpts);
    // стилизация
    await setStyleInProject(project);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main().catch(console.error);
