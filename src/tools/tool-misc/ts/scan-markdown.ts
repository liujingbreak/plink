
// import api from '__api';
import Path from 'path';
import fs from 'fs';
import {promisify} from 'util';
import _ from 'lodash';
const log = require('log4js').getLogger('tool-misc.' + Path.basename(__filename));

export async function scan(dir: string) {
  // let globExcludes: string[] = ['node_modules'];
  if (!dir)
    dir = Path.resolve();

  const result: {[dir: string]: string[]} = {};
  await globDirs(dir, result);

  log.info(result);
}

const readdir = promisify(fs.readdir);
const statAsync = promisify(fs.stat);


async function globDirs(dir: string, collection: {[dir: string]: string[]}): Promise<{[dir: string]: string[]}> {
  const baseDirName = Path.basename(dir);
  if (baseDirName === 'node_modules' || baseDirName.startsWith('.'))
    return Promise.resolve(collection);

  log.info('scan', dir);

  const subDirDone = readdir(dir)
  .then(async dirs => {
    const subDirs = await Promise.all(dirs.map(async baseSubDir => {
      const subDir = Path.resolve(dir, baseSubDir);
      const stat = await statAsync(subDir);
      if (stat.isFile() && subDir.endsWith('.md')) {
        let col = collection[dir];
        if (!col)
          col = collection[dir] = [];
        col.push(baseSubDir);
      }
      return stat.isDirectory() ? subDir : null;
    }));
    return Promise.all(subDirs.filter(subDir => subDir).map(subDir => {
      return globDirs(subDir!, collection);
    }));
  });
  await subDirDone;
  return collection;
}
