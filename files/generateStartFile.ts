import * as path from 'path';
import { FILE_EXTENTION, START_FILE_NAME } from '../constants';
import { MiddlewareFn, MiddlewareOptions } from '../interfaces';
import { isIgnore } from '../utils';

export const generateStartFile: MiddlewareFn = async (opts: MiddlewareOptions): Promise<void> => {
  const { project, schema, directoryPath, schemaFileName } = opts;

  const filePath = path.join(directoryPath, `${START_FILE_NAME}${FILE_EXTENTION}`);
  if (await isIgnore(directoryPath, filePath)) {
    return;
  }

  const file = project.createSourceFile(
    filePath,
    `import { main } from './service';
    main().catch(e => {
     console.error(e);
     console.error(e.stack);
    });

    
    `,
    { overwrite: true },
  );
  await file.save();
};
