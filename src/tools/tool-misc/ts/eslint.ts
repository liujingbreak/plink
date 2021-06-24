/// <reference path="./eslint-cli.d.ts" />

import {execute} from 'eslint/lib/cli';
import glob from 'glob';
import path from 'path';

/**
 * Run eslint only for .ts file, exclude .d.ts files
 * @param dir 
 */
export async function eslint(dir: string) {
  const files = await new Promise<string[]>((resolve, reject) => {
    glob(dir + '/**/*.ts', (err, matches) => {
      if (err)
        return reject(err);
      resolve(matches.filter(file => !file.endsWith('.d.ts')));
    });
  });
  const args = [...process.argv.slice(0, 2), '-c', path.resolve(__dirname, '../eslintrc.js'), ''];
  for (const file of files) {
    args.pop();
    args.push(file);
    execute(args, null);
  }
}
