"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNpmPackOutput = exports.publish = exports.pack = void 0;
const promise_queque_1 = require("../utils/promise-queque");
const _ = __importStar(require("lodash"));
const fs = __importStar(require("fs-extra"));
const Path = __importStar(require("path"));
const process_utils_1 = require("../process-utils");
// import {boxString} from './utils';
// import * as recipeManager from './recipe-manager';
const json_sync_parser_1 = __importDefault(require("../utils/json-sync-parser"));
const patch_text_1 = __importDefault(require("require-injector/dist/patch-text"));
const config_1 = __importDefault(require("../config"));
const log_config_1 = __importDefault(require("../log-config"));
const package_mgr_1 = require("../package-mgr");
const package_list_helper_1 = require("../package-mgr/package-list-helper");
const log4js_1 = __importDefault(require("log4js"));
const utils_1 = require("./utils");
// import * as packageUtils from './package-utils';
// const recipeManager = require('../lib/gulp/recipeManager');
const log = log4js_1.default.getLogger('cli-pack');
// const namePat = /name:\s+([^ \n\r]+)/mi;
// const fileNamePat = /filename:\s+([^ \n\r]+)/mi;
function pack(opts) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(opts);
        log_config_1.default(config_1.default());
        fs.mkdirpSync('tarballs');
        if (opts.workspace && opts.workspace.length > 0) {
            yield Promise.all(opts.workspace.map(ws => packPackages(Array.from(linkedPackagesOfWorkspace(ws)))));
        }
        else if (opts.project && opts.project.length > 0) {
            return packProject(opts.project);
        }
        else if (opts.dir && opts.dir.length > 0) {
            yield packPackages(opts.dir);
        }
        else if (opts.packages && opts.packages.length > 0) {
            const dirs = Array.from(utils_1.findPackagesByNames(package_mgr_1.getState(), opts.packages))
                .filter(pkg => pkg)
                .map(pkg => pkg.realPath);
            yield packPackages(dirs);
        }
        else {
            yield packPackages(Array.from(linkedPackagesOfWorkspace(process.cwd())));
        }
    });
}
exports.pack = pack;
function publish(opts) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(opts);
        log_config_1.default(config_1.default());
        fs.mkdirpSync('tarballs');
        if (opts.project && opts.project.length > 0)
            return publishProject(opts.project, opts.public ? ['--access', 'public'] : []);
        else if (opts.dir && opts.dir.length > 0) {
            yield publishPackages(opts.dir, opts.public ? ['--access', 'public'] : []);
        }
        else if (opts.packages && opts.packages.length > 0) {
            const dirs = Array.from(utils_1.findPackagesByNames(package_mgr_1.getState(), opts.packages))
                .filter(pkg => pkg)
                .map(pkg => pkg.realPath);
            yield publishPackages(dirs, opts.public ? ['--access', 'public'] : []);
        }
        else {
            yield publishPackages(Array.from(linkedPackagesOfWorkspace(process.cwd())), opts.public ? ['--access', 'public'] : []);
        }
    });
}
exports.publish = publish;
function* linkedPackagesOfWorkspace(workspaceDir) {
    const wsKey = package_mgr_1.workspaceKey(workspaceDir);
    if (!package_mgr_1.getState().workspaces.has(wsKey)) {
        log.error(`Workspace ${workspaceDir} is not a workspace directory`);
        return;
    }
    for (const pkg of package_list_helper_1.packages4WorkspaceKey(wsKey)) {
        yield pkg.realPath;
    }
}
function packPackages(packageDirs) {
    return __awaiter(this, void 0, void 0, function* () {
        const package2tarball = new Map();
        if (packageDirs && packageDirs.length > 0) {
            const pgPaths = packageDirs;
            const done = promise_queque_1.queueUp(3, pgPaths.map(packageDir => () => npmPack(packageDir)));
            let tarInfos = yield done;
            tarInfos = tarInfos.filter(item => item != null);
            const rootPath = config_1.default().rootPath;
            for (const item of tarInfos) {
                package2tarball.set(item.name, Path.resolve(rootPath, 'tarballs', item.filename));
            }
            // log.info(Array.from(package2tarball.entries())
            //   .map(([pkName, ver]) => `"${pkName}": "${ver}",`)
            //   .join('\n'));
            yield deleteOldTar(tarInfos.map(item => item.name.replace('@', '').replace(/[/\\]/g, '-')), tarInfos.map(item => item.filename));
            changePackageJson(package2tarball);
        }
    });
}
function packProject(projectDirs) {
    return __awaiter(this, void 0, void 0, function* () {
        const dirs = [];
        for (const pkg of package_mgr_1.getPackagesOfProjects(projectDirs)) {
            dirs.push(pkg.realPath);
        }
        yield packPackages(dirs);
    });
}
function publishPackages(packageDirs, npmCliOpts) {
    return __awaiter(this, void 0, void 0, function* () {
        if (packageDirs && packageDirs.length > 0) {
            const pgPaths = packageDirs;
            yield promise_queque_1.queueUp(3, pgPaths.map(packageDir => () => __awaiter(this, void 0, void 0, function* () {
                try {
                    log.info(`publishing ${packageDir}`);
                    const params = ['publish', ...npmCliOpts, { silent: true, cwd: packageDir }];
                    const output = yield process_utils_1.promisifyExe('npm', ...params);
                    log.info(output);
                }
                catch (e) {
                    log.error(e);
                }
            })));
        }
    });
}
function publishProject(projectDirs, npmCliOpts) {
    return __awaiter(this, void 0, void 0, function* () {
        const dirs = [];
        for (const pkg of package_mgr_1.getPackagesOfProjects(projectDirs)) {
            dirs.push(pkg.realPath);
        }
        yield publishPackages(dirs, npmCliOpts);
    });
}
function npmPack(packagePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const output = yield process_utils_1.promisifyExe('npm', 'pack', Path.resolve(packagePath), { silent: true, cwd: Path.resolve(config_1.default().rootPath, 'tarballs') });
            const resultInfo = parseNpmPackOutput(output);
            const packageName = resultInfo.get('name');
            // cb(packageName, resultInfo.get('filename')!);
            log.info(output);
            return {
                name: packageName,
                filename: resultInfo.get('filename')
            };
        }
        catch (e) {
            handleExption(packagePath, e);
            return null;
        }
    });
}
function changePackageJson(package2tarball) {
    for (const workspace of package_mgr_1.getState().workspaces.keys()) {
        const wsDir = Path.resolve(config_1.default().rootPath, workspace);
        const jsonFile = Path.resolve(wsDir, 'package.json');
        const pkj = fs.readFileSync(jsonFile, 'utf8');
        const ast = json_sync_parser_1.default(pkj);
        const depsAst = ast.properties.find(({ name }) => JSON.parse(name.text) === 'dependencies');
        const devDepsAst = ast.properties.find(({ name }) => JSON.parse(name.text) === 'devDependencies');
        const replacements = [];
        if (depsAst) {
            changeDependencies(depsAst.value);
        }
        if (devDepsAst) {
            changeDependencies(devDepsAst.value);
        }
        if (replacements.length > 0) {
            const replaced = patch_text_1.default(pkj, replacements);
            // tslint:disable-next-line: no-console
            log.info('Updated package.json\n', replaced);
            fs.writeFileSync(jsonFile, replaced);
        }
        function changeDependencies(deps) {
            const foundDeps = deps.properties.filter(({ name }) => package2tarball.has(JSON.parse(name.text)));
            for (const foundDep of foundDeps) {
                const verToken = foundDep.value;
                const tarFile = package2tarball.get(JSON.parse(foundDep.name.text));
                let newVersion = Path.relative(wsDir, tarFile).replace(/\\/g, '/');
                if (!newVersion.startsWith('.')) {
                    newVersion = './' + newVersion;
                }
                log.info(`Update ${jsonFile}: ${verToken.text} => ${newVersion}`);
                replacements.push({
                    start: verToken.pos,
                    end: verToken.end,
                    text: JSON.stringify(newVersion)
                });
            }
        }
    }
}
function handleExption(packagePath, e) {
    if (e && e.message && e.message.indexOf('EPUBLISHCONFLICT') > 0)
        log.info(`npm pack ${packagePath}: EPUBLISHCONFLICT.`);
    else
        log.error(packagePath, e);
}
/**
 *
 * @param output
 * e.g.
npm notice === Tarball Details ===
npm notice name:          require-injector
npm notice version:       5.1.5
npm notice filename:      require-injector-5.1.5.tgz
npm notice package size:  56.9 kB
npm notice unpacked size: 229.1 kB
npm notice shasum:        c0693270c140f65a696207ab9deb18e64452a02c
npm notice integrity:     sha512-kRGVWcw1fvQ5J[...]ABwLPU8UvStbA==
npm notice total files:   47
npm notice

 */
function parseNpmPackOutput(output) {
    const lines = output.split(/\r?\n/);
    const linesOffset = _.findLastIndex(lines, line => line.indexOf('Tarball Details') >= 0);
    const tarballInfo = new Map();
    lines.slice(linesOffset).forEach(line => {
        const match = /npm notice\s+([^:]+)[:]\s*(.+?)\s*$/.exec(line);
        if (!match)
            return null;
        return tarballInfo.set(match[1], match[2]);
    });
    return tarballInfo;
}
exports.parseNpmPackOutput = parseNpmPackOutput;
function deleteOldTar(deleteFilePrefix, keepfiles) {
    const tarSet = new Set(keepfiles);
    const deleteDone = [];
    if (!fs.existsSync(config_1.default.resolve('rootPath', 'tarballs')))
        fs.mkdirpSync(config_1.default.resolve('rootPath', 'tarballs'));
    // TODO: wait for timeout
    for (const file of fs.readdirSync('tarballs')) {
        if (!tarSet.has(file) && deleteFilePrefix.some(prefix => file.startsWith(prefix))) {
            deleteDone.push(fs.remove(Path.resolve('tarballs', file)));
        }
    }
    return Promise.all(deleteDone);
    // log.info('You may delete old version tar file by execute commands:\n' + cmd);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXBhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXBhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDREQUFnRDtBQUNoRCwwQ0FBNEI7QUFDNUIsNkNBQStCO0FBQy9CLDJDQUE2QjtBQUM3QixvREFBOEM7QUFDOUMscUNBQXFDO0FBQ3JDLHFEQUFxRDtBQUNyRCxpRkFBdUU7QUFDdkUsa0ZBQTZFO0FBQzdFLHVEQUErQjtBQUUvQiwrREFBc0M7QUFDdEMsZ0RBQTZFO0FBQzdFLDRFQUF5RTtBQUN6RSxvREFBNEI7QUFDNUIsbUNBQTRDO0FBQzVDLG1EQUFtRDtBQUNuRCw4REFBOEQ7QUFDOUQsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDekMsMkNBQTJDO0FBQzNDLG1EQUFtRDtBQUVuRCxTQUFzQixJQUFJLENBQUMsSUFBaUI7O1FBQzFDLE1BQU0sZ0JBQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEIsb0JBQVMsQ0FBQyxnQkFBTSxFQUFFLENBQUMsQ0FBQztRQUVwQixFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRTFCLElBQUksSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDL0MsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN0RzthQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxD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bSAnLi4vdXRpbHMvcHJvbWlzZS1xdWVxdWUnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7cHJvbWlzaWZ5RXhlfSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcbi8vIGltcG9ydCB7Ym94U3RyaW5nfSBmcm9tICcuL3V0aWxzJztcbi8vIGltcG9ydCAqIGFzIHJlY2lwZU1hbmFnZXIgZnJvbSAnLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQganNvblBhcnNlciwge09iamVjdEFzdCwgVG9rZW59IGZyb20gJy4uL3V0aWxzL2pzb24tc3luYy1wYXJzZXInO1xuaW1wb3J0IHJlcGxhY2VDb2RlLCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9wYXRjaC10ZXh0JztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7UGFja09wdGlvbnMsIFB1Ymxpc2hPcHRpb25zfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCBsb2dDb25maWcgZnJvbSAnLi4vbG9nLWNvbmZpZyc7XG5pbXBvcnQge2dldFBhY2thZ2VzT2ZQcm9qZWN0cywgZ2V0U3RhdGUsIHdvcmtzcGFjZUtleX0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtwYWNrYWdlczRXb3Jrc3BhY2VLZXl9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL3V0aWxzJztcbi8vIGltcG9ydCAqIGFzIHBhY2thZ2VVdGlscyBmcm9tICcuL3BhY2thZ2UtdXRpbHMnO1xuLy8gY29uc3QgcmVjaXBlTWFuYWdlciA9IHJlcXVpcmUoJy4uL2xpYi9ndWxwL3JlY2lwZU1hbmFnZXInKTtcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ2NsaS1wYWNrJyk7XG4vLyBjb25zdCBuYW1lUGF0ID0gL25hbWU6XFxzKyhbXiBcXG5cXHJdKykvbWk7XG4vLyBjb25zdCBmaWxlTmFtZVBhdCA9IC9maWxlbmFtZTpcXHMrKFteIFxcblxccl0rKS9taTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBhY2sob3B0czogUGFja09wdGlvbnMpIHtcbiAgYXdhaXQgY29uZmlnLmluaXQob3B0cyk7XG4gIGxvZ0NvbmZpZyhjb25maWcoKSk7XG5cbiAgZnMubWtkaXJwU3luYygndGFyYmFsbHMnKTtcblxuICBpZiAob3B0cy53b3Jrc3BhY2UgJiYgb3B0cy53b3Jrc3BhY2UubGVuZ3RoID4gMCkge1xuICAgIGF3YWl0IFByb21pc2UuYWxsKG9wdHMud29ya3NwYWNlLm1hcCh3cyA9PiBwYWNrUGFja2FnZXMoQXJyYXkuZnJvbShsaW5rZWRQYWNrYWdlc09mV29ya3NwYWNlKHdzKSkpKSk7XG4gIH0gZWxzZSBpZiAob3B0cy5wcm9qZWN0ICYmIG9wdHMucHJvamVjdC5sZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIHBhY2tQcm9qZWN0KG9wdHMucHJvamVjdCk7XG4gIH0gZWxzZSBpZiAob3B0cy5kaXIgJiYgb3B0cy5kaXIubGVuZ3RoID4gMCkge1xuICAgIGF3YWl0IHBhY2tQYWNrYWdlcyhvcHRzLmRpcik7XG4gIH0gZWxzZSBpZiAob3B0cy5wYWNrYWdlcyAmJiBvcHRzLnBhY2thZ2VzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBkaXJzID0gQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKGdldFN0YXRlKCksIG9wdHMucGFja2FnZXMpKVxuICAgIC5maWx0ZXIocGtnID0+IHBrZylcbiAgICAubWFwKHBrZyA9PiBwa2chLnJlYWxQYXRoKTtcbiAgICBhd2FpdCBwYWNrUGFja2FnZXMoZGlycyk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgcGFja1BhY2thZ2VzKEFycmF5LmZyb20obGlua2VkUGFja2FnZXNPZldvcmtzcGFjZShwcm9jZXNzLmN3ZCgpKSkpO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwdWJsaXNoKG9wdHM6IFB1Ymxpc2hPcHRpb25zKSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KG9wdHMpO1xuICBsb2dDb25maWcoY29uZmlnKCkpO1xuXG4gIGZzLm1rZGlycFN5bmMoJ3RhcmJhbGxzJyk7XG5cbiAgaWYgKG9wdHMucHJvamVjdCAmJiBvcHRzLnByb2plY3QubGVuZ3RoID4gMClcbiAgICByZXR1cm4gcHVibGlzaFByb2plY3Qob3B0cy5wcm9qZWN0LCBvcHRzLnB1YmxpYyA/IFsnLS1hY2Nlc3MnLCAncHVibGljJ10gOiBbXSk7XG4gIGVsc2UgaWYgKG9wdHMuZGlyICYmIG9wdHMuZGlyLmxlbmd0aCA+IDApIHtcbiAgICBhd2FpdCBwdWJsaXNoUGFja2FnZXMob3B0cy5kaXIsIG9wdHMucHVibGljID8gWyctLWFjY2VzcycsICdwdWJsaWMnXSA6IFtdKTtcbiAgfSBlbHNlIGlmIChvcHRzLnBhY2thZ2VzICYmIG9wdHMucGFja2FnZXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGRpcnMgPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoZ2V0U3RhdGUoKSwgb3B0cy5wYWNrYWdlcykpXG4gICAgLmZpbHRlcihwa2cgPT4gcGtnKVxuICAgIC5tYXAocGtnID0+IHBrZyEucmVhbFBhdGgpO1xuICAgIGF3YWl0IHB1Ymxpc2hQYWNrYWdlcyhkaXJzLCBvcHRzLnB1YmxpYyA/IFsnLS1hY2Nlc3MnLCAncHVibGljJ10gOiBbXSk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgcHVibGlzaFBhY2thZ2VzKEFycmF5LmZyb20obGlua2VkUGFja2FnZXNPZldvcmtzcGFjZShwcm9jZXNzLmN3ZCgpKSksXG4gICAgICBvcHRzLnB1YmxpYyA/IFsnLS1hY2Nlc3MnLCAncHVibGljJ10gOiBbXSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gKmxpbmtlZFBhY2thZ2VzT2ZXb3Jrc3BhY2Uod29ya3NwYWNlRGlyOiBzdHJpbmcpIHtcbiAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkod29ya3NwYWNlRGlyKTtcbiAgaWYgKCFnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSkge1xuICAgIGxvZy5lcnJvcihgV29ya3NwYWNlICR7d29ya3NwYWNlRGlyfSBpcyBub3QgYSB3b3Jrc3BhY2UgZGlyZWN0b3J5YCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleSkpIHtcbiAgICB5aWVsZCBwa2cucmVhbFBhdGg7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcGFja1BhY2thZ2VzKHBhY2thZ2VEaXJzOiBzdHJpbmdbXSkge1xuICBjb25zdCBwYWNrYWdlMnRhcmJhbGwgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBpZiAocGFja2FnZURpcnMgJiYgcGFja2FnZURpcnMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHBnUGF0aHM6IHN0cmluZ1tdID0gcGFja2FnZURpcnM7XG5cbiAgICBjb25zdCBkb25lID0gcXVldWVVcCgzLCBwZ1BhdGhzLm1hcChwYWNrYWdlRGlyID0+ICgpID0+IG5wbVBhY2socGFja2FnZURpcikpKTtcbiAgICBsZXQgdGFySW5mb3MgPSBhd2FpdCBkb25lO1xuXG4gICAgdGFySW5mb3MgPSB0YXJJbmZvcy5maWx0ZXIoaXRlbSA9PiBpdGVtICE9IG51bGwpO1xuICAgIGNvbnN0IHJvb3RQYXRoID0gY29uZmlnKCkucm9vdFBhdGg7XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHRhckluZm9zKSB7XG4gICAgICBwYWNrYWdlMnRhcmJhbGwuc2V0KGl0ZW0hLm5hbWUsIFBhdGgucmVzb2x2ZShyb290UGF0aCwgJ3RhcmJhbGxzJywgaXRlbSEuZmlsZW5hbWUpKTtcbiAgICB9XG4gICAgLy8gbG9nLmluZm8oQXJyYXkuZnJvbShwYWNrYWdlMnRhcmJhbGwuZW50cmllcygpKVxuICAgIC8vICAgLm1hcCgoW3BrTmFtZSwgdmVyXSkgPT4gYFwiJHtwa05hbWV9XCI6IFwiJHt2ZXJ9XCIsYClcbiAgICAvLyAgIC5qb2luKCdcXG4nKSk7XG4gICAgYXdhaXQgZGVsZXRlT2xkVGFyKHRhckluZm9zLm1hcChpdGVtID0+IGl0ZW0hLm5hbWUucmVwbGFjZSgnQCcsICcnKS5yZXBsYWNlKC9bL1xcXFxdL2csICctJykpLFxuICAgICAgdGFySW5mb3MubWFwKGl0ZW0gPT4gaXRlbSEuZmlsZW5hbWUpKTtcbiAgICBjaGFuZ2VQYWNrYWdlSnNvbihwYWNrYWdlMnRhcmJhbGwpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHBhY2tQcm9qZWN0KHByb2plY3REaXJzOiBzdHJpbmdbXSkge1xuICBjb25zdCBkaXJzID0gW10gYXMgc3RyaW5nW107XG4gIGZvciAoY29uc3QgcGtnIG9mIGdldFBhY2thZ2VzT2ZQcm9qZWN0cyhwcm9qZWN0RGlycykpIHtcbiAgICBkaXJzLnB1c2gocGtnLnJlYWxQYXRoKTtcbiAgfVxuICBhd2FpdCBwYWNrUGFja2FnZXMoZGlycyk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHB1Ymxpc2hQYWNrYWdlcyhwYWNrYWdlRGlyczogc3RyaW5nW10sIG5wbUNsaU9wdHM6IHN0cmluZ1tdKSB7XG4gIGlmIChwYWNrYWdlRGlycyAmJiBwYWNrYWdlRGlycy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgcGdQYXRoczogc3RyaW5nW10gPSBwYWNrYWdlRGlycztcblxuICAgIGF3YWl0IHF1ZXVlVXAoMywgcGdQYXRocy5tYXAocGFja2FnZURpciA9PiBhc3luYyAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBsb2cuaW5mbyhgcHVibGlzaGluZyAke3BhY2thZ2VEaXJ9YCk7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IFsncHVibGlzaCcsIC4uLm5wbUNsaU9wdHMsIHtzaWxlbnQ6IHRydWUsIGN3ZDogcGFja2FnZURpcn1dO1xuICAgICAgICBjb25zdCBvdXRwdXQgPSBhd2FpdCBwcm9taXNpZnlFeGUoJ25wbScsIC4uLnBhcmFtcyk7XG4gICAgICAgIGxvZy5pbmZvKG91dHB1dCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZy5lcnJvcihlKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcHVibGlzaFByb2plY3QocHJvamVjdERpcnM6IHN0cmluZ1tdLCBucG1DbGlPcHRzOiBzdHJpbmdbXSkge1xuICBjb25zdCBkaXJzID0gW10gYXMgc3RyaW5nW107XG4gIGZvciAoY29uc3QgcGtnIG9mIGdldFBhY2thZ2VzT2ZQcm9qZWN0cyhwcm9qZWN0RGlycykpIHtcbiAgICBkaXJzLnB1c2gocGtnLnJlYWxQYXRoKTtcbiAgfVxuICBhd2FpdCBwdWJsaXNoUGFja2FnZXMoZGlycywgbnBtQ2xpT3B0cyk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG5wbVBhY2socGFja2FnZVBhdGg6IHN0cmluZyk6XG4gIFByb21pc2U8e25hbWU6IHN0cmluZywgZmlsZW5hbWU6IHN0cmluZ30gfCBudWxsPiB7XG4gIHRyeSB7XG4gICAgY29uc3Qgb3V0cHV0ID0gYXdhaXQgcHJvbWlzaWZ5RXhlKCducG0nLCAncGFjaycsIFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCksXG4gICAgICB7c2lsZW50OiB0cnVlLCBjd2Q6IFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgJ3RhcmJhbGxzJyl9KTtcbiAgICBjb25zdCByZXN1bHRJbmZvID0gcGFyc2VOcG1QYWNrT3V0cHV0KG91dHB1dCk7XG5cbiAgICBjb25zdCBwYWNrYWdlTmFtZSA9IHJlc3VsdEluZm8uZ2V0KCduYW1lJykhO1xuICAgIC8vIGNiKHBhY2thZ2VOYW1lLCByZXN1bHRJbmZvLmdldCgnZmlsZW5hbWUnKSEpO1xuICAgIGxvZy5pbmZvKG91dHB1dCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IHBhY2thZ2VOYW1lLFxuICAgICAgZmlsZW5hbWU6IHJlc3VsdEluZm8uZ2V0KCdmaWxlbmFtZScpIVxuICAgIH07XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBoYW5kbGVFeHB0aW9uKHBhY2thZ2VQYXRoLCBlKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBjaGFuZ2VQYWNrYWdlSnNvbihwYWNrYWdlMnRhcmJhbGw6IE1hcDxzdHJpbmcsIHN0cmluZz4pIHtcblxuICBmb3IgKGNvbnN0IHdvcmtzcGFjZSBvZiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKSB7XG4gICAgY29uc3Qgd3NEaXIgPSBQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgsIHdvcmtzcGFjZSk7XG4gICAgY29uc3QganNvbkZpbGUgPSBQYXRoLnJlc29sdmUod3NEaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICBjb25zdCBwa2ogPSBmcy5yZWFkRmlsZVN5bmMoanNvbkZpbGUsICd1dGY4Jyk7XG4gICAgY29uc3QgYXN0ID0ganNvblBhcnNlcihwa2opO1xuICAgIGNvbnN0IGRlcHNBc3QgPSBhc3QucHJvcGVydGllcy5maW5kKCh7bmFtZX0pID0+IEpTT04ucGFyc2UobmFtZS50ZXh0KSA9PT0gJ2RlcGVuZGVuY2llcycpO1xuICAgIGNvbnN0IGRldkRlcHNBc3QgPSBhc3QucHJvcGVydGllcy5maW5kKCh7bmFtZX0pID0+IEpTT04ucGFyc2UobmFtZS50ZXh0KSA9PT0gJ2RldkRlcGVuZGVuY2llcycpO1xuICAgIGNvbnN0IHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuICAgIGlmIChkZXBzQXN0KSB7XG4gICAgICBjaGFuZ2VEZXBlbmRlbmNpZXMoZGVwc0FzdC52YWx1ZSBhcyBPYmplY3RBc3QpO1xuICAgIH1cbiAgICBpZiAoZGV2RGVwc0FzdCkge1xuICAgICAgY2hhbmdlRGVwZW5kZW5jaWVzKGRldkRlcHNBc3QudmFsdWUgYXMgT2JqZWN0QXN0KTtcbiAgICB9XG5cbiAgICBpZiAocmVwbGFjZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IHJlcGxhY2VkID0gcmVwbGFjZUNvZGUocGtqLCByZXBsYWNlbWVudHMpO1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBsb2cuaW5mbygnVXBkYXRlZCBwYWNrYWdlLmpzb25cXG4nLCByZXBsYWNlZCk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKGpzb25GaWxlLCByZXBsYWNlZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hhbmdlRGVwZW5kZW5jaWVzKGRlcHM6IE9iamVjdEFzdCkge1xuICAgICAgY29uc3QgZm91bmREZXBzID0gZGVwcy5wcm9wZXJ0aWVzLmZpbHRlcigoe25hbWV9KSA9PiBwYWNrYWdlMnRhcmJhbGwuaGFzKEpTT04ucGFyc2UobmFtZS50ZXh0KSkpO1xuICAgICAgZm9yIChjb25zdCBmb3VuZERlcCBvZiBmb3VuZERlcHMpIHtcbiAgICAgICAgY29uc3QgdmVyVG9rZW4gPSBmb3VuZERlcC52YWx1ZSBhcyBUb2tlbjtcbiAgICAgICAgY29uc3QgdGFyRmlsZSA9IHBhY2thZ2UydGFyYmFsbC5nZXQoSlNPTi5wYXJzZShmb3VuZERlcC5uYW1lLnRleHQpKTtcbiAgICAgICAgbGV0IG5ld1ZlcnNpb24gPSBQYXRoLnJlbGF0aXZlKHdzRGlyLCB0YXJGaWxlISkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBpZiAoIW5ld1ZlcnNpb24uc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICAgICAgbmV3VmVyc2lvbiA9ICcuLycgKyBuZXdWZXJzaW9uO1xuICAgICAgICB9XG4gICAgICAgIGxvZy5pbmZvKGBVcGRhdGUgJHtqc29uRmlsZX06ICR7dmVyVG9rZW4udGV4dH0gPT4gJHtuZXdWZXJzaW9ufWApO1xuICAgICAgICByZXBsYWNlbWVudHMucHVzaCh7XG4gICAgICAgICAgc3RhcnQ6IHZlclRva2VuLnBvcyxcbiAgICAgICAgICBlbmQ6IHZlclRva2VuLmVuZCEsXG4gICAgICAgICAgdGV4dDogSlNPTi5zdHJpbmdpZnkobmV3VmVyc2lvbilcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUV4cHRpb24ocGFja2FnZVBhdGg6IHN0cmluZywgZTogRXJyb3IpIHtcbiAgaWYgKGUgJiYgZS5tZXNzYWdlICYmIGUubWVzc2FnZS5pbmRleE9mKCdFUFVCTElTSENPTkZMSUNUJykgPiAwKVxuICAgIGxvZy5pbmZvKGBucG0gcGFjayAke3BhY2thZ2VQYXRofTogRVBVQkxJU0hDT05GTElDVC5gKTtcbiAgZWxzZVxuICAgIGxvZy5lcnJvcihwYWNrYWdlUGF0aCwgZSk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gb3V0cHV0IFxuICogZS5nLlxubnBtIG5vdGljZSA9PT0gVGFyYmFsbCBEZXRhaWxzID09PSBcbm5wbSBub3RpY2UgbmFtZTogICAgICAgICAgcmVxdWlyZS1pbmplY3RvciAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSB2ZXJzaW9uOiAgICAgICA1LjEuNSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIGZpbGVuYW1lOiAgICAgIHJlcXVpcmUtaW5qZWN0b3ItNS4xLjUudGd6ICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgcGFja2FnZSBzaXplOiAgNTYuOSBrQiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSB1bnBhY2tlZCBzaXplOiAyMjkuMSBrQiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHNoYXN1bTogICAgICAgIGMwNjkzMjcwYzE0MGY2NWE2OTYyMDdhYjlkZWIxOGU2NDQ1MmEwMmNcbm5wbSBub3RpY2UgaW50ZWdyaXR5OiAgICAgc2hhNTEyLWtSR1ZXY3cxZnZRNUpbLi4uXUFCd0xQVThVdlN0YkE9PVxubnBtIG5vdGljZSB0b3RhbCBmaWxlczogICA0NyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIFxuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU5wbVBhY2tPdXRwdXQob3V0cHV0OiBzdHJpbmcpIHtcbiAgY29uc3QgbGluZXMgPSBvdXRwdXQuc3BsaXQoL1xccj9cXG4vKTtcbiAgY29uc3QgbGluZXNPZmZzZXQgPSBfLmZpbmRMYXN0SW5kZXgobGluZXMsIGxpbmUgPT4gbGluZS5pbmRleE9mKCdUYXJiYWxsIERldGFpbHMnKSA+PSAwKTtcbiAgY29uc3QgdGFyYmFsbEluZm8gPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBsaW5lcy5zbGljZShsaW5lc09mZnNldCkuZm9yRWFjaChsaW5lID0+IHtcbiAgICBjb25zdCBtYXRjaCA9IC9ucG0gbm90aWNlXFxzKyhbXjpdKylbOl1cXHMqKC4rPylcXHMqJC8uZXhlYyhsaW5lKTtcbiAgICBpZiAoIW1hdGNoKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHRhcmJhbGxJbmZvLnNldChtYXRjaFsxXSwgbWF0Y2hbMl0pO1xuICB9KTtcbiAgcmV0dXJuIHRhcmJhbGxJbmZvO1xufVxuXG5mdW5jdGlvbiBkZWxldGVPbGRUYXIoZGVsZXRlRmlsZVByZWZpeDogc3RyaW5nW10sIGtlZXBmaWxlczogc3RyaW5nW10pIHtcbiAgY29uc3QgdGFyU2V0ID0gbmV3IFNldChrZWVwZmlsZXMpO1xuICBjb25zdCBkZWxldGVEb25lOiBQcm9taXNlPGFueT5bXSA9IFtdO1xuICBpZiAoIWZzLmV4aXN0c1N5bmMoY29uZmlnLnJlc29sdmUoJ3Jvb3RQYXRoJywgJ3RhcmJhbGxzJykpKVxuICAgIGZzLm1rZGlycFN5bmMoY29uZmlnLnJlc29sdmUoJ3Jvb3RQYXRoJywgJ3RhcmJhbGxzJykpO1xuICAvLyBUT0RPOiB3YWl0IGZvciB0aW1lb3V0XG4gIGZvciAoY29uc3QgZmlsZSBvZiBmcy5yZWFkZGlyU3luYygndGFyYmFsbHMnKSkge1xuICAgIGlmICghdGFyU2V0LmhhcyhmaWxlKSAmJiBkZWxldGVGaWxlUHJlZml4LnNvbWUocHJlZml4ID0+IGZpbGUuc3RhcnRzV2l0aChwcmVmaXgpKSkge1xuICAgICAgZGVsZXRlRG9uZS5wdXNoKGZzLnJlbW92ZShQYXRoLnJlc29sdmUoJ3RhcmJhbGxzJywgZmlsZSkpKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFByb21pc2UuYWxsKGRlbGV0ZURvbmUpO1xuICAvLyBsb2cuaW5mbygnWW91IG1heSBkZWxldGUgb2xkIHZlcnNpb24gdGFyIGZpbGUgYnkgZXhlY3V0ZSBjb21tYW5kczpcXG4nICsgY21kKTtcbn1cbiJdfQ==