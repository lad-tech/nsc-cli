import fs from 'fs';
import path from 'path';
import { SourceFile, StructureKind, VariableDeclarationKind } from 'ts-morph';
import { CrudMiddlewareFn } from '../../crud/interfaces';

/**
 * Функция для генерации файлов маршрутов API в папку routes
 */
export const generateRoutes: CrudMiddlewareFn = async opts => {
  const { crudSchema, project, rootPath, serviceSchema } = opts;
  const entityName = crudSchema.entityName;
  const baseUrl = `/v1/${entityName.toLowerCase()}s`; // Пример: /v1/notifications

  const routesDirectoryPath = path.resolve(rootPath, 'routes');

  // Создание директории routes, если она не существует
  if (!fs.existsSync(routesDirectoryPath)) {
    fs.mkdirSync(routesDirectoryPath, { recursive: true });
  }

  // Имя файла маршрутов, например, NotificationRoutes.ts
  const routesFileName = `${entityName}Routes.ts`;
  const routesFilePath = path.resolve(routesDirectoryPath, routesFileName);

  // Создание файла маршрутов
  const routesFile: SourceFile = project.createSourceFile(routesFilePath, '', { overwrite: true });

  // Добавление импортов
  routesFile.addImportDeclarations([
    {
      moduleSpecifier: 'fastify',
      namedImports: ['FastifyPluginCallback'],
    },

    {
      moduleSpecifier: '../interfaces',
      namedImports: [
        'CreateNotificationRequest',
        'CreateNotificationResponse',
        'GetNotificationByIdRequest',
        'GetNotificationByIdResponse',
        'ListNotificationsRequest',
        'ListNotificationsResponse',
        'UpdateNotificationRequest',
        'UpdateNotificationResponse',
        'DeleteNotificationByIdRequest',
        'DeleteNotificationByIdResponse',
      ],
    },
    {
      moduleSpecifier: '../service.schema.json',
      namedImports: ['methods'],
    },

    {
      moduleSpecifier: 'general',
      namedImports: ['BusinessLogicError', 'NSCError'],
    },
    {
      moduleSpecifier: '../service',
      defaultImport: entityName,
    },
  ]);

  // Добавление импорта Reflect Metadata
  routesFile.addImportDeclaration({
    moduleSpecifier: 'reflect-metadata',
  });

  // Создание класса маршрутов
  const className = `${entityName}Routes`;
  const pluginName = `${entityName.toLowerCase()}Routes`;

  // Добавление экспорта маршрутов
  routesFile.addVariableStatement({
    kind: StructureKind.VariableStatement,
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: pluginName,
        initializer: `function(fastify, _options, done) { 
  ${generateRouteHandlers(serviceSchema, entityName, baseUrl)}
  done();
}`,
        type: 'FastifyPluginCallback',
      },
    ],
  });

  // Сохранение файла маршрутов
  routesFile.saveSync();
  console.log(`Файл маршрутов ${routesFileName} сгенерирован:`, routesFile.getFilePath());
};

/**
 * Вспомогательная функция для генерации обработчиков маршрутов
 */
function generateRouteHandlers(serviceSchema: any, entityName: string, baseUrl: string): string {
  const methods = serviceSchema.methods;
  const handlers: string[] = [];

  // Создание маршрута для получения списка сущностей (GET /v1/entities)
  const listMethod = `List${entityName}s`;
  if (methods[listMethod]) {
    handlers.push(`
  fastify.get<{
    Querystring: List${entityName}sRequest;
  }>(
    '${baseUrl}',
    {
      schema: {
        description: methods.${listMethod}.description,
        tags: ['${serviceSchema.name}'],
        querystring: methods.${listMethod}.request,
        response: {
          200: methods.${listMethod}.response,
        },
      },
    },
    async (request, reply) => {
      const response = await request.service.buildService(${entityName}, request.baggage).${listMethod}({
        ...request.query.filters,
        pagination: request.query.pagination,
      });

      if (BusinessLogicError.isErrorResponse(response)) {
        throw new NSCError(response.error);
      }

      return response;
    },
  );
    `);
  }

  // Создание маршрута для создания сущности (POST /v1/entities)
  const createMethod = `Create${entityName}`;
  if (methods[createMethod]) {
    handlers.push(`
  fastify.post<{
    Body: Create${entityName}Request;
  }>(
    '${baseUrl}',
    {
      // config: {
      //   authentication: true,
      //   permission: [Role.ADMIN],
      // },
      schema: {
        description: methods.${createMethod}.description,
        tags: ['${serviceSchema.name}'],
        body: methods.${createMethod}.request,
        response: {
          201: methods.${createMethod}.response,
        },
      },
    },
    async (request, reply) => {
      const response = await request.service.buildService(${entityName}, request.baggage).${createMethod}(request.body);

      if (BusinessLogicError.isErrorResponse(response)) {
        throw new NSCError(response.error);
      }

      reply.code(HttpStatusCode.Created).send(response);
    },
  );
    `);
  }

  // Создание маршрута для получения конкретной сущности (GET /v1/entities/:id)
  const getMethod = `Get${entityName}ById`;
  if (methods[getMethod]) {
    handlers.push(`
  fastify.get<{
    Params: Get${entityName}ByIdRequest;
  }>(
    '${baseUrl}/:id',
    {
      schema: {
        description: methods.${getMethod}.description,
        tags: ['${serviceSchema.name}'],
        params: methods.${getMethod}.request,
        response: {
          200: methods.${getMethod}.response,
        },
      },
    },
    async (request, reply) => {
      const response = await request.service.buildService(${entityName}, request.baggage).${getMethod}(request.params);

      if (BusinessLogicError.isErrorResponse(response)) {
        throw new NSCError(response.error);
      }

      return response;
    },
  );
    `);
  }

  // Создание маршрута для обновления сущности (PATCH /v1/entities/:id)
  const updateMethod = `Update${entityName}`;
  if (methods[updateMethod]) {
    handlers.push(`
  fastify.patch<{
    Params: Get${entityName}ByIdRequest;
    Body: Update${entityName}Request;
  }>(
    '${baseUrl}/:id',
    {
      // config: {
      //   authentication: true,
      //   permission: [Role.ADMIN],
      // },
      schema: {
        description: methods.${updateMethod}.description,
        tags: ['${serviceSchema.name}'],
        params: methods.Get${entityName}ById.request,
        body: methods.${updateMethod}.request,
        response: {
          200: methods.${updateMethod}.response,
        },
      },
    },
    async (request, reply) => {
      const response = await request.service.buildService(${entityName}, request.baggage).${updateMethod}({
        ...request.params,
        ...request.body,
      });

      if (BusinessLogicError.isErrorResponse(response)) {
        throw new NSCError(response.error);
      }

      return response;
    },
  );
    `);
  }

  // Создание маршрута для удаления сущности (DELETE /v1/entities/:id)
  const deleteMethod = `Delete${entityName}ById`;
  if (methods[deleteMethod]) {
    handlers.push(`
  fastify.delete<{
    Params: Delete${entityName}ByIdRequest;
  }>(
    '${baseUrl}/:id',
    {
      // config: {
      //   authentication: true,
      //   permission: [Role.ADMIN],
      // },
      schema: {
        description: methods.${deleteMethod}.description,
        tags: ['${serviceSchema.name}'],
        params: methods.${deleteMethod}.request,
        response: {
          200: methods.${deleteMethod}.response,
        },
      },
    },
    async (request, reply) => {
      const response = await request.service.buildService(${entityName}, request.baggage).${deleteMethod}(request.params);

      if (BusinessLogicError.isErrorResponse(response)) {
        throw new NSCError(response.error);
      }

      return response;
    },
  );
    `);
  }

  // Возврат всех обработчиков
  return handlers.join('\n');
}
