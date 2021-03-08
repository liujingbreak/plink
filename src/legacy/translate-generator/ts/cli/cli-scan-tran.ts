// import {config} from '@wfh/plink';
import plink from '__plink';
import fs from 'fs';
import fsext from 'fs-extra';
import Path from 'path';
import glob from 'glob';
import {Pool} from '@wfh/thread-promise-pool';
import {getTscConfigOfPkg} from '@wfh/plink/wfh/dist/utils/misc';
import {findPackagesByNames} from '@wfh/plink/wfh/dist/cmd/utils';
// import { PackageInfo } from '@wfh/plink/wfh/dist/package-mgr';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
// Chalk is useful for printing colorful text in a terminal
// import chalk from 'chalk';

export interface Translatable {
  key: string;
  text: string | null;
  start: number;
  end: number;
  desc: string;
}

export type StringInfo = [
  start: number,
  end: number,
  text: string,
  /** 1 based */
  line: number,
  /** 1 based */
  col: number,
  type: string
];

export async function scanTran(locale: string, pkgName: string | undefined,
  rootDir?: string, jsDir?: string, metaDir?: string, excludeJs = true) {
  // let transByFile: {[file: string]: Translatables[]};

  const scanDirs: string[] = [];
  if (rootDir == null) {
    rootDir = jsDir;
  }
  if (jsDir) {
    scanDirs.push(jsDir);
    if (metaDir == null) {
      const pkg = plink.findPackageByFile(jsDir);
      if (pkg == null) {
        throw new Error(`${jsDir} is not inside any of linked source package, you have to specify a metadata output directory`);
      }
      metaDir = Path.resolve(pkg.realPath, 'i18n');
    }

  } else if (pkgName) {
    const [pkg] = findPackagesByNames([pkgName]);
    if (pkg != null) {
      if (rootDir == null)
        rootDir = pkg.realPath;
      const pkgDirs = getTscConfigOfPkg(pkg.json);
      scanDirs.push(pkgDirs.destDir);
      if (pkgDirs.isomDir) {
        scanDirs.push(pkgDirs.isomDir);
      }
      if (metaDir == null) {
        metaDir = Path.resolve(pkg.realPath, 'i18n');
      }
    } else {
      throw new Error(`Can not found linked package for name like: ${pkgName}`);
    }
  }

  if (!fs.existsSync(metaDir!)) {
    fsext.mkdirpSync(metaDir!);
  }

  const pool = new Pool();
  await rx.from(scanDirs).pipe(
    op.filter(dir => {
      if (!fs.statSync(dir).isDirectory()) {
        plink.logger.error(`${dir} is not a directory`);
        return false;
      }
      return true;
    }),
    op.mergeMap(dir => {
      return new rx.Observable<string>(sub => {
        const pattern = Path.relative(process.cwd(), dir).replace(/\\/g, '/') +
          (excludeJs ? '/**/*.{ts,tsx,js,jsx}' : '/**/*.{js,jsx}');

        glob(pattern, {cwd: process.cwd(), nodir: true}, (err, matches) => {
          if (err) {
            return sub.error(err);
          }
          for (const file of matches) {
            if (!file.endsWith('.d.ts'))
              sub.next(file);
          }
          sub.complete();
        });
      });
    }),

    op.mergeMap(file => {
      return (async () => {
        try {
          const relPath = Path.relative(rootDir!, file);
          const metadataFile = Path.resolve(metaDir!, locale, relPath.replace(/\.[^./\\]+$/g, '.yaml'));
          await pool.submit<StringInfo[]>({
            file: Path.resolve(__dirname, 'cli-scan-tran-worker.js'),
            exportFn: 'scanFile',
            args: [file, metadataFile]
          });
        } catch (ex) {
          plink.logger.error(ex);
        }
      })();
    })
  ).toPromise();

  // plink.logger.info(`Found total ${files.length}`);
  // fsext.mkdirpSync(Path.dirname(output));
  // fs.promises.writeFile(output, JSON.stringify(transByFile, null, '  '));
  // plink.logger.info(output + ' is ' + (oldMetaFileExits ? 'updated' : 'written'));
}

