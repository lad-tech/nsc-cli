#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ServiceSchema } from '../../interfaces';
import { baseSchemas } from '../crud/baseSchemas';
import { CrudSchema } from '../crud/interfaces';

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
    const RefName = `${serviceSchema.name}Additional.json`;
    if (!serviceSchema?.Ref) {
      serviceSchema.Ref = {
        $id: RefName,
        type: 'object',
        properties: {},
      };
    }
    // Добавляем схему в REF
    (serviceSchema as Required<ServiceSchema>).Ref.properties[crudSchema.entityName] = crudSchema.entityData;
    //  Добавляем в REF пагинацию и ошибки
    let schemaName: keyof typeof baseSchemas;
    for (schemaName in baseSchemas) {
      (serviceSchema as Required<ServiceSchema>).Ref.properties[schemaName] = baseSchemas[schemaName];
    }
    const RefEntityPath = `${RefName}#/properties/${crudSchema.entityName}`;
    // create
    const createMethodName = `${crudSchema.entityName}Create`;
    serviceSchema.methods[createMethodName] = {
      options: {},
      action: createMethodName,
      description: `Создание ${crudSchema.entityName}`,
      request: {
        $ref: `${RefEntityPath}`,
      },
      response: {
        allOf: [{ $ref: `${RefEntityPath}` }, { $ref: `${RefName}#/properties/BaseEntityFields` }],
      },
    };

    // findOne
    const findOneMethodName = `Get${crudSchema.entityName}ById`;
    serviceSchema.methods[findOneMethodName] = {
      options: {},
      action: findOneMethodName,
      description: `Получение ${crudSchema.entityName}`,
      request: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Идентификатор',
            minLength: 1,
            maxLength: 255,
          },
        },
        required: ['id'],
      },
      response: {
        type: 'object',
        properties: {
          data: {
            allOf: [{ $ref: `${RefEntityPath}` }, { $ref: `${RefName}#/properties/BaseEntityFields` }],
          },
          errors: {
            $ref: `${RefName}#/properties/ErrorResponse`,
          },
        },
      },
    };

    fs.writeFileSync(pathToServiceSchema, JSON.stringify(serviceSchema, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main().catch(console.error);
