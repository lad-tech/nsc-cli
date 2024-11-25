import fs from 'fs';
import path from 'path';
import { CrudMiddlewareFn } from '../../crud/interfaces';

export const generateGeneralFiles: CrudMiddlewareFn = async opts => {
  const { rootPath, project } = opts;

  // Определяем путь к директории general и необходимым файлам
  const generalDirectoryPath = path.resolve(rootPath, '..', 'general');
  const paginationFilePath = path.join(generalDirectoryPath, 'pagination.ts');
  const loggerFilePath = path.join(generalDirectoryPath, 'Logger.ts');
  const miscFilePath = path.join(generalDirectoryPath, 'misc.ts');
  const errorFileDirectory = path.join(generalDirectoryPath, 'Errors');
  const errorFilePath = path.join(errorFileDirectory, 'BusinessLogicError.ts');
  const configuratorFilePath = path.join(generalDirectoryPath, 'Configurator.ts');
  const indexFilePath = path.join(generalDirectoryPath, 'index.ts');

  // Проверяем наличие директории general
  if (!fs.existsSync(generalDirectoryPath)) {
    fs.mkdirSync(generalDirectoryPath, { recursive: true });
    console.log(`Директория general создана по пути ${generalDirectoryPath}`);
  }

  // Проверяем наличие файла pagination.ts
  if (!fs.existsSync(paginationFilePath)) {
    project.createSourceFile(
      paginationFilePath,
      `export function preparePagination(params: { page?: number; size?: number; total: number }) {
  const { page = 1, size = 12, total } = params;
  if (total < 1) {
    return {
      from: 0,
      meta: { total, size, page },
    };
  }
  const calculatedTotal = size * page;
  if (calculatedTotal > total) {
    const recalculatedPageNumber = Math.ceil(total / size);
    return {
      from: (recalculatedPageNumber - 1) * size,
      meta: { total, size, page: recalculatedPageNumber },
    };
  }
  return {
    from: (page - 1) * size,
    meta: { total, size, page },
  };
}
`,
      { overwrite: true },
    );
    console.log(`Файл pagination.ts создан по пути ${paginationFilePath}`);
  }

  if (!fs.existsSync(miscFilePath)) {
    project.createSourceFile(
      miscFilePath,
      `
  export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isDef<T>(value: T): value is Exclude<T, undefined> {
  return typeof value !== 'undefined';
}

export function isObjectLike(value: unknown): value is { [key: string]: unknown } {
  return typeof value === 'object' && value !== null;
}`,
      { overwrite: true },
    );
    console.log(`Файл pagination.ts создан по пути ${paginationFilePath}`);
  }

  // Проверяем наличие файла Logger.ts
  if (!fs.existsSync(loggerFilePath)) {
    project.createSourceFile(
      loggerFilePath,
      `import { Logs } from '@lad-tech/toolbelt';

          export type Logger = Logs.Logger;
          
          export class LogsOutputFormatter implements Logs.OutputFormatter {
            public format(params: Logs.FormatParameters): string {
              const time = new Date().toISOString();
              return JSON.stringify({
                time,
                request_id: params.metadata.traceId,
                level: params.verbosityString,
                location: params.location,
                msg: params.parsedArgs.join(' '),
              });
            }
          }
          
          export const logger = new Logs.Logger({
            outputFormatter: new LogsOutputFormatter(),
          });

`,
      { overwrite: true },
    );
    console.log(`Файл Logger.ts создан по пути ${loggerFilePath}`);
  }
  // Проверяем наличие файла Errors.ts
  if (!fs.existsSync(errorFilePath)) {
    console.log('----->', errorFilePath);
    project.createSourceFile(
      errorFilePath,
      `import { HttpStatusCode } from 'axios';
      
      import { isObjectLike, isString } from '../misc';
      
      export interface ErrorResponse {
        name?: string;
        message: string;
        statusCode?: number;
        [k: string]: unknown | undefined;
      }
      
      const UNKNOWN_ERROR_MSG = 'Unknown error';
      
      export class BusinessLogicError {
        static isErrorResponse(obj: unknown): obj is { error: ErrorResponse } {
          return isObjectLike(obj) && isObjectLike(obj.error) && isString(obj.error.message);
        }
        static BadRequest(message: unknown) {
          return BusinessLogicError.TransportError(message, HttpStatusCode.BadRequest);
        }
      
        static Unauthorized(message: unknown) {
          return BusinessLogicError.TransportError(message, HttpStatusCode.Unauthorized);
        }
      
        static Forbidden(message: unknown) {
          return BusinessLogicError.TransportError(message, HttpStatusCode.Forbidden);
        }
      
        static NotFound(message: unknown) {
          return BusinessLogicError.TransportError(message, HttpStatusCode.NotFound);
        }
      
        static Conflict(message: unknown) {
          return BusinessLogicError.TransportError(message, HttpStatusCode.Conflict);
        }
      
        static InternalServerError(message: unknown) {
          return BusinessLogicError.TransportError(message, HttpStatusCode.InternalServerError);
        }
      
        static TransportError(err: unknown, statusCode: HttpStatusCode): { error: ErrorResponse } {
          if (err instanceof Error) {
            return {
              error: {
                name: err.name,
                message: err.message,
                statusCode: +statusCode,
              },
            };
          }
      
          return {
            error: {
              message: isString(err) ? err : UNKNOWN_ERROR_MSG,
              statusCode: +statusCode,
            },
          };
        }
      }
      `,
      { overwrite: true },
    );
    project.createSourceFile(
      path.resolve(errorFileDirectory, 'index.ts'),
      `import * as HTTP from 'node:http';
        
        import { ErrorResponse } from './BusinessLogicError';
        
        export * from './BusinessLogicError';
        
        const UNKNOWN_ERROR_MSG = 'Unknown error';
        
        export class NSCError extends Error {
          public code: string | undefined;
          public statusCode: number;
        
          constructor(params: { message: string; code?: string; statusCode?: number }) {
            const { code, statusCode = 500, message } = params;
            super(message);
            this.name = this.constructor.name;
            this.code = code;
            this.statusCode = statusCode;
            Error.captureStackTrace(this, this.constructor);
          }
          static From(params: ErrorResponse[]) {
            const [error] = params;
            return new NSCError({
              statusCode: error?.statusCode || 500,
              message: error?.message || UNKNOWN_ERROR_MSG,
            });
          }
        }
        
        /**
         * @deprecated Use createTransportError
         * @param {keyof typeof HTTP.STATUS_CODES} statusCode
         * @param {unknown} err
         * @returns {{errors: {name: string, message: string, statusCode: number}[]} | {errors: {name: string, message: string, statusCode: number}[]}}
         */
        export function makeError(statusCode: keyof typeof HTTP.STATUS_CODES, err: Error | unknown) {
          if (err instanceof Error) {
            return {
              errors: [
                {
                  name: err.name,
                  message: err.message,
                  statusCode: +statusCode,
                },
              ],
            };
          } else {
            return {
              errors: [
                {
                  name: UNKNOWN_ERROR_MSG,
                  message: UNKNOWN_ERROR_MSG,
                  statusCode: +statusCode,
                },
              ],
            };
          }
        }
        
      `,
      { overwrite: true },
    );
    console.log(`Файл Logger.ts создан по пути ${loggerFilePath}`);
  }

  // Проверяем наличие файла Configurator.ts
  if (!fs.existsSync(configuratorFilePath)) {
    project.createSourceFile(
      configuratorFilePath,
      `export class Configurator {
  public castToNumber(value: string) {
    const result = +value;
    if (isNaN(result)) {
      throw new Error(\`Невозможно привести значение \${value} к числу\`);
    }
    return result;
  }

  public getSettingFromEnv(name: string) {
    const value = process.env[name];
    if (!value) {
      throw new Error(\`Не установлена обязательная настройка: \${name}\`);
    }
    return value;
  }
  public getSettingFromEnvOrDefault(name: string, defval: string) {
    const value = process.env[name];
    if (!value) {
      return defval;
    }
    return value;
  }
}

`,
      { overwrite: true },
    );
    console.log(`Файл Configurator.ts создан по пути ${configuratorFilePath}`);
  }

  // Проверяем наличие и обновляем файл index.ts
  const exports = ['pagination', 'Logger', 'Configurator', 'misc', 'Errors'];
  let indexFileContent = '';

  if (fs.existsSync(indexFilePath)) {
    indexFileContent = fs.readFileSync(indexFilePath, 'utf-8');
  } else {
    console.log(`Файл index.ts создан по пути ${indexFilePath}`);
  }

  exports.forEach(exportItem => {
    const exportStatement = `export * from './${exportItem}';\n`;
    if (!indexFileContent.includes(exportStatement)) {
      indexFileContent += exportStatement;
    }
  });

  project.createSourceFile(indexFilePath, indexFileContent.toString(), { overwrite: true });
  await project.save();
  console.log(`Файл index.ts обновлен по пути ${indexFilePath}`);
};
