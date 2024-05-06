/**
 * To develop Plink, we need to symlink Plink repo to a workspace directory
 */
import * as fs from 'fs';
import * as fsExt from 'fs-extra';
import Path from 'path';
import os from 'os';
export const isWin32 = os.platform().indexOf('win32') >= 0;

 /**
  * 1. create symlink node_modules/@wfh/plink --> directory "main"
  * 2. create symlink parent directory of "main">/node_modules --> node_modules
  */
export function linkDrcp() {
  const sourceDir = Path.resolve(__dirname, '../..'); // directory "main"

   // 1. create symlink node_modules/@wfh/plink --> directory "main"
  const target = getRealPath('node_modules/@wfh/plink');
  if (target !== sourceDir) {
    if (!fs.existsSync('node_modules'))
      fs.mkdirSync('node_modules');
    if (!fs.existsSync('node_modules/@wfh'))
      fs.mkdirSync('node_modules/@wfh');

    if (target != null) {
      fsExt.removeSync(Path.resolve('node_modules/@wfh/plink'));
      // fs.unlinkSync(Path.resolve('node_modules/@wfh/plink'));
    }
    fs.symlinkSync(Path.relative(Path.resolve('node_modules', '@wfh'), sourceDir),
       Path.resolve('node_modules', '@wfh', 'plink'), isWin32 ? 'junction' : 'dir');
  }
  // eslint-disable-next-line no-console
  console.log(Path.resolve('node_modules', '@wfh/plink') + ' is created');

   // // 2. create symlink <parent directory of "main">/node_modules --> node_modules
   // const topModuleDir = Path.resolve(sourceDir, '../node_modules');
   // if (fs.existsSync(topModuleDir)) {
   //   if (fs.realpathSync(topModuleDir) !== Path.resolve('node_modules')) {
   //     fs.unlinkSync(topModuleDir);
   //     fs.symlinkSync(Path.relative(Path.dirname(topModuleDir), Path.resolve('node_modules')),
   //     topModuleDir, isWin32 ? 'junction' : 'dir');
   // eslint-disable-next-line , no-console
   //     console.log(topModuleDir + ' is created');
   //   }
   // } else {
   //   fs.symlinkSync(Path.relative(Path.dirname(topModuleDir), Path.resolve('node_modules')),
   //     topModuleDir, isWin32 ? 'junction' : 'dir');
   // eslint-disable-next-line , no-console
   //   console.log(topModuleDir + ' is created');
   // }
}

function getRealPath(file: string): string | null {
  try {
    if (fs.lstatSync(file).isSymbolicLink()) {
      return Path.resolve(Path.dirname(file), fs.readlinkSync(file));
    } else {
      return Path.resolve(file);
    }
  } catch (e) {
    return null;
  }
}
