/**
 * Do not import any 3rd-party dependency in this file,
 * it is run by `init` command at the time there probably is
 * no dependencies installed yet
 */

import fs from 'fs';
import Path from 'path';
import util from 'util';
import os from 'os';

const isWin32 = os.platform().indexOf('win32') >= 0;
const readdirAsync = util.promisify(fs.readdir);
const lstatAsync = util.promisify(fs.lstat);
const unlinkAsync = util.promisify(fs.unlink);

export default async function scanNodeModules(deleteOption: 'all' | 'invalid' = 'invalid') {
  const level1Dirs = await readdirAsync('node_modules');

  const deleteAll = deleteOption === 'all';

  await Promise.all(level1Dirs.map(async dir => {
    if (dir.startsWith('@')) {
      // it is a scope package
      const subdirs = await readdirAsync(Path.resolve('node_modules', dir));
      await Promise.all(subdirs.map(s => checkDir(Path.resolve('node_modules', dir, s), deleteAll)));
    } else {
      await checkDir(Path.resolve('node_modules', dir), deleteAll);
    }
  }));
}

export function linkDrcp() {
  const sourceDir = Path.resolve(__dirname, '../../..');
  if (!fs.existsSync('node_modules'))
    fs.mkdirSync('node_modules');
  fs.symlinkSync(Path.relative(Path.resolve('node_modules'), sourceDir),
    Path.resolve('node_modules', 'dr-comp-package'), isWin32 ? 'junction' : 'dir');
  // tslint:disable-next-line: no-console
  console.log(Path.resolve('node_modules', 'dr-comp-package') + ' is created');
}

async function checkDir(dir: string, deleteAll = false) {
  if ((await lstatAsync(dir)).isSymbolicLink() &&
    (deleteAll ||  !fs.existsSync(Path.resolve(Path.dirname(dir), fs.readlinkSync(dir))))
    ) {
    // tslint:disable-next-line: no-console
    console.log(`[symlink check] Remove ${deleteAll ? '' : 'invalid'} symlink ${Path.relative('.', dir)}`);
    await unlinkAsync(dir);
  }
}

