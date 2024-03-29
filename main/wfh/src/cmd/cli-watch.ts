import * as Path from 'path';
import fs from 'fs';
import {getLogger} from 'log4js';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import chokidar from 'chokidar';
import {mkdirpSync} from 'fs-extra';
import anymatch from 'anymatch';
import {actionDispatcher} from '../package-mgr';
import {findPackagesByNames} from './utils';
import {WatchOption} from './types';

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
    op.mergeMap((pkg, _idx) => {
      return new rx.Observable<'change' | 'unlink'>(sub => {
        // log.info(pkg.realPath);
        const pkgJsonFile = Path.resolve(pkg!.realPath, 'package.json');
        const watcher = chokidar.watch(pkgJsonFile);
        log.info('watching', pkgJsonFile);

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
      op.mergeMap((pkg) => {
        const npmIgnore = Path.resolve(pkg!.realPath, '.npmignore');
        return (fs.existsSync(npmIgnore) ?
          rx.from(fs.promises.readFile(npmIgnore, 'utf-8')) :
          rx.of('')
        ).pipe(
          op.switchMap(content => new rx.Observable<[string, string]>((sub) => {
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
                sub.next([path, Path.join(pkg!.name, relPath)]);
              }
            });
            watcher.on('change', path => {
              const relPath = Path.relative(pkg!.realPath, path).replace(/\\/g, '/');
              if ( !matchNpmIgnore('/' + relPath) && !matchNpmIgnore(relPath)) {
                sub.next([path, Path.join(pkg!.name, relPath)]);
              }
            });
            return () => watcher.close();
          })),
          op.takeUntil(deletePkgMsg.pipe(op.filter(pkgName => pkgName === pkg!.name)))
        );
      }),
      op.mergeMap(([srcFile, relPath]) => {
        const target = Path.resolve(opt.copy!, relPath);
        log.info('copy', srcFile, 'to\n ', target);
        mkdirpSync(Path.dirname(target));
        return fs.promises.copyFile(srcFile, target);
      })
    ).subscribe();

    if (opt.a && opt.a.length > 0) {
      log.info('additional watches:', opt.a);
      rx.from(opt.a).pipe(
        op.mergeMap(source => new rx.Observable<[from: string, to: string]>(sub => {
          const watcher = chokidar.watch(opt.include ? Path.posix.join(source.replace(/\\/g, '/'), opt.include) : source);

          watcher.on('add', path => {
            const relative = Path.relative(source, path);
            log.info('chokidar add', relative);
            sub.next([path, Path.join(opt.copy!, relative)]);
          });
          watcher.on('change', path => {
            const relative = Path.relative(source, path);
            log.info('chokidar change', relative);
            sub.next([path, Path.join(opt.copy!, relative)]);
          });
          return () => watcher.close();
        })),
        op.mergeMap(([srcFile, target]) => {
          log.info('copy', srcFile, 'to\n ', target);
          mkdirpSync(Path.dirname(target));
          return fs.promises.copyFile(srcFile, target);
        })
      ).subscribe();
    }
  }
}
