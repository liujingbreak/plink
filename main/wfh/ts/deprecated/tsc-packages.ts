/**
 * Use Typescript "Project Reference" & "tsc -b Commandline" ability to compile multiple packages
 */
import fs from 'fs';
import fse from 'fs-extra';
import _ from 'lodash';
import log4js from 'log4js';
import Path from 'path';
import { merge, Observable, EMPTY } from 'rxjs';
import {reduce, concatMap, filter} from 'rxjs/operators';
import { CompilerOptions } from 'typescript';
import config from '../config';
import { setTsCompilerOptForNodePath } from '../config-handler';
import { getState, PackageInfo, workspaceKey } from '../package-mgr';
import { getState as getTscState } from './tsc-packages-slice';
import {findPackagesByNames} from '../cmd/utils';
import {allPackages} from '../package-mgr/package-list-helper';
import {fork} from 'child_process';
const log = log4js.getLogger('wfh.tsc-packages');

export interface Tsconfig {
  extends?: string;
  compilerOptions: {[key in keyof CompilerOptions]: any};
  include?: string[];
  exclude?: string[];
  files?: string[];
  references?: {path: string}[];
}

export interface TscCmdParam {
  package?: string[];
  project?: string[];
  watch?: boolean;
  sourceMap?: string;
  jsx?: boolean;
  ed?: boolean;
  compileOptions?: {[key in keyof CompilerOptions]: any};
}

/**
 * All directories are relative to package real path
 */
export interface PackageJsonTscPropertyItem {
  rootDir: string;
  outDir: string;
  files?: string[];
  /** "references" in tsconfig https://www.typescriptlang.org/docs/handbook/project-references.html */
  references?: string[];
}

export type PackageJsonTscProperty = PackageJsonTscPropertyItem | PackageJsonTscPropertyItem[];

export function tsc(opts: TscCmdParam) {
  if (opts.package) {
    const pkgs = findPackagesByNames(getState(), opts.package);
    const tsconfigFile$ = generateTsconfigFiles(
      Array.from(pkgs).filter(pkg => pkg != null)
      .map(pkg => pkg!.name), opts);
    return tsconfigFile$.pipe(
      reduce<string>((all, tsconfigFile) => {
        all.push(tsconfigFile);
        return all;
      }, []),
      filter(files => files.length > 0),
      concatMap(files => {
        const env = process.env;
        delete env.NODE_OPTIONS;

        const arg = ['-b', ...files, '-v'];
        if (opts.watch)
          arg.push('-w');

        log.info('tsc ' + arg.join(' '));
        const cp = fork(require.resolve('typescript/lib/tsc.js'), arg, {env});
        return new Observable(sub => {
          cp.on('exit', (code, signal) => {
            log.info(code + ' ' + signal);
            sub.next();
            sub.complete();
          });
          cp.on('error', err => sub.error(err));
        });
      })
    );
  } else if (opts.project) {
    allPackages('*', 'src', opts.project);
  }
  return EMPTY;
}

export function generateTsconfigFiles(pkgs: Iterable<string>, opts: TscCmdParam) {
  let wsKey: string | null | undefined = workspaceKey(process.cwd());
  const walked = new Set<string>();

  for (const pkg of pkgs) {
    walkReferencedPkg(pkg);
  }

  if (!getState().workspaces.has(wsKey))
    wsKey = getState().currWorkspace;
  if (wsKey == null) {
    throw new Error('Current directory is not a work space');
  }

  const tsConfigsDir = config.resolve('destDir', 'tsconfigs');
  fse.mkdirpSync(tsConfigsDir);
  // const files = fs.readdirSync(tsConfigsDir);
  // console.log(files);

  const baseConfigFile = Path.resolve(__dirname, '..', '..', 'tsconfig-base.json');
  const baseTsxConfigFile = Path.resolve(__dirname, '..', '..', 'tsconfig-tsx.json');

  const done = Array.from(walked.values())
  .map(pkg => {
    const rawConfigs = getTscState().configs.get(pkg);
    if (rawConfigs == null) {
      throw new Error(`Package ${pkg} does not exist.`);
    }
    const tsconfigFiles = tsconfigFileNames(pkg)!;

    const works = rawConfigs
    .map((raw, idx) => {
      return new Observable<string>(sub => {
        const tsconfig = createTsconfigs(
          getState().srcPackages.get(pkg)!, tsconfigFiles, idx, raw.rootDir, raw.outDir, raw.files, raw.references);
        const toWrite = Path.resolve(tsConfigsDir, tsconfigFiles[idx]);
        fs.writeFile(toWrite, JSON.stringify(tsconfig, null, '  '), (err) => {
          if (err) {
            return sub.error();
          }
          log.info(`Write ${toWrite}`);
          sub.next(toWrite);
          sub.complete();
        });
      });
    });
    return merge(...works);
  });

  function createTsconfigs(pkg: PackageInfo, fileNames: string[], idx: number, rootDir: string, outDir: string,
    entries?: string[], references?: string[]) {
    const rootDirValue = Path.relative(tsConfigsDir, Path.resolve(pkg.realPath, rootDir)).replace(/\\/g, '/');
    const configJson: Tsconfig = {
      extends: Path.relative(tsConfigsDir, opts.jsx ? baseTsxConfigFile : baseConfigFile).replace(/\\/g, '/'),
      compilerOptions: {
        rootDir: rootDirValue,
        outDir: Path.relative(tsConfigsDir, Path.resolve(pkg.realPath, outDir)).replace(/\\/g, '/'),
        composite: true, // required by Project Reference
        declaration: true,
        importHelpers: false,
        skipLibCheck: true,
        sourceMap: true,
        inlineSources: true,
        inlineSourceMap: false,
        emitDeclarationOnly: opts.ed
      },
      exclude: []
    };

    if (entries && entries.length > 0) {
      configJson.files = entries.map(entry =>
          Path.relative(tsConfigsDir, Path.resolve(pkg.realPath, entry))
          .replace(/\\/g, '/')
        );
    } else {
      configJson.include = [rootDirValue + '/**/*.ts'];
      if (opts.jsx) {
        configJson.include!.push(rootDirValue + '/**/*.tsx');
      }
    }

    if (references) {
      configJson.references = references.map(refValue => {
        const refFile = tsconfigFileName4Ref(refValue);

        if (refFile == null)
          throw new Error(`Referenced package ${refValue} does not exist, referenced by ${pkg.name}`);

        return {path: refFile};
      });
    }

    setTsCompilerOptForNodePath(tsConfigsDir, './', configJson.compilerOptions, {
      enableTypeRoots: true,
      workspaceDir: Path.resolve(config().rootPath, wsKey!)
    });

    if (idx > 1) {
      if (configJson.references == null) {
        configJson.references = [];
      }
      configJson.references.push({path: fileNames[idx - 1]});
    }
    return configJson;
  }

  function walkReferencedPkg(pkg: string) {
    walked.add(pkg);
    const rawCfgs = getTscState().configs.get(pkg);
    if (rawCfgs == null) {
      log.warn(`Reference package "${pkg}" is not linked, skip it`);
      return;
    }
    for (const raw of rawCfgs) {
      if (raw.references && raw.references.length > 0) {
        for (const ref of raw.references) {
          if (!walked.has(ref)) {
            walkReferencedPkg(ref);
          }
        }
      }
    }
  }

  return merge(...done);
}

function tsconfigFileNames(packageName: string): string[] | null {
  const configs = getTscState().configs.get(packageName);
  if (configs == null) {
    return null;
  }
  const name = packageName.replace(/\//g, '-');
  return configs.map((_, index) => name + index + '.json');
}

function tsconfigFileName4Ref(packageName: string): string | null {
  const configs = getTscState().configs.get(packageName);
  if (configs == null) {
    return null;
  }
  const name = packageName.replace(/\//g, '-');
  return name + (configs.length - 1) + '.json';
}

