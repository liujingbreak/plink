const gutil = require('gulp-util');
const PluginError = gutil.PluginError;
const through = require('through2');
const File = require('vinyl');
import * as fs from 'fs';
import * as Path from 'path';
import {promisify} from 'util';

/**
 * Recursively lookup `fromDir` folder for private module's package.json file
 */
export default function findPackageJson(_fromDirs: string[] | string, startFromSubDir: boolean) {
  let fromDirs: string[];
  if (!Array.isArray(_fromDirs))
    fromDirs = [_fromDirs];
  return through.obj(
    function(whatever: any, encoding: string, callback: () => void) {callback();},
    function flush(callback: (err?: Error) => void) {
      const me = this;
      const proms = fromDirs.map(d => new FolderScanner(d, me).run(startFromSubDir));

      Promise.all(proms)
      .then(function() {
        callback();
      })
      .catch(function(err) {
        gutil.log(err);
        me.emit('error', new PluginError('findPackageJson', err.stack, {showStack: true}));
      });
    });
}

class FolderScanner {
  fromDir: string;
  private proms: Promise<any>[] = [];
  private through: { push(file: any): void };

  constructor(fromDir: string, through: {push(file: any): void}) {
    this.fromDir = Path.resolve(fromDir);
    this.through = through;
  }

  run(startFromSubDir: boolean) {
    this.proms = [];
    if (startFromSubDir)
      this.checkSubFolders(this.fromDir);
    else
      this.checkFolder(this.fromDir);
    return Promise.all(this.proms);
  }

  checkSubFolders(parentDir: string) {
    const folders = fs.readdirSync(parentDir);
    for (const name of folders) {
      try {
        if (name === 'node_modules') {
          const testDir = Path.resolve(parentDir, 'node_modules');
          if (fs.lstatSync(testDir).isSymbolicLink()) {
            // tslint:disable-next-line: no-console
            console.log('[find-package] found a symlink node_modules:', testDir);
          }
          continue;
        }
        const dir = Path.join(parentDir, name);
        this.checkFolder(dir);
      } catch (er) {
        console.error('[find-package]', er);
      }
    }
  }

  checkFolder(dir: string) {
    const self = this;
    if (fs.statSync(dir).isDirectory()) {
      const pkJsonPath = Path.join(dir, 'package.json');
      if (fs.existsSync(pkJsonPath)) {
        self.proms.push(createFile(pkJsonPath, self.fromDir)
          .then(function(file) {
            return self.through.push(file);
          }));
      } else {
        self.checkSubFolders(dir);
      }
    }
  }
}

const fsStateAsync = promisify(fs.stat);

function createFile(path: string, base: string) {
  return fsStateAsync(path).then(function(stat) {
    return new File({
      base,
      path,
      stat
    });
  });
}
