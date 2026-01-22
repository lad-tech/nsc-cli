import * as path from 'path';
import * as fs from 'fs';
import { InvalidInputError, FileNotFoundError } from '../errors/index.js';
import { ServiceSchema } from '../interfaces.js';

/**
 * Валидация пути к файлу схемы
 * @param schemaPath - Путь к файлу схемы
 * @throws {InvalidInputError} Если файл схемы имеет неверное расширение или не является файлом
 * @throws {FileNotFoundError} Если файл схемы не существует
 */
export function validateSchemaPath(schemaPath: string): void {
  const ext = path.extname(schemaPath);
  if (ext !== '.json') {
    throw new InvalidInputError(`Schema file must have .json extension, got: ${ext}`);
  }

  if (!fs.existsSync(schemaPath)) {
    throw new FileNotFoundError(schemaPath);
  }

  const stats = fs.statSync(schemaPath);
  if (!stats.isFile()) {
    throw new InvalidInputError(`Schema path must point to a file, not a directory: ${schemaPath}`);
  }
}

/**
 * Валидация структуры схемы
 * @param schema - Объект схемы для валидации
 * @throws {InvalidInputError} Если структура схемы некорректна
 */
export function validateSchema(schema: unknown): asserts schema is ServiceSchema {
  if (!schema || typeof schema !== 'object') {
    throw new InvalidInputError('Schema must be an object');
  }

  const s = schema as Partial<ServiceSchema>;

  if (!s.name || typeof s.name !== 'string') {
    throw new InvalidInputError('Schema must have a "name" field of type string');
  }

  if (!s.methods || typeof s.methods !== 'object') {
    throw new InvalidInputError('Schema must have a "methods" field');
  }
}
