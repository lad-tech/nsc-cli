export const baseSchemas = {
  ErrorResponse: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 8,
        maxLength: 255,
      },
      message: {
        type: 'string',
        minLength: 8,
        maxLength: 255,
      },
      statusCode: {
        type: 'number',
        description: 'HTTP код ошибки',
        minimum: 100,
        maximum: 511,
      },
    },
    required: ['message'],
  },
  BaseEntityFields: {
    type: 'object',
    properties: {
      created: {
        type: 'string',
        format: 'date-time',
        description: 'Дата создания',
      },
      updated: {
        type: 'string',
        format: 'date-time',
        description: 'Дата обновления',
      },
      id: {
        type: 'string',
        format: 'uuid',
      },
    },
    required: ['updated', 'created', 'id'],
  },
  PaginationMeta: {
    type: 'object',
    properties: {
      page: {
        type: 'integer',
        minimum: 1,
        description: 'Номер страницы',
      },
      size: {
        type: 'integer',
        minimum: 1,
        description: 'Размер страницы',
      },
      total: {
        type: 'integer',
        description: 'Количество сущностей',
      },
    },
    required: ['page', 'size', 'total'],
  },
} as const;
