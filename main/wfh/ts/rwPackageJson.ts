import * as fs from 'fs-extra';
import * as Path from 'path';
import {getLogger} from 'log4js';
const log = getLogger('plink.rwPackageJson');
import * as _ from 'lodash';
import {map} from 'rxjs/operators';
import {Observable} from 'rxjs';
// import config from './config';
const isWin32 = require('os').platform().indexOf('win32') >= 0;

// type Callback = (...args: any[]) => void;

export function symbolicLinkPackages(destDir: string) {
  return function(src: Observable<{name: string, realPath: string}>) {
    return src.pipe(
      map(({name, realPath}) => {
        let newPath: string;
        try {
          newPath = Path.join(destDir, name);
          let stat: fs.Stats, exists = false;
          try {
            stat = fs.lstatSync(newPath);
            exists = true;
          } catch (e) {
            if (e.code === 'ENOENT') {
              exists = false;
            } else
              throw e;
          }

          if (exists) {
            if (stat!.isFile() ||
              (stat!.isSymbolicLink() && fs.realpathSync(newPath) !== realPath)) {
              fs.unlinkSync(newPath);
              _symbolicLink(realPath, newPath);
            } else if (stat!.isDirectory()) {
              log.info('Remove installed package "%s"', Path.relative(process.cwd(), newPath));
              fs.removeSync(newPath);
              _symbolicLink(realPath, newPath);
            }
          } else {
            _symbolicLink(realPath, newPath);
          }
        } catch(err) {
          log.error(err);
        }
      })
    );
  };
}

function _symbolicLink(dir: string, link: any) {
  fs.mkdirpSync(Path.dirname(link));
  fs.symlinkSync(Path.relative(Path.dirname(link), dir), link, isWin32 ? 'junction' : 'dir');
  log.info('Create symlink "%s"', Path.relative(process.cwd(), link));
}

