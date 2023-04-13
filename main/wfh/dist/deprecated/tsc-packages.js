"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTsconfigFiles = exports.tsc = void 0;
/**
 * Use Typescript "Project Reference" & "tsc -b Commandline" ability to compile multiple packages
 */
const fs_1 = __importDefault(require("fs"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const log4js_1 = __importDefault(require("log4js"));
const path_1 = __importDefault(require("path"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const config_1 = __importDefault(require("../config"));
const package_list_helper_1 = require("../package-mgr/package-list-helper");
const package_mgr_1 = require("../package-mgr");
const tsc_packages_slice_1 = require("./tsc-packages-slice");
const utils_1 = require("../cmd/utils");
const package_list_helper_2 = require("../package-mgr/package-list-helper");
const child_process_1 = require("child_process");
const misc_1 = require("../utils/misc");
const log = log4js_1.default.getLogger('plink.tsc-packages');
function tsc(opts) {
    if (opts.package) {
        const pkgs = (0, utils_1.findPackagesByNames)((0, package_mgr_1.getState)(), opts.package);
        const tsconfigFile$ = generateTsconfigFiles(Array.from(pkgs).filter(pkg => pkg != null)
            .map(pkg => pkg.name), opts);
        return tsconfigFile$.pipe((0, operators_1.reduce)((all, tsconfigFile) => {
            all.push(tsconfigFile);
            return all;
        }, []), (0, operators_1.filter)(files => files.length > 0), (0, operators_1.concatMap)(files => {
            const env = process.env;
            delete env.NODE_OPTIONS;
            const arg = ['-b', ...files, '-v'];
            if (opts.watch)
                arg.push('-w');
            log.info('tsc ' + arg.join(' '));
            const cp = (0, child_process_1.fork)(require.resolve('typescript/lib/tsc.js'), arg, { env });
            return new rxjs_1.Observable(sub => {
                cp.on('exit', (code, signal) => {
                    log.info(code + ' ' + signal);
                    sub.next();
                    sub.complete();
                });
                cp.on('error', err => sub.error(err));
            });
        }));
    }
    else if (opts.project) {
        (0, package_list_helper_2.allPackages)('*', 'src', opts.project);
    }
    return rxjs_1.EMPTY;
}
exports.tsc = tsc;
function generateTsconfigFiles(pkgs, opts) {
    let wsKey = (0, package_mgr_1.workspaceKey)(misc_1.plinkEnv.workDir);
    const walked = new Set();
    for (const pkg of pkgs) {
        walkReferencedPkg(pkg);
    }
    if (!(0, package_mgr_1.getState)().workspaces.has(wsKey))
        wsKey = (0, package_mgr_1.getState)().currWorkspace;
    if (wsKey == null) {
        throw new Error('Current directory is not a work space');
    }
    const tsConfigsDir = config_1.default.resolve('destDir', 'tsconfigs');
    fs_extra_1.default.mkdirpSync(tsConfigsDir);
    // const files = fs.readdirSync(tsConfigsDir);
    // console.log(files);
    const baseConfigFile = path_1.default.resolve(__dirname, '..', '..', 'tsconfig-base.json');
    const baseTsxConfigFile = path_1.default.resolve(__dirname, '..', '..', 'tsconfig-tsx.json');
    const done = Array.from(walked.values())
        .map(pkg => {
        const rawConfigs = (0, tsc_packages_slice_1.getState)().configs.get(pkg);
        if (rawConfigs == null) {
            throw new Error(`Package ${pkg} does not exist.`);
        }
        const tsconfigFiles = tsconfigFileNames(pkg);
        const works = rawConfigs
            .map((raw, idx) => {
            return new rxjs_1.Observable(sub => {
                const tsconfig = createTsconfigs((0, package_mgr_1.getState)().srcPackages.get(pkg), tsconfigFiles, idx, raw.rootDir, raw.outDir, raw.files, raw.references);
                const toWrite = path_1.default.resolve(tsConfigsDir, tsconfigFiles[idx]);
                fs_1.default.writeFile(toWrite, JSON.stringify(tsconfig, null, '  '), (err) => {
                    if (err) {
                        return sub.error();
                    }
                    log.info(`Write ${toWrite}`);
                    sub.next(toWrite);
                    sub.complete();
                });
            });
        });
        return (0, rxjs_1.merge)(...works);
    });
    function createTsconfigs(pkg, fileNames, idx, rootDir, outDir, entries, references) {
        const rootDirValue = path_1.default.relative(tsConfigsDir, path_1.default.resolve(pkg.realPath, rootDir)).replace(/\\/g, '/');
        const configJson = {
            extends: path_1.default.relative(tsConfigsDir, opts.jsx ? baseTsxConfigFile : baseConfigFile).replace(/\\/g, '/'),
            compilerOptions: {
                rootDir: rootDirValue,
                outDir: path_1.default.relative(tsConfigsDir, path_1.default.resolve(pkg.realPath, outDir)).replace(/\\/g, '/'),
                composite: true,
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
            configJson.files = entries.map(entry => path_1.default.relative(tsConfigsDir, path_1.default.resolve(pkg.realPath, entry))
                .replace(/\\/g, '/'));
        }
        else {
            configJson.include = [rootDirValue + '/**/*.ts'];
            if (opts.jsx) {
                configJson.include.push(rootDirValue + '/**/*.tsx');
            }
        }
        if (references) {
            configJson.references = references.map(refValue => {
                const refFile = tsconfigFileName4Ref(refValue);
                if (refFile == null)
                    throw new Error(`Referenced package ${refValue} does not exist, referenced by ${pkg.name}`);
                return { path: refFile };
            });
        }
        (0, package_list_helper_1.setTsCompilerOptForNodePath)(tsConfigsDir, './', configJson.compilerOptions, {
            enableTypeRoots: true,
            workspaceDir: path_1.default.resolve((0, config_1.default)().rootPath, wsKey)
        });
        if (idx > 1) {
            if (configJson.references == null) {
                configJson.references = [];
            }
            configJson.references.push({ path: fileNames[idx - 1] });
        }
        return configJson;
    }
    function walkReferencedPkg(pkg) {
        walked.add(pkg);
        const rawCfgs = (0, tsc_packages_slice_1.getState)().configs.get(pkg);
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
    return (0, rxjs_1.merge)(...done);
}
exports.generateTsconfigFiles = generateTsconfigFiles;
function tsconfigFileNames(packageName) {
    const configs = (0, tsc_packages_slice_1.getState)().configs.get(packageName);
    if (configs == null) {
        return null;
    }
    const name = packageName.replace(/\//g, '-');
    return configs.map((_, index) => name + index + '.json');
}
function tsconfigFileName4Ref(packageName) {
    const configs = (0, tsc_packages_slice_1.getState)().configs.get(packageName);
    if (configs == null) {
        return null;
    }
    const name = packageName.replace(/\//g, '-');
    return name + (configs.length - 1) + '.json';
}
//# sourceMappingURL=tsc-packages.js.map