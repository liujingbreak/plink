import * as fs from 'fs-extra';
import * as Path from 'path';
// const jsonLint = require('json-lint');
const log = require('log4js').getLogger('wfh.' + Path.basename(__filename, '.js'));
import * as _ from 'lodash';
import {map, filter} from 'rxjs/operators';
import {Observable} from 'rxjs';
// import config from './config';
const isWin32 = require('os').platform().indexOf('win32') >= 0;

// type Callback = (...args: any[]) => void;

export function symbolicLinkPackages(destDir: string) {
  return function(src: Observable<string>) {
    return src.pipe(
      map<string, [string, any]>(pkjsonFile => {
        let newPath: string, json: any;
        try {
          const content = fs.readFileSync(pkjsonFile, {encoding: 'utf-8'});

          json = JSON.parse(content);
          newPath = Path.join(destDir, json.name);
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
          log.debug('symblink to %s', newPath);
          if (exists) {
            if (stat!.isFile() ||
              (stat!.isSymbolicLink() && fs.realpathSync(newPath) !== Path.dirname(pkjsonFile))) {
              fs.unlinkSync(newPath);
              _symbolicLink(Path.dirname(pkjsonFile), newPath);
            } else if (stat!.isDirectory()) {
              log.info('Remove installed package "%s"', Path.relative(process.cwd(), newPath));
              fs.removeSync(newPath);
              _symbolicLink(Path.dirname(pkjsonFile), newPath);
            }
          } else {
            _symbolicLink(Path.dirname(pkjsonFile), newPath);
          }
          return [pkjsonFile, json];
        } catch(err) {
          log.error(err);
          return [pkjsonFile, null];
        }
      }),
      filter((pkjsonNContent) => pkjsonNContent[1] != null)
    );
  };
}

function _symbolicLink(dir: string, link: any) {
  fs.mkdirpSync(Path.dirname(link));
  fs.symlinkSync(Path.relative(Path.dirname(link), dir), link, isWin32 ? 'junction' : 'dir');
  log.info('Create symlink "%s"', Path.relative(process.cwd(), link));
}

