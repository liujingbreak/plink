import fs from 'fs';
import Path from 'path';
import { log4File } from '@wfh/plink';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
const log = log4File(__filename);

/**
 * see ../../fix-postcss-values-parser/README.md
 */
export default async function patch(workspaceDirs: Iterable<string>) {
  const targets = [
    'node_modules/react-scripts/node_modules/postcss-preset-env/node_modules/postcss-values-parser/package.json',
    'node_modules/react-scripts/node_modules/postcss-values-parser/package.json',
    'node_modules/postcss-values-parser/package.json'
  ];
  return rx.from(workspaceDirs).pipe(
    op.mergeMap(async ws => {
      const found = targets.find(target => {
        return fs.existsSync(Path.resolve(ws, target));
      });
      if (found) {
        const jsonFile = Path.resolve(ws, found);
        const pkJson = JSON.parse(await fs.promises.readFile(jsonFile, 'utf-8')) as {version: string};
        if (pkJson.version === '2.0.1') {
          const targetFile = Path.resolve(Path.dirname(jsonFile), 'lib/parser.js');
          log.info('Patch postcss-values-parser@2.0.1 ' + targetFile);
          await fs.promises.copyFile(Path.resolve(__dirname, '../fix-postcss-values-parser/parser.js'), targetFile);
        }
      }
    })
  ).toPromise();
}
