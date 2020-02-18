// tslint:disable no-console
import fs from 'fs-extra';
import Path from 'path';
import _ from 'lodash';
import chalk from 'chalk';

export function genPackage(path: string, dryrun = false) {
  if (!path) {
    throw new Error('Lack of arguments');
  }
  if (dryrun) {
    // tslint:disable-next-line: no-console
    console.log('[cra-scripts cmd] dryrun mode');
  }
  const ma = /^@[^/]\/([^]*)$/.exec(path);
  if (ma) {
    path = ma[1];
  }
  const dir = Path.resolve('projects/cra-lib', path);
  fs.mkdirpSync(dir);

  copyTempl(dir, Path.basename(path), dryrun);
  console.log('[cra-scripts cmd] You need to run `drcp init`');
}

function copyTempl(to: string, pkName: string, dryrun: boolean) {
  const templDir = Path.resolve(__dirname, '..', 'template');
  const files = fs.readdirSync(templDir);
  for (const sub of files) {
    const file = Path.resolve(templDir, sub);
    if (fs.statSync(file).isDirectory()) {
      if (!dryrun)
        fs.mkdirpSync(Path.resolve(to, sub));
      const relative = Path.relative(templDir, file);
      files.push(...fs.readdirSync(file).map(child => Path.join(relative, child)));
      continue;
    }
    const newFile = Path.resolve(to, sub.slice(0, sub.lastIndexOf('.')).replace(/-([^-/\\]+)$/, '.$1'));
    if (!fs.existsSync(newFile)) {
      if (sub === 'package-json.json') {
        const pkJsonStr = fs.readFileSync(Path.resolve(templDir, sub), 'utf8');
        const newFile = Path.resolve(to, 'package.json');
        if (!dryrun)
          fs.writeFile(newFile, _.template(pkJsonStr)({name: '@bk/' + Path.basename(pkName)}));
        console.log(`[cra-scripts cmd] ${chalk.green(Path.relative(Path.resolve(), newFile))} is created`);
        continue;
      }
      if (!dryrun)
        fs.copyFile(Path.resolve(templDir, sub), newFile);
      console.log(`[cra-scripts cmd] ${chalk.green(Path.relative(Path.resolve(), newFile))} is created`);
    } else {
      console.log('[cra-scripts cmd] target file already exists:', Path.relative(Path.resolve(), newFile));
    }
  }
}
