import Path from 'node:path';
import fs from 'node:fs';
import _ from 'lodash';
import {PackageInfo} from '../index';
import {CompilerOptions, CompilerOptionSetOpt} from './package-list-helper';

export interface PackageJsonInterf {
  version: string;
  name: string;
  workspaces?: string[];
  devDependencies?: {[nm: string]: string};
  peerDependencies?: {[nm: string]: string};
  dependencies?: {[nm: string]: string};
}
export type TsconfigType = {
  extends?: string;
  include?: string[];
  exclude?: string[];
  compilerOptions: {
    paths: Record<string, string[]>;
    [prop: string]: any;
  };
};
export function createPackageInfo(pkJsonFile: string, isInstalled = false): PackageInfo {
  const json = JSON.parse(fs.readFileSync(pkJsonFile, 'utf8')) as PackageInfo['json'];
  return createPackageInfoWithJson(pkJsonFile, json, isInstalled);
}
export function getTscConfigOfPkg(json: any) {
  // const globs: string[] | undefined = get(json, 'dr.ts.globs');
  const srcDir = _.get(json, 'dr.ts.src', _.get(json, 'plink.tsc.src', 'ts')) as string;
  const isomDir = _.get(json, 'dr.ts.isom', _.get(json, 'plink.tsc.isom', 'isom')) as string;
  const include = _.get(json, 'dr.ts.include', _.get(json, 'plink.tsc.include')) as string[] | undefined;
  const files = _.get(json, 'plink.tsc.files') as string[] | undefined;
  let destDir = _.get(json, 'dr.ts.dest', _.get(json, 'plink.tsc.dest', 'dist')) as string;

  destDir = _.trim(_.trim(destDir, '\\'), '/');
  return {
    srcDir, destDir, isomDir, include, files
  };
}

const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;

function createPackageInfoWithJson(pkJsonFile: string, json: PackageInfo['json'], isInstalled = false): PackageInfo {
  const m = moduleNameReg.exec(json.name);
  const path = fs.realpathSync(Path.dirname(pkJsonFile));
  const pkInfo: PackageInfo = {
    shortName: m![2],
    name: json.name,
    scope: m![1],
    path,
    json,
    realPath: path,
    isInstalled
  };
  return pkInfo;
}

export function* createTsConfigForRepos(
  plinkPkgDir: string,
  isPlinkLinked: boolean,
  workspaceDir: string,
  repoDirs: string[],
  plinkRootDir: string,
  srcRootDir: string,
  srcPackages: Map<string, PackageInfo>,
  typeRootPkgs: Iterable<PackageInfo>,
  extraPathMapping: {[path: string]: string[]},
  pathForInclude?: string[]
) {
  const baseTsConfigFile = Path.resolve(plinkPkgDir, 'wfh/tsconfig-base.json');

  for (const proj of repoDirs) {
    yield [
      Path.resolve(proj, 'tsconfig.json'), createTsConfigFile(proj, baseTsConfigFile, plinkPkgDir,
        isPlinkLinked, workspaceDir, plinkRootDir, srcPackages, srcRootDir,
        typeRootPkgs, extraPathMapping, pathForInclude)
    ] as const;
  }
}

export function createTsConfigFile(
  tsconfigBaseDir: string,
  extendTsConfigFile: string | null,
  plinkPkgDir: string,
  isPlinkLinked: boolean,
  workspaceDir: string,
  plinkRootDir: string,
  srcPackages: Map<string, PackageInfo>,
  srcRootDir: string,
  typeRootPkgs: Iterable<PackageInfo>,
  extraPathMapping: {[path: string]: string[]},
  pathForInclude: string[] = []
) {
  const tsjson: Partial<TsconfigType> = {
    extends: undefined,
    include: pathForInclude.flatMap(path => {
      const prefix = Path.relative(tsconfigBaseDir, path).replaceAll(/\\/g, '/');
      return ['/**/*.ts', '/**/*.mts', '/**/*.cts'].map(postFix => prefix + postFix);
    }),
    exclude: ['**/node_modules/**.*', '**/*.d.ts']
  };
  if (extendTsConfigFile) {
    tsjson.extends = Path.relative(tsconfigBaseDir, extendTsConfigFile);
    if (!Path.isAbsolute(tsjson.extends) && !tsjson.extends.startsWith('..')) {
      tsjson.extends = './' + tsjson.extends;
    }
    tsjson.extends = tsjson.extends.replace(/\\/g, '/');
  }

  const rootDir = Path.relative(tsconfigBaseDir, srcRootDir).replace(/\\/g, '/') || '.';
  tsjson.compilerOptions = {
    rootDir,
    skipLibCheck: false,
    jsx: 'preserve',
    target: 'es2017',
    // module: 'ESNext', // There is a problem with "NodeNext" with Typescript 5.3.3 and coc-tsserver, the "log4js.Logger" type being exported from @wfh/plink can not be recoganized by consumer TS file
    // moduleResolution: 'node10', // Same as above, "bunder" or "NodeNext" have problem along with "module" setting with "NodeNext"
    strict: true,
    declaration: false, // Important: to avoid https://github.com/microsoft/TypeScript/issues/29808#issuecomment-487811832
    paths: {...extraPathMapping}
  };
  setTsCompilerOpts(tsconfigBaseDir, tsjson.compilerOptions, plinkRootDir, workspaceDir, srcPackages,
    typeRootPkgs, isPlinkLinked ? plinkPkgDir : null, {
      enableTypeRoots: true,
      realPackagePaths: true
    });
  return tsjson as TsconfigType;
}

function setTsCompilerOpts(
  tsconfigDir: string,
  assigneeOptions: Partial<CompilerOptions>,
  plinkRootDir: string,
  workspaceDir: string,
  srcPackages: Map<string, PackageInfo>,
  spaceDependedPkgs: Iterable<PackageInfo>,
  plinkSourcePkgDir?: string | null,
  opts: Omit<CompilerOptionSetOpt, 'workspaceDir'> = {enableTypeRoots: false}
) {
  /** for paths mapping "*" */
  let pathsDirs: string[] = [];

  if (opts.realPackagePaths) {
    if (assigneeOptions.paths == null) {
      assigneeOptions.paths = {};
    }
    Object.assign(assigneeOptions.paths, pathMappingForLinkedPkgs(tsconfigDir, srcPackages, plinkSourcePkgDir ?? undefined));
  }

  const symlinksDir = Path.resolve(workspaceDir, 'node_modules');
  pathsDirs.push(symlinksDir);
  if (plinkSourcePkgDir) {
    pathsDirs.push(Path.join(plinkSourcePkgDir, 'node_modules'));
  }
  pathsDirs.push(Path.join(plinkRootDir, 'node_modules'));

  if (opts.extraNodePath && opts.extraNodePath.length > 0) {
    pathsDirs.push(...opts.extraNodePath);
  }

  pathsDirs = _.uniq(pathsDirs);

  if (opts.noSymlinks && symlinksDir) {
    const idx = pathsDirs.indexOf(symlinksDir);
    if (idx >= 0) {
      pathsDirs.splice(idx, 1);
    }
  }

  if (assigneeOptions.paths == null)
    assigneeOptions.paths = {};

  appendTypeRoots(pathsDirs, tsconfigDir, spaceDependedPkgs, assigneeOptions, opts);

  return assigneeOptions as CompilerOptions;
}

function pathMappingForLinkedPkgs(baseUrlAbsPath: string, srcPackages: Map<string, PackageInfo>, plinkSourcePkgDir?: string) {
  const pathMapping: {[key: string]: string[]} = {};

  for (const {name, realPath, json} of srcPackages.values()) {
    if (name === '@wfh/plink') {
      continue;
    }
    const tsDirs = getTscConfigOfPkg(json);
    let realDir = Path.relative(baseUrlAbsPath, realPath).replace(/\\/g, '/');
    const typeFile = json.types as string;
    const realDestDir = Path.posix.join(realDir, tsDirs.destDir);
    if (!realDir.startsWith('.')) {
      realDir = './' + realDir;
    }
    if (typeFile) {
      if (Path.posix.join(realDir, typeFile).startsWith(realDestDir + '/')) {
        // In case types file is inside compilation destination directory
        const relTypeFile = Path.basename(Path.posix.relative(tsDirs.destDir, typeFile), '.d.ts');
        let mapped = Path.join(realDir, tsDirs.srcDir, relTypeFile).replace(/\\/g, '/');
        if (!mapped.startsWith('.'))
          mapped = './' + mapped;
        pathMapping[name] = [mapped + '.ts', mapped + '.mts', mapped + '.cts'];
      } else {
        let mapped = typeFile ? Path.join(realDir, typeFile).replace(/\\/g, '/') : realDir;
        if (!mapped.startsWith('.'))
          mapped = './' + mapped;
        pathMapping[name] = [mapped];
      }
    }

    pathMapping[`${name}/${tsDirs.destDir}/*`.replace(/\/\//g, '/')] = [`${realDir}/${tsDirs.srcDir}/*`.replace(/\/\//g, '/')];
    pathMapping[name + '/*'] = [`${realDir}/*`];
  }

  if (plinkSourcePkgDir) {
    let drcpDir = Path.relative(baseUrlAbsPath, plinkSourcePkgDir).replace(/\\/g, '/');
    if (!drcpDir.startsWith('.'))
      drcpDir = './' + drcpDir;
    pathMapping['@wfh/plink'] = [drcpDir + '/wfh/src/index.ts'];
    pathMapping['@wfh/plink/wfh/dist/*'] = [drcpDir + '/wfh/src/*'];
  }
  return pathMapping;
}

function appendTypeRoots(
  pathsDirs: string[], tsconfigDir: string,
  spaceDependedPkgs: Iterable<PackageInfo>,
  assigneeOptions: Partial<CompilerOptions>,
  opts: Omit<CompilerOptionSetOpt, 'workspaceDir'>
) {
  if (opts.noTypeRootsInPackages == null || !opts.noTypeRootsInPackages) {
    if (assigneeOptions.typeRoots == null)
      assigneeOptions.typeRoots = [];
    assigneeOptions.typeRoots.push(
      // plink directory: wfh/types, it is a symlink at runtime, due to Plink uses preserve-symlinks to run commands
      Path.relative(tsconfigDir, Path.resolve(__dirname, '../../types')).replace(/\\/g, '/'),
      ...typeRootsInPackages(spaceDependedPkgs).map(dir => Path.relative(tsconfigDir, dir).replace(/\\/g, '/'))
    );
  }

  if (opts.enableTypeRoots ) {
    if (assigneeOptions.typeRoots == null)
      assigneeOptions.typeRoots = [];
    assigneeOptions.typeRoots.push(...pathsDirs.map(dir => {
      const relativeDir = Path.relative(tsconfigDir, dir).replace(/\\/g, '/');
      return relativeDir + '/@types';
    }));
  }

  if (opts.extraTypeRoot) {
    if (assigneeOptions.typeRoots == null)
      assigneeOptions.typeRoots = [];
    assigneeOptions.typeRoots.push(...opts.extraTypeRoot.map(
      dir => Path.relative(tsconfigDir, dir).replace(/\\/g, '/')));
  }

  assigneeOptions.typeRoots = _.uniq(assigneeOptions.typeRoots);
  if (assigneeOptions.typeRoots != null && assigneeOptions.typeRoots.length === 0)
    delete assigneeOptions.typeRoots;
}

function typeRootsInPackages(packagesMightHaveTypeRoot: Iterable<PackageInfo>) {
  const dirs: string[] = [];
  for (const pkg of packagesMightHaveTypeRoot) {
    const typeRoot = pkg.json.plink?.typeRoot || pkg.json.dr?.typeRoot;
    if (typeRoot) {
      const dir = Path.resolve(pkg.realPath, typeRoot);
      dirs.push(dir);
    }
  }
  return dirs;
}

