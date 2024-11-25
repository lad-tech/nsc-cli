import fs from 'fs';
import { ServiceSchema } from '../../interfaces';
import { baseSchemas } from '../../v2/crud/baseSchemas';
import { CrudMiddlewareFn } from '../../v2/crud/interfaces';

const createFilterObject = (fields: string[], refBasePath: string) =>
  fields.reduce(
    (obj, field) => {
      obj[field] = {
        $ref: `${refBasePath}/properties/${field}`,
      };
      return obj;
    },
    {} as Record<string, any>,
  );
export const generateSchemaFile: CrudMiddlewareFn = async opts => {
  const { serviceSchema, crudSchema, pathToServiceSchema } = opts;

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
  const RefErrorPath = `${RefName}#/properties/ErrorResponse`;
  const RefBaseEntityFieldsPath = `${RefName}#/properties/BaseEntityFields`;
  const RefPaginationMetaPath = `${RefName}#/properties/PaginationMeta`;
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
      oneOf: [
        {
          type: 'object',
          properties: {
            data: {
              allOf: [
                {
                  $ref: RefEntityPath,
                },
                {
                  $ref: RefBaseEntityFieldsPath,
                },
              ],
            },
          },
          required: ['data'],
        },
        {
          type: 'object',
          properties: {
            error: {
              $ref: RefErrorPath,
            },
          },
          required: ['error'],
        },
      ],
    },
  };

  // findOneById
  const findOneMethodName = `Get${crudSchema.entityName}ById`;
  serviceSchema.methods[findOneMethodName] = {
    options: {},
    action: findOneMethodName,
    description: `Получение ${crudSchema.entityName}`,
    request: {
      type: 'object',
      properties: {
        id: {
          $ref: `${RefBaseEntityFieldsPath}/properties/id`,
        },
      },
      required: ['id'],
    },
    response: {
      oneOf: [
        {
          type: 'object',
          properties: {
            data: {
              $ref: RefEntityPath,
            },
          },
          required: ['data'],
        },
        {
          type: 'object',
          properties: {
            error: {
              $ref: RefErrorPath,
            },
          },
          required: ['error'],
        },
      ],
    },
  };

  // findMany
  const findManyMethodName = `Get${crudSchema.entityName}s`;
  serviceSchema.methods[findManyMethodName] = {
    options: {},
    action: findManyMethodName,
    description: `Получение ${crudSchema.entityName} с пагинацией`,
    request: {
      type: 'object',
      properties: {
        page: {
          type: 'integer',
          minimum: 1,
          description: 'Номер страницы',
          default: 1,
        },
        size: {
          type: 'integer',
          minimum: 1,
          description: 'Количество сущностей',
          default: 12,
        },
        filter: {
          type: 'object',
          properties: {
            ...(crudSchema.filterColumns?.length ? createFilterObject(crudSchema.filterColumns, RefEntityPath) : {}),
          },
        },
      },
    },
    response: {
      oneOf: [
        {
          type: 'object',
          properties: {
            meta: {
              $ref: RefPaginationMetaPath,
            },
            data: {
              allOf: [
                {
                  $ref: RefEntityPath,
                },
                {
                  $ref: RefBaseEntityFieldsPath,
                },
              ],
            },
          },
          required: ['data', 'meta'],
        },
        {
          type: 'object',
          properties: {
            error: {
              $ref: RefErrorPath,
            },
          },
          required: ['error'],
        },
      ],
    },
  };

  // UpdateById
  const updateByIdMethodName = `Update${crudSchema.entityName}`;
  serviceSchema.methods[updateByIdMethodName] = {
    options: {},
    action: updateByIdMethodName,
    description: `Обновление данных ${crudSchema.entityName}`,
    request: {
      type: 'object',
      properties: {
        id: {
          $ref: `${RefBaseEntityFieldsPath}/properties/id`,
        },
        changes: {
          type: 'object',
          additionalProperties: false,
          properties: {
            $ref: `${RefEntityPath}/properties`,
          },
        },
      },
      required: ['id', 'changes'],
    },
    response: {
      oneOf: [
        {
          type: 'object',
          properties: {
            data: {
              $ref: RefEntityPath,
            },
          },
          required: ['data', 'meta'],
        },
        {
          type: 'object',
          properties: {
            error: {
              $ref: RefErrorPath,
            },
          },
          required: ['error'],
        },
      ],
    },
  };

  // DeleteById
  const DeleteByIdMethodName = `Delete${crudSchema.entityName}ById`;
  serviceSchema.methods[DeleteByIdMethodName] = {
    options: {},
    action: DeleteByIdMethodName,
    description: `Удалить ${crudSchema.entityName} по идентификатору`,
    request: {
      type: 'object',
      properties: {
        id: {
          $ref: `${RefBaseEntityFieldsPath}/properties/id`,
        },
      },
      required: ['id'],
    },
    response: {
      oneOf: [
        {
          type: 'object',
          properties: {
            data: {
              $ref: RefEntityPath,
            },
          },
          required: ['data'],
        },
        {
          type: 'object',
          properties: {
            error: {
              $ref: RefErrorPath,
            },
          },
          required: ['error'],
        },
      ],
    },
  };

  fs.writeFileSync(pathToServiceSchema, JSON.stringify(serviceSchema, null, 2));
};
