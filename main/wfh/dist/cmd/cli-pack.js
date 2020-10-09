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
const log4js_1 = __importDefault(require("log4js"));
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
            yield Promise.all(opts.workspace.map(ws => packPackagesOfWorkspace(ws)));
        }
        else if (opts.project && opts.project.length > 0) {
            return packProject(opts.project);
        }
        if (opts.packageDirs && opts.packageDirs.length > 0) {
            yield packPackages(opts.packageDirs);
        }
        else {
            yield packPackagesOfWorkspace(process.cwd());
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
        yield publishPackages(opts.packageDirs, opts.public ? ['--access', 'public'] : []);
    });
}
exports.publish = publish;
function packPackagesOfWorkspace(workspaceDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const wsKey = package_mgr_1.workspaceKey(workspaceDir);
        const linkedPackages = package_mgr_1.getState().srcPackages;
        const ws = package_mgr_1.getState().workspaces.get(wsKey);
        if (ws) {
            const dirs = ws.linkedDependencies.map(entry => linkedPackages.get(entry[0]))
                .filter(pkg => pkg != null)
                .map(pkg => pkg.realPath);
            yield packPackages(dirs);
        }
        else {
            log.error(`Workspace ${workspaceDir} is not a workspace directory`);
        }
    });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXBhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXBhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDREQUFnRDtBQUNoRCwwQ0FBNEI7QUFDNUIsNkNBQStCO0FBQy9CLDJDQUE2QjtBQUM3QixvREFBOEM7QUFDOUMscUNBQXFDO0FBQ3JDLHFEQUFxRDtBQUNyRCxpRkFBdUU7QUFDdkUsa0ZBQTZFO0FBQzdFLHVEQUErQjtBQUUvQiwrREFBc0M7QUFDdEMsZ0RBQTZFO0FBQzdFLG9EQUE0QjtBQUM1QixtREFBbUQ7QUFDbkQsOERBQThEO0FBQzlELE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3pDLDJDQUEyQztBQUMzQyxtREFBbUQ7QUFFbkQsU0FBc0IsSUFBSSxDQUFDLElBQWlCOztRQUMxQyxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hCLG9CQUFTLENBQUMsZ0JBQU0sRUFBRSxDQUFDLENBQUM7UUFFcEIsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUUxQixJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQy9DLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMxRTthQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDbEQsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ2xDO1FBQUMs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LENBQUMsQ0FBQztJQUMvQixnRkFBZ0Y7QUFDbEYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IHtxdWV1ZVVwfSBmcm9tICcuLi91dGlscy9wcm9taXNlLXF1ZXF1ZSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtwcm9taXNpZnlFeGV9IGZyb20gJy4uL3Byb2Nlc3MtdXRpbHMnO1xuLy8gaW1wb3J0IHtib3hTdHJpbmd9IGZyb20gJy4vdXRpbHMnO1xuLy8gaW1wb3J0ICogYXMgcmVjaXBlTWFuYWdlciBmcm9tICcuL3JlY2lwZS1tYW5hZ2VyJztcbmltcG9ydCBqc29uUGFyc2VyLCB7T2JqZWN0QXN0LCBUb2tlbn0gZnJvbSAnLi4vdXRpbHMvanNvbi1zeW5jLXBhcnNlcic7XG5pbXBvcnQgcmVwbGFjZUNvZGUsIHtSZXBsYWNlbWVudEluZn0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L3BhdGNoLXRleHQnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHtQYWNrT3B0aW9ucywgUHVibGlzaE9wdGlvbnN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuLi9sb2ctY29uZmlnJztcbmltcG9ydCB7Z2V0UGFja2FnZXNPZlByb2plY3RzLCBnZXRTdGF0ZSwgd29ya3NwYWNlS2V5fSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG4vLyBpbXBvcnQgKiBhcyBwYWNrYWdlVXRpbHMgZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbi8vIGNvbnN0IHJlY2lwZU1hbmFnZXIgPSByZXF1aXJlKCcuLi9saWIvZ3VscC9yZWNpcGVNYW5hZ2VyJyk7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdjbGktcGFjaycpO1xuLy8gY29uc3QgbmFtZVBhdCA9IC9uYW1lOlxccysoW14gXFxuXFxyXSspL21pO1xuLy8gY29uc3QgZmlsZU5hbWVQYXQgPSAvZmlsZW5hbWU6XFxzKyhbXiBcXG5cXHJdKykvbWk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYWNrKG9wdHM6IFBhY2tPcHRpb25zKSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KG9wdHMpO1xuICBsb2dDb25maWcoY29uZmlnKCkpO1xuXG4gIGZzLm1rZGlycFN5bmMoJ3RhcmJhbGxzJyk7XG5cbiAgaWYgKG9wdHMud29ya3NwYWNlICYmIG9wdHMud29ya3NwYWNlLmxlbmd0aCA+IDApIHtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChvcHRzLndvcmtzcGFjZS5tYXAod3MgPT4gcGFja1BhY2thZ2VzT2ZXb3Jrc3BhY2Uod3MpKSk7XG4gIH0gZWxzZSBpZiAob3B0cy5wcm9qZWN0ICYmIG9wdHMucHJvamVjdC5sZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIHBhY2tQcm9qZWN0KG9wdHMucHJvamVjdCk7XG4gIH0gaWYgKG9wdHMucGFja2FnZURpcnMgJiYgb3B0cy5wYWNrYWdlRGlycy5sZW5ndGggPiAwKSB7XG4gICAgYXdhaXQgcGFja1BhY2thZ2VzKG9wdHMucGFja2FnZURpcnMpO1xuICB9IGVsc2Uge1xuICAgIGF3YWl0IHBhY2tQYWNrYWdlc09mV29ya3NwYWNlKHByb2Nlc3MuY3dkKCkpO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwdWJsaXNoKG9wdHM6IFB1Ymxpc2hPcHRpb25zKSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KG9wdHMpO1xuICBsb2dDb25maWcoY29uZmlnKCkpO1xuXG4gIGZzLm1rZGlycFN5bmMoJ3RhcmJhbGxzJyk7XG5cbiAgaWYgKG9wdHMucHJvamVjdCAmJiBvcHRzLnByb2plY3QubGVuZ3RoID4gMClcbiAgICByZXR1cm4gcHVibGlzaFByb2plY3Qob3B0cy5wcm9qZWN0LCBvcHRzLnB1YmxpYyA/IFsnLS1hY2Nlc3MnLCAncHVibGljJ10gOiBbXSk7XG5cbiAgYXdhaXQgcHVibGlzaFBhY2thZ2VzKG9wdHMucGFja2FnZURpcnMsIG9wdHMucHVibGljID8gWyctLWFjY2VzcycsICdwdWJsaWMnXSA6IFtdKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcGFja1BhY2thZ2VzT2ZXb3Jrc3BhY2Uod29ya3NwYWNlRGlyOiBzdHJpbmcpIHtcbiAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkod29ya3NwYWNlRGlyKTtcbiAgY29uc3QgbGlua2VkUGFja2FnZXMgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzO1xuICBjb25zdCB3cyA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuICBpZiAod3MpIHtcbiAgICBjb25zdCBkaXJzID0gd3MubGlua2VkRGVwZW5kZW5jaWVzLm1hcChlbnRyeSA9PiBsaW5rZWRQYWNrYWdlcy5nZXQoZW50cnlbMF0pKVxuICAgICAgLmZpbHRlcihwa2cgPT4gcGtnICE9IG51bGwpXG4gICAgICAubWFwKHBrZyA9PiBwa2chLnJlYWxQYXRoKTtcbiAgICBhd2FpdCBwYWNrUGFja2FnZXMoZGlycyk7XG4gIH0gZWxzZSB7XG4gICAgbG9nLmVycm9yKGBXb3Jrc3BhY2UgJHt3b3Jrc3BhY2VEaXJ9IGlzIG5vdCBhIHdvcmtzcGFjZSBkaXJlY3RvcnlgKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwYWNrUGFja2FnZXMocGFja2FnZURpcnM6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IHBhY2thZ2UydGFyYmFsbCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGlmIChwYWNrYWdlRGlycyAmJiBwYWNrYWdlRGlycy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgcGdQYXRoczogc3RyaW5nW10gPSBwYWNrYWdlRGlycztcblxuICAgIGNvbnN0IGRvbmUgPSBxdWV1ZVVwKDMsIHBnUGF0aHMubWFwKHBhY2thZ2VEaXIgPT4gKCkgPT4gbnBtUGFjayhwYWNrYWdlRGlyKSkpO1xuICAgIGxldCB0YXJJbmZvcyA9IGF3YWl0IGRvbmU7XG5cbiAgICB0YXJJbmZvcyA9IHRhckluZm9zLmZpbHRlcihpdGVtID0+IGl0ZW0gIT0gbnVsbCk7XG4gICAgY29uc3Qgcm9vdFBhdGggPSBjb25maWcoKS5yb290UGF0aDtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGFySW5mb3MpIHtcbiAgICAgIHBhY2thZ2UydGFyYmFsbC5zZXQoaXRlbSEubmFtZSwgUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCAndGFyYmFsbHMnLCBpdGVtIS5maWxlbmFtZSkpO1xuICAgIH1cbiAgICAvLyBsb2cuaW5mbyhBcnJheS5mcm9tKHBhY2thZ2UydGFyYmFsbC5lbnRyaWVzKCkpXG4gICAgLy8gICAubWFwKChbcGtOYW1lLCB2ZXJdKSA9PiBgXCIke3BrTmFtZX1cIjogXCIke3Zlcn1cIixgKVxuICAgIC8vICAgLmpvaW4oJ1xcbicpKTtcbiAgICBhd2FpdCBkZWxldGVPbGRUYXIodGFySW5mb3MubWFwKGl0ZW0gPT4gaXRlbSEubmFtZS5yZXBsYWNlKCdAJywgJycpLnJlcGxhY2UoL1svXFxcXF0vZywgJy0nKSksXG4gICAgICB0YXJJbmZvcy5tYXAoaXRlbSA9PiBpdGVtIS5maWxlbmFtZSkpO1xuICAgIGNoYW5nZVBhY2thZ2VKc29uKHBhY2thZ2UydGFyYmFsbCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcGFja1Byb2plY3QocHJvamVjdERpcnM6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IGRpcnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgZm9yIChjb25zdCBwa2cgb2YgZ2V0UGFja2FnZXNPZlByb2plY3RzKHByb2plY3REaXJzKSkge1xuICAgIGRpcnMucHVzaChwa2cucmVhbFBhdGgpO1xuICB9XG4gIGF3YWl0IHBhY2tQYWNrYWdlcyhkaXJzKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcHVibGlzaFBhY2thZ2VzKHBhY2thZ2VEaXJzOiBzdHJpbmdbXSwgbnBtQ2xpT3B0czogc3RyaW5nW10pIHtcbiAgaWYgKHBhY2thZ2VEaXJzICYmIHBhY2thZ2VEaXJzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBwZ1BhdGhzOiBzdHJpbmdbXSA9IHBhY2thZ2VEaXJzO1xuXG4gICAgYXdhaXQgcXVldWVVcCgzLCBwZ1BhdGhzLm1hcChwYWNrYWdlRGlyID0+IGFzeW5jICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGxvZy5pbmZvKGBwdWJsaXNoaW5nICR7cGFja2FnZURpcn1gKTtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gWydwdWJsaXNoJywgLi4ubnBtQ2xpT3B0cywge3NpbGVudDogdHJ1ZSwgY3dkOiBwYWNrYWdlRGlyfV07XG4gICAgICAgIGNvbnN0IG91dHB1dCA9IGF3YWl0IHByb21pc2lmeUV4ZSgnbnBtJywgLi4ucGFyYW1zKTtcbiAgICAgICAgbG9nLmluZm8ob3V0cHV0KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgbG9nLmVycm9yKGUpO1xuICAgICAgfVxuICAgIH0pKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwdWJsaXNoUHJvamVjdChwcm9qZWN0RGlyczogc3RyaW5nW10sIG5wbUNsaU9wdHM6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IGRpcnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgZm9yIChjb25zdCBwa2cgb2YgZ2V0UGFja2FnZXNPZlByb2plY3RzKHByb2plY3REaXJzKSkge1xuICAgIGRpcnMucHVzaChwa2cucmVhbFBhdGgpO1xuICB9XG4gIGF3YWl0IHB1Ymxpc2hQYWNrYWdlcyhkaXJzLCBucG1DbGlPcHRzKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbnBtUGFjayhwYWNrYWdlUGF0aDogc3RyaW5nKTpcbiAgUHJvbWlzZTx7bmFtZTogc3RyaW5nLCBmaWxlbmFtZTogc3RyaW5nfSB8IG51bGw+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBvdXRwdXQgPSBhd2FpdCBwcm9taXNpZnlFeGUoJ25wbScsICdwYWNrJywgUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoKSxcbiAgICAgIHtzaWxlbnQ6IHRydWUsIGN3ZDogUGF0aC5yZXNvbHZlKGNvbmZpZygpLnJvb3RQYXRoLCAndGFyYmFsbHMnKX0pO1xuICAgIGNvbnN0IHJlc3VsdEluZm8gPSBwYXJzZU5wbVBhY2tPdXRwdXQob3V0cHV0KTtcblxuICAgIGNvbnN0IHBhY2thZ2VOYW1lID0gcmVzdWx0SW5mby5nZXQoJ25hbWUnKSE7XG4gICAgLy8gY2IocGFja2FnZU5hbWUsIHJlc3VsdEluZm8uZ2V0KCdmaWxlbmFtZScpISk7XG4gICAgbG9nLmluZm8ob3V0cHV0KTtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogcGFja2FnZU5hbWUsXG4gICAgICBmaWxlbmFtZTogcmVzdWx0SW5mby5nZXQoJ2ZpbGVuYW1lJykhXG4gICAgfTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGhhbmRsZUV4cHRpb24ocGFja2FnZVBhdGgsIGUpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNoYW5nZVBhY2thZ2VKc29uKHBhY2thZ2UydGFyYmFsbDogTWFwPHN0cmluZywgc3RyaW5nPikge1xuXG4gIGZvciAoY29uc3Qgd29ya3NwYWNlIG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICBjb25zdCB3c0RpciA9IFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgd29ya3NwYWNlKTtcbiAgICBjb25zdCBqc29uRmlsZSA9IFBhdGgucmVzb2x2ZSh3c0RpciwgJ3BhY2thZ2UuanNvbicpO1xuICAgIGNvbnN0IHBraiA9IGZzLnJlYWRGaWxlU3luYyhqc29uRmlsZSwgJ3V0ZjgnKTtcbiAgICBjb25zdCBhc3QgPSBqc29uUGFyc2VyKHBraik7XG4gICAgY29uc3QgZGVwc0FzdCA9IGFzdC5wcm9wZXJ0aWVzLmZpbmQoKHtuYW1lfSkgPT4gSlNPTi5wYXJzZShuYW1lLnRleHQpID09PSAnZGVwZW5kZW5jaWVzJyk7XG4gICAgY29uc3QgZGV2RGVwc0FzdCA9IGFzdC5wcm9wZXJ0aWVzLmZpbmQoKHtuYW1lfSkgPT4gSlNPTi5wYXJzZShuYW1lLnRleHQpID09PSAnZGV2RGVwZW5kZW5jaWVzJyk7XG4gICAgY29uc3QgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdID0gW107XG4gICAgaWYgKGRlcHNBc3QpIHtcbiAgICAgIGNoYW5nZURlcGVuZGVuY2llcyhkZXBzQXN0LnZhbHVlIGFzIE9iamVjdEFzdCk7XG4gICAgfVxuICAgIGlmIChkZXZEZXBzQXN0KSB7XG4gICAgICBjaGFuZ2VEZXBlbmRlbmNpZXMoZGV2RGVwc0FzdC52YWx1ZSBhcyBPYmplY3RBc3QpO1xuICAgIH1cblxuICAgIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgcmVwbGFjZWQgPSByZXBsYWNlQ29kZShwa2osIHJlcGxhY2VtZW50cyk7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGxvZy5pbmZvKCdVcGRhdGVkIHBhY2thZ2UuanNvblxcbicsIHJlcGxhY2VkKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmMoanNvbkZpbGUsIHJlcGxhY2VkKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGFuZ2VEZXBlbmRlbmNpZXMoZGVwczogT2JqZWN0QXN0KSB7XG4gICAgICBjb25zdCBmb3VuZERlcHMgPSBkZXBzLnByb3BlcnRpZXMuZmlsdGVyKCh7bmFtZX0pID0+IHBhY2thZ2UydGFyYmFsbC5oYXMoSlNPTi5wYXJzZShuYW1lLnRleHQpKSk7XG4gICAgICBmb3IgKGNvbnN0IGZvdW5kRGVwIG9mIGZvdW5kRGVwcykge1xuICAgICAgICBjb25zdCB2ZXJUb2tlbiA9IGZvdW5kRGVwLnZhbHVlIGFzIFRva2VuO1xuICAgICAgICBjb25zdCB0YXJGaWxlID0gcGFja2FnZTJ0YXJiYWxsLmdldChKU09OLnBhcnNlKGZvdW5kRGVwLm5hbWUudGV4dCkpO1xuICAgICAgICBsZXQgbmV3VmVyc2lvbiA9IFBhdGgucmVsYXRpdmUod3NEaXIsIHRhckZpbGUhKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGlmICghbmV3VmVyc2lvbi5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgICAgICBuZXdWZXJzaW9uID0gJy4vJyArIG5ld1ZlcnNpb247XG4gICAgICAgIH1cbiAgICAgICAgbG9nLmluZm8oYFVwZGF0ZSAke2pzb25GaWxlfTogJHt2ZXJUb2tlbi50ZXh0fSA9PiAke25ld1ZlcnNpb259YCk7XG4gICAgICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgICAgICBzdGFydDogdmVyVG9rZW4ucG9zLFxuICAgICAgICAgIGVuZDogdmVyVG9rZW4uZW5kISxcbiAgICAgICAgICB0ZXh0OiBKU09OLnN0cmluZ2lmeShuZXdWZXJzaW9uKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRXhwdGlvbihwYWNrYWdlUGF0aDogc3RyaW5nLCBlOiBFcnJvcikge1xuICBpZiAoZSAmJiBlLm1lc3NhZ2UgJiYgZS5tZXNzYWdlLmluZGV4T2YoJ0VQVUJMSVNIQ09ORkxJQ1QnKSA+IDApXG4gICAgbG9nLmluZm8oYG5wbSBwYWNrICR7cGFja2FnZVBhdGh9OiBFUFVCTElTSENPTkZMSUNULmApO1xuICBlbHNlXG4gICAgbG9nLmVycm9yKHBhY2thZ2VQYXRoLCBlKTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBvdXRwdXQgXG4gKiBlLmcuXG5ucG0gbm90aWNlID09PSBUYXJiYWxsIERldGFpbHMgPT09IFxubnBtIG5vdGljZSBuYW1lOiAgICAgICAgICByZXF1aXJlLWluamVjdG9yICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHZlcnNpb246ICAgICAgIDUuMS41ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgZmlsZW5hbWU6ICAgICAgcmVxdWlyZS1pbmplY3Rvci01LjEuNS50Z3ogICAgICAgICAgICAgIFxubnBtIG5vdGljZSBwYWNrYWdlIHNpemU6ICA1Ni45IGtCICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHVucGFja2VkIHNpemU6IDIyOS4xIGtCICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2Ugc2hhc3VtOiAgICAgICAgYzA2OTMyNzBjMTQwZjY1YTY5NjIwN2FiOWRlYjE4ZTY0NDUyYTAyY1xubnBtIG5vdGljZSBpbnRlZ3JpdHk6ICAgICBzaGE1MTIta1JHVldjdzFmdlE1SlsuLi5dQUJ3TFBVOFV2U3RiQT09XG5ucG0gbm90aWNlIHRvdGFsIGZpbGVzOiAgIDQ3ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgXG5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTnBtUGFja091dHB1dChvdXRwdXQ6IHN0cmluZykge1xuICBjb25zdCBsaW5lcyA9IG91dHB1dC5zcGxpdCgvXFxyP1xcbi8pO1xuICBjb25zdCBsaW5lc09mZnNldCA9IF8uZmluZExhc3RJbmRleChsaW5lcywgbGluZSA9PiBsaW5lLmluZGV4T2YoJ1RhcmJhbGwgRGV0YWlscycpID49IDApO1xuICBjb25zdCB0YXJiYWxsSW5mbyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGxpbmVzLnNsaWNlKGxpbmVzT2Zmc2V0KS5mb3JFYWNoKGxpbmUgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0gL25wbSBub3RpY2VcXHMrKFteOl0rKVs6XVxccyooLis/KVxccyokLy5leGVjKGxpbmUpO1xuICAgIGlmICghbWF0Y2gpXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gdGFyYmFsbEluZm8uc2V0KG1hdGNoWzFdLCBtYXRjaFsyXSk7XG4gIH0pO1xuICByZXR1cm4gdGFyYmFsbEluZm87XG59XG5cbmZ1bmN0aW9uIGRlbGV0ZU9sZFRhcihkZWxldGVGaWxlUHJlZml4OiBzdHJpbmdbXSwga2VlcGZpbGVzOiBzdHJpbmdbXSkge1xuICBjb25zdCB0YXJTZXQgPSBuZXcgU2V0KGtlZXBmaWxlcyk7XG4gIGNvbnN0IGRlbGV0ZURvbmU6IFByb21pc2U8YW55PltdID0gW107XG4gIGlmICghZnMuZXhpc3RzU3luYyhjb25maWcucmVzb2x2ZSgncm9vdFBhdGgnLCAndGFyYmFsbHMnKSkpXG4gICAgZnMubWtkaXJwU3luYyhjb25maWcucmVzb2x2ZSgncm9vdFBhdGgnLCAndGFyYmFsbHMnKSk7XG4gIC8vIFRPRE86IHdhaXQgZm9yIHRpbWVvdXRcbiAgZm9yIChjb25zdCBmaWxlIG9mIGZzLnJlYWRkaXJTeW5jKCd0YXJiYWxscycpKSB7XG4gICAgaWYgKCF0YXJTZXQuaGFzKGZpbGUpICYmIGRlbGV0ZUZpbGVQcmVmaXguc29tZShwcmVmaXggPT4gZmlsZS5zdGFydHNXaXRoKHByZWZpeCkpKSB7XG4gICAgICBkZWxldGVEb25lLnB1c2goZnMucmVtb3ZlKFBhdGgucmVzb2x2ZSgndGFyYmFsbHMnLCBmaWxlKSkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gUHJvbWlzZS5hbGwoZGVsZXRlRG9uZSk7XG4gIC8vIGxvZy5pbmZvKCdZb3UgbWF5IGRlbGV0ZSBvbGQgdmVyc2lvbiB0YXIgZmlsZSBieSBleGVjdXRlIGNvbW1hbmRzOlxcbicgKyBjbWQpO1xufVxuIl19