import { readFile } from 'fs/promises';

import { compile } from 'gitignore-parser';
import * as path from 'path';
export async function parseIgnoreFile(location: string) {
  const str = await readFile(location, { encoding: 'utf8' });
  return compile(str);
}

export async function isIgnore(directoryPath: string, filepath: string) {
  try {
    const ignoreFile = await parseIgnoreFile(path.join(directoryPath.toString(), `.nscignore`));
    console.log(filepath, 'ignore =', ignoreFile.denies(filepath));
    return ignoreFile.denies(filepath);
  } catch (e) {
    console.error(e)
    return false
  }

}
