import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { MiddlewareFn, MiddlewareOptions } from '../interfaces.js';
import { isIgnore } from '../utils.js';

export const generatePackageJson: MiddlewareFn = async (opts: MiddlewareOptions): Promise<void> => {
  const { schema, directoryPath } = opts;
  const packageJsonPath = path.join(directoryPath, 'package.json');

  if (await isIgnore(directoryPath, packageJsonPath)) {
    return;
  }
  if (!fs.existsSync(packageJsonPath)) {
    execSync(` cd ${directoryPath} && npm init -y`);
    const json = JSON.parse(fs.readFileSync(packageJsonPath).toString());
    json.name = schema.name.toLowerCase();
    json.type = "module";
    json.main = "./dist/start.js";
    json.scripts = json.scripts || {};
    json.scripts.start = "npx tsx start.ts";
    json.scripts.build = "rm -rf ./dist && npx tsc";
      json.exports = {
        ".": {
          "import": "./dist/index.js",
          "types": "./dist/index.d.ts"
        },
        "./interfaces": "./dist/interfaces.js",
        "./schema": "./dist/service.schema.json",
        "./*": {
          "types": "./dist/*.d.ts"
        }
      }

    fs.writeFileSync(packageJsonPath, JSON.stringify(json, null, 2));
  }
};
