import {WatchOption} from './types';
import chokidar from 'chokidar';
import {findPackagesByNames} from './utils';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {getLogger} from 'log4js';
import * as Path from 'path';
import {actionDispatcher} from '../package-mgr';
import fs from 'fs';
import {mkdirpSync} from 'fs-extra';
import anymatch from 'anymatch';

const log = getLogger('plink.cli');

export function cliWatch(packages: string[], opt: WatchOption) {
  let hasUnlinkEvent = false;
  let changedPkgJson = [] as string[];
  const pkgs = [...findPackagesByNames(packages)];

  const deletePkgMsg = new rx.Subject<string>();

  rx.from(pkgs).pipe(
    op.filter((pkg, idx) => {
      if (pkg == null) {
        log.info(`Can not find source package of: ${packages[idx]}`);
        return false;
      }
      return true;
    }),
    op.mergeMap((pkg, idx) => {
      return new rx.Observable<'change' | 'unlink'>(sub => {
        // log.info(pkg.realPath);
        const pkgJsonFile = Path.resolve(pkg!.realPath, 'package.json');
        const watcher = chokidar.watch(pkgJsonFile);

        watcher.on('change', path => {
          log.info(path, 'changed');
          // if (path === pkgJsonFile) {
            changedPkgJson.push(path);
            sub.next('change');
          // }
        });

        watcher.on('unlink', path => {
          // if (path === pkgJsonFile) {
            hasUnlinkEvent = true;
            changedPkgJson.splice(0);
            deletePkgMsg.next(pkg!.name);
            sub.next('unlink');
          // }
        });
        return () => watcher.close();
      });
    }),
    op.debounceTime(300),
    op.map(() => {
      if (hasUnlinkEvent) {
        hasUnlinkEvent = false;
        actionDispatcher.scanAndSyncPackages({});
      } else {
        const files = changedPkgJson;
        changedPkgJson = [];
        log.info(files);
        actionDispatcher.scanAndSyncPackages({packageJsonFiles: files});
      }
    })
  ).subscribe();

  if (opt.copy) {
    mkdirpSync(opt.copy);
    // const copyTo = Path.resolve(opt.copy);
    rx.from(pkgs).pipe(
      op.filter(pkg => pkg != null),
      op.mergeMap((pkg, idx) => {
        const npmIgnore = Path.resolve(pkg!.realPath, '.npmignore');
        return (fs.existsSync(npmIgnore) ?
          rx.from(fs.promises.readFile(npmIgnore, 'utf-8')) :
          rx.of('')
        ).pipe(
          op.switchMap(content => new rx.Observable<string>((sub) => {
            function matchNpmIgnore(relativePath: string) {
              let matched = false;
              for (const line of content.split(/\n\r?/)) {
                if (line.trim().length === 0)
                  continue;
                if (!line.startsWith('!')) {
                  if (anymatch([line], relativePath))
                    matched = true;
                } else if (matched && anymatch([line.slice(1)], relativePath)) {
                  // If pattern begins with ! and matched previous pattern, and now it matches the remainder part of pattern
                  matched = false;
                }
              }
              return matched;
            }

            const watcher = chokidar.watch(pkg!.realPath);

            watcher.on('add', path => {
              const relPath = Path.relative(pkg!.realPath, path).replace(/\\/g, '/');
              if ( !matchNpmIgnore('/' + relPath) && !matchNpmIgnore(relPath)) {
                sub.next(path);
              }
            });
            watcher.on('change', path => {
              const relPath = Path.relative(pkg!.realPath, path).replace(/\\/g, '/');
              if ( !matchNpmIgnore('/' + relPath) && !matchNpmIgnore(relPath)) {
                sub.next(path);
              }
            });
            return () => watcher.close();
          })),
          op.takeUntil(deletePkgMsg.pipe(op.filter(pkgName => pkgName === pkg!.name)))
        );
      }),
      op.mergeMap(file => {
        log.info('copy', file);
        return fs.promises.copyFile(file, opt.copy!);
      })
    ).subscribe();
  }
}
