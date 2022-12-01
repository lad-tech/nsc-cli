import { execSync } from 'child_process';
import * as fs from 'fs';
import path from 'path';
import { MiddlewareFn, MiddlewareOptions } from '../interfaces';

export const generatePackageJson: MiddlewareFn = async (opts: MiddlewareOptions): Promise<void> => {
  const { project, schema, directoryPath } = opts;
  const packageJsonPath = path.join(directoryPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    execSync(` cd ${directoryPath} && npm init -y`);
    const json = JSON.parse(fs.readFileSync(packageJsonPath).toString());
    json.name = schema.name.toLowerCase();
    fs.writeFileSync(packageJsonPath, JSON.stringify(json, null, 2));
  }
};
