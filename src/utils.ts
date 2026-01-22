import { readFile } from 'fs/promises';

import { compile } from 'gitignore-parser';
import * as path from 'path';
import { logger } from './logger/index.js';

type GitignoreParser = ReturnType<typeof compile>;

const ignoreFileCache = new Map<string, GitignoreParser>();

/**
 * Парсинг файла .nscignore и компиляция в правила gitignore
 * @param location - Путь к файлу .nscignore
 * @returns Скомпилированный парсер gitignore
 * @throws {Error} Если файл не может быть прочитан
 */
export async function parseIgnoreFile(location: string): Promise<GitignoreParser> {
  const cached = ignoreFileCache.get(location);
  if (cached) {
    return cached;
  }

  const str = await readFile(location, { encoding: 'utf8' });
  const compiled = compile(str);
  ignoreFileCache.set(location, compiled);
  return compiled;
}

/**
 * Проверка, должен ли файл быть проигнорирован на основе правил .nscignore
 * @param directoryPath - Директория, содержащая .nscignore
 * @param filepath - Путь к файлу для проверки
 * @returns true, если файл должен быть проигнорирован
 */
export async function isIgnore(directoryPath: string, filepath: string): Promise<boolean> {
  try {
    const ignoreFilepath = path.join(directoryPath.toString(), `.nscignore`);
    const ignoreFile = await parseIgnoreFile(ignoreFilepath);
    const shouldIgnore = ignoreFile.denies(filepath);

    logger.debug(`${filepath} - ignore: ${shouldIgnore}`);
    return shouldIgnore;
  } catch {
    return false;
  }
}

/**
 * Очистка кеша файлов игнорирования
 */
export function clearIgnoreCache(): void {
  ignoreFileCache.clear();
}
