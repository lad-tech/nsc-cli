import fs from 'fs';
import path from 'path';
import { CrudMiddlewareFn } from '../../v2/crud/interfaces';

export const generateGeneralFiles: CrudMiddlewareFn = async opts => {
  const { rootPath, project } = opts;

  // Определяем путь к директории general и необходимым файлам
  const generalDirectoryPath = path.resolve(rootPath, '..', 'general');
  const paginationFilePath = path.join(generalDirectoryPath, 'pagination.ts');
  const loggerFilePath = path.join(generalDirectoryPath, 'Logger.ts');
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
  const exports = ['pagination', 'Logger', 'Configurator'];
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
