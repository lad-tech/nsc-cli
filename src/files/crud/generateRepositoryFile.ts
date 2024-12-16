import fs from 'fs';
import path from 'path';
import { Scope } from 'ts-morph';
import { CrudMiddlewareFn } from '../../crud/interfaces';

export const generateRepositoryFile: CrudMiddlewareFn = async opts => {
  const { crudSchema, project, rootPath } = opts;
  const schema = crudSchema.entityData;
  const className = crudSchema.entityName;
  const filterColumns = crudSchema.filterColumns;

  // Определяем путь к директории general и файлу pagination.ts
  const generalDirectoryPath = path.resolve(rootPath, '..', 'general');
  const paginationFilePath = path.join(generalDirectoryPath, 'pagination.ts');

  // Проверяем наличие директории general
  if (!fs.existsSync(generalDirectoryPath)) {
    fs.mkdirSync(generalDirectoryPath, { recursive: true });
    console.log(`Директория general создана по пути ${generalDirectoryPath}`);
  }

  // Проверяем наличие файла pagination.ts
  if (!fs.existsSync(paginationFilePath)) {
    fs.writeFileSync(
      paginationFilePath,
      `export function preparePagination(params: { page?: number; size?: number; total: number }) {
  const { page = 1, size = 12, total } = params;
  if (total < 1) {
    return {
      from: 0,
      meta: { total, size, page },
    };
  }
  // Рассчитываем общее количество записей до конца текущей страницы
  const calculatedTotal = size * page;

  // Проверяем, если запрашиваемая страница выходит за пределы допустимых значений
  if (calculatedTotal > total) {
    // Пересчитываем номер страницы с округлением вверх
    const recalculatedPageNumber = Math.ceil(total / size);

    return {
      from: (recalculatedPageNumber - 1) * size,
      meta: { total, size, page: recalculatedPageNumber },
    };
  }

  // Возвращаем начальный индекс выборки и метаданные для валидной запрашиваемой страницы
  return {
    from: (page - 1) * size,
    meta: { total, size, page },
  };
}

`,
    );
    console.log(`Файл pagination.ts создан по пути ${paginationFilePath}`);
  }

  const repositoryName = `${className}Repository`;
  const aggregateDirectoryPath = path.resolve(rootPath, 'repositories');

  if (!fs.existsSync(aggregateDirectoryPath)) {
    fs.mkdirSync(aggregateDirectoryPath, { recursive: true });
  }

  if (schema.properties) {
    const classFile = project.createSourceFile(path.resolve(aggregateDirectoryPath, `${className}Repository.ts`), '', {
      overwrite: true,
    });

    classFile.addImportDeclarations([
      { namedImports: ['assert'], moduleSpecifier: 'assert' },
      { namedImports: ['inject'], moduleSpecifier: '@lad-tech/nsc-toolkit' },
      { namedImports: ['Configurator', 'Logger', 'preparePagination'], moduleSpecifier: 'general' },
      { namedImports: ['Collection', 'Filter', 'MongoClient', 'ReturnDocument'], moduleSpecifier: 'mongodb' },
      { namedImports: ['TYPES'], moduleSpecifier: '../di.types' },
      { namedImports: [className, `${className}Db`], moduleSpecifier: `../domain/aggregates/${className}` },
    ]);

    const repositoryClass = classFile.addClass({
      name: repositoryName,
      isExported: true,
      properties: [
        {
          name: 'client',
          type: 'MongoClient',
          scope: Scope.Private,
        },
        {
          name: 'collection',
          type: `Collection<${className}Db>`,
          scope: Scope.Public,
        },
        {
          name: 'errors',
          type: 'Record<string, string>',
          scope: Scope.Private,
          initializer: `{
        DBMS_REQUEST_FAILED: 'DBMS request error',
      }`,
        },
      ],
      ctors: [
        {
          parameters: [
            {
              name: 'logger',
              scope: Scope.Private,
              type: 'Logger',
              decorators: [{ name: 'inject', arguments: ['TYPES.Logger'] }],
            },
            {
              name: 'configurator',
              type: 'Configurator',
              scope: Scope.Private,
              decorators: [{ name: 'inject', arguments: ['TYPES.Configurator'] }],
            },
          ],
          statements: `
      const uri = configurator.getSettingFromEnv('MONGODB_URI');
      const dbName = configurator.getSettingFromEnvOrDefault('MONGODB_DATABASE', 'backend-example');

      this.client = new MongoClient(uri, { ignoreUndefined: true });
      this.collection = this.client.db(dbName).collection('${className.toLowerCase()}');
    `,
        },
      ],
    });

    // Метод connect
    repositoryClass.addMethod({
      name: 'connect',
      scope: Scope.Public,
      isAsync: true,
      statements: `
    try {
      await this.client.connect();
      await this.client.db().command({ ping: 1 });
      await this.createIndexes();
      this.logger.info('Successful connection to mongodb');
    } catch (error) {
      this.logger.error('Failed connecting to mongodb', error);
    }
  `,
    });

    // Метод close
    repositoryClass.addMethod({
      name: 'close',
      scope: Scope.Public,
      isAsync: true,
      statements: `
    try {
      await this.client.close();
      this.logger.info('Successful closed connection with mongodb');
    } catch (error) {
      this.logger.error('Failed closing connection with mongodb', error);
    }
  `,
    });

    // Метод createIndexes
    repositoryClass.addMethod({
      name: 'createIndexes',
      scope: Scope.Private,
      isAsync: true,
      statements: `return Promise.all([this.collection.createIndex({ id: 1 }, { unique: true })]);`,
    });

    // Метод save
    repositoryClass.addMethod({
      name: 'save',
      scope: Scope.Public,
      isAsync: true,
      parameters: [{ name: 'aggregate', type: className }],
      statements: `
    const dbEntity = aggregate.toJSON();
    const r = await this.collection.findOneAndUpdate(
      { id: dbEntity.id },
      { $setOnInsert: dbEntity },
      { upsert: true, returnDocument: ReturnDocument.AFTER },
    );

    assert(r);

    return aggregate;
  `,
    });

    // Метод update
    repositoryClass.addMethod({
      name: 'update',
      scope: Scope.Public,
      isAsync: true,
      parameters: [{ name: 'aggregate', type: className }],
      statements: `
    const dbAggregate = aggregate.toJSON();
    const r = await this.collection.findOneAndUpdate(
      { id: dbAggregate.id },
      { $set: dbAggregate },
      { returnDocument: ReturnDocument.AFTER },
    );

    assert(r);

    return ${className}.fromDB(r.value);
  `,
    });

    // Метод findById
    repositoryClass.addMethod({
      name: 'findById',
      scope: Scope.Public,
      isAsync: true,
      parameters: [{ name: 'id', type: 'string' }],
      statements: `
    const result = await this.collection.findOne({ id });
    return result ? new ${className}(result): null;
  `,
    });
    // Метод getList
    repositoryClass.addMethod({
      name: 'getList',
      scope: Scope.Public,
      isAsync: true,
      parameters: [
        {
          name: 'options',
          type: `{ page?: number; size?: number; ${filterColumns.map(col => `${col}?: string`).join('; ')} }`,
        },
      ],
      statements: `
        const { page = 1, size = 24, ${filterColumns.join(', ')} } = options;

        const searchData: Filter<${className}Db> = {};
        
        ${filterColumns.map(col => `if (${col}) searchData.${col} = ${col};`).join('\n')}

        const total = await this.collection.countDocuments(searchData);
        const { meta, from } = preparePagination({
          page,
          size,
          total,
        });
        const results = await this.collection
          .find(searchData, { skip: from, limit: size, sort: { updated: -1 } })
          .toArray();

        return {
          meta,
          data: results.map( i=> new ${className}(i))
        };
      `,
    });

    // Метод deleteById
    repositoryClass.addMethod({
      name: 'deleteById',
      scope: Scope.Public,
      isAsync: true,
      parameters: [{ name: 'id', type: 'string' }],
      statements: `
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(\`Entity with id \${id} not found\`);
    }
    await this.collection.deleteOne({ id });

    return entity;
  `,
    });

    // Сохранение файла
    classFile.saveSync();

    const indexFile = project.createSourceFile(
      path.resolve(aggregateDirectoryPath, `index.ts`),
      `export * from './${className}Repository';`,
      {
        overwrite: true,
      },
    );
    indexFile.saveSync();
    console.log('Репозиторий  сгенерирован:', classFile.getFilePath());
  }
};
