"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_queque_1 = require("./utils/promise-queque");
const _ = __importStar(require("lodash"));
const fs = __importStar(require("fs-extra"));
const Path = __importStar(require("path"));
const process_utils_1 = require("./process-utils");
const utils_1 = require("./utils");
const recipeManager = __importStar(require("./recipe-manager"));
const json_parser_1 = __importDefault(require("./utils/json-parser"));
const patch_text_1 = __importDefault(require("require-injector/dist/patch-text"));
const config = require('../lib/config');
require('../lib/logConfig')(config());
const packageUtils = require('../lib/packageMgr/packageUtils');
// const recipeManager = require('../lib/gulp/recipeManager');
const log = require('log4js').getLogger('drcp-cmd');
// const namePat = /name:\s+([^ \n\r]+)/mi;
// const fileNamePat = /filename:\s+([^ \n\r]+)/mi;
function pack(argv) {
    return __awaiter(this, void 0, void 0, function* () {
        if (argv.pj)
            return packProject(argv);
        const package2tarball = {};
        if (argv.packages) {
            const pgPaths = argv.packages;
            const done = promise_queque_1.queueUp(3, pgPaths.map(packageDir => () => npmPack(packageDir)));
            let tarInfos = yield done;
            tarInfos = tarInfos.filter(item => item != null);
            tarInfos.forEach(item => {
                package2tarball[item.name] = './tarballs/' + item.filename;
            });
            yield deleteOldTar(tarInfos.map(item => item.name.replace('@', '').replace(/[/\\]/g, '-')), tarInfos.map(item => item.filename));
            changePackageJson(package2tarball);
        }
    });
}
exports.pack = pack;
function packProject(argv) {
    return __awaiter(this, void 0, void 0, function* () {
        fs.mkdirpSync('tarballs');
        // var count = 0;
        const recipe2packages = {};
        const package2tarball = {};
        recipeManager.eachRecipeSrc(argv.pj, function (src, recipeDir) {
            if (!recipeDir)
                return;
            const data = JSON.parse(fs.readFileSync(Path.join(recipeDir, 'package.json'), 'utf8'));
            recipe2packages[data.name + '@' + data.version] = data.dependencies;
        });
        const packActions = [];
        const { add } = promise_queque_1.queue(3);
        // tslint:disable-next-line: max-line-length
        packageUtils.findAllPackages((name, entryPath, parsedName, json, packagePath) => {
            packActions.push(add(() => npmPack(packagePath)));
        }, 'src', argv.projectDir);
        let tarInfos = yield Promise.all(packActions);
        tarInfos = tarInfos.filter(item => item != null);
        tarInfos.forEach(item => {
            package2tarball[item.name] = './tarballs/' + item.filename;
        });
        _.each(recipe2packages, (packages, recipe) => {
            _.each(packages, (ver, name) => {
                packages[name] = package2tarball[name];
            });
            // tslint:disable-next-line:no-console
            console.log(utils_1.boxString('recipe:' + recipe + ', you need to copy following dependencies to your package.json\n'));
            // tslint:disable-next-line:no-console
            console.log(JSON.stringify(packages, null, '  '));
        });
        // tslint:disable-next-line:no-console
        console.log(utils_1.boxString(`Tarball files have been written to ${Path.resolve('tarballs')}`));
    });
}
exports.packProject = packProject;
function npmPack(packagePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const output = yield process_utils_1.promisifyExe('npm', 'pack', Path.resolve(packagePath), { silent: true, cwd: Path.resolve('tarballs') });
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
    return __awaiter(this, void 0, void 0, function* () {
        if (!fs.existsSync('package.json')) {
            // tslint:disable-next-line:no-console
            console.log('Could not find package.json.');
            return;
        }
        const pkj = fs.createReadStream('package.json', 'utf8');
        const ast = yield json_parser_1.default(pkj);
        const depsAst = ast.properties.find(({ name }) => JSON.parse(name.text) === 'dependencies');
        const devDepsAst = ast.properties.find(({ name }) => JSON.parse(name.text) === 'devDependencies');
        const replacements = [];
        if (depsAst) {
            changeDependencies(depsAst.value);
        }
        if (devDepsAst) {
            changeDependencies(devDepsAst.value);
        }
        if (replacements.length > 0)
            fs.writeFileSync('package.json', patch_text_1.default(fs.readFileSync('package.json', 'utf8'), replacements));
        function changeDependencies(deps) {
            const foundDeps = deps.properties.filter(({ name }) => _.has(package2tarball, JSON.parse(name.text)));
            for (const foundDep of foundDeps) {
                const verToken = foundDep.value;
                const newVersion = package2tarball[JSON.parse(foundDep.name.text)];
                log.info(`Update package.json: ${verToken.text} => ${newVersion}`);
                replacements.push({
                    start: verToken.pos,
                    end: verToken.end,
                    text: JSON.stringify(newVersion)
                });
            }
        }
    });
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
    for (const file of fs.readdirSync('tarballs')) {
        if (!tarSet.has(file) && deleteFilePrefix.some(prefix => file.startsWith(prefix))) {
            deleteDone.push(fs.remove(Path.resolve('tarballs', file)));
        }
    }
    return Promise.all(deleteDone);
    // log.info('You may delete old version tar file by execute commands:\n' + cmd);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJjcC1jbWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9kcmNwLWNtZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDJEQUFzRDtBQUN0RCwwQ0FBNEI7QUFDNUIsNkNBQStCO0FBQy9CLDJDQUE2QjtBQUM3QixtREFBNkM7QUFDN0MsbUNBQWtDO0FBQ2xDLGdFQUFrRDtBQUNsRCxzRUFBaUU7QUFDakUsa0ZBQTZFO0FBQzdFLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN4QyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBRXRDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQy9ELDhEQUE4RDtBQUM5RCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3BELDJDQUEyQztBQUMzQyxtREFBbUQ7QUFFbkQsU0FBc0IsSUFBSSxDQUFDLElBQVM7O1FBQ2xDLElBQUksSUFBSSxDQUFDLEVBQUU7WUFDVCxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUzQixNQUFNLGVBQWUsR0FBNkIsRUFBRSxDQUFDO1FBQ3JELElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNqQixNQUFNLE9BQU8sR0FBYSxJQUFJLENBQUMsUUFBUSxDQUFDO1lBRXhDLE1BQU0sSUFBSSxHQUFHLHdCQUFPLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlFLElBQUksUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDO1lBRTFCLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUks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QUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzVEO0tBQ0Y7SUFDRCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDL0IsZ0ZBQWdGO0FBQ2xGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCB7cXVldWVVcCwgcXVldWV9IGZyb20gJy4vdXRpbHMvcHJvbWlzZS1xdWVxdWUnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7cHJvbWlzaWZ5RXhlfSBmcm9tICcuL3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IHtib3hTdHJpbmd9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0ICogYXMgcmVjaXBlTWFuYWdlciBmcm9tICcuL3JlY2lwZS1tYW5hZ2VyJztcbmltcG9ydCBqc29uUGFyc2VyLCB7T2JqZWN0QXN0LCBUb2tlbn0gZnJvbSAnLi91dGlscy9qc29uLXBhcnNlcic7XG5pbXBvcnQgcmVwbGFjZUNvZGUsIHtSZXBsYWNlbWVudEluZn0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L3BhdGNoLXRleHQnO1xuY29uc3QgY29uZmlnID0gcmVxdWlyZSgnLi4vbGliL2NvbmZpZycpO1xucmVxdWlyZSgnLi4vbGliL2xvZ0NvbmZpZycpKGNvbmZpZygpKTtcblxuY29uc3QgcGFja2FnZVV0aWxzID0gcmVxdWlyZSgnLi4vbGliL3BhY2thZ2VNZ3IvcGFja2FnZVV0aWxzJyk7XG4vLyBjb25zdCByZWNpcGVNYW5hZ2VyID0gcmVxdWlyZSgnLi4vbGliL2d1bHAvcmVjaXBlTWFuYWdlcicpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdkcmNwLWNtZCcpO1xuLy8gY29uc3QgbmFtZVBhdCA9IC9uYW1lOlxccysoW14gXFxuXFxyXSspL21pO1xuLy8gY29uc3QgZmlsZU5hbWVQYXQgPSAvZmlsZW5hbWU6XFxzKyhbXiBcXG5cXHJdKykvbWk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYWNrKGFyZ3Y6IGFueSkge1xuICBpZiAoYXJndi5wailcbiAgICByZXR1cm4gcGFja1Byb2plY3QoYXJndik7XG5cbiAgY29uc3QgcGFja2FnZTJ0YXJiYWxsOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgaWYgKGFyZ3YucGFja2FnZXMpIHtcbiAgICBjb25zdCBwZ1BhdGhzOiBzdHJpbmdbXSA9IGFyZ3YucGFja2FnZXM7XG5cbiAgICBjb25zdCBkb25lID0gcXVldWVVcCgzLCBwZ1BhdGhzLm1hcChwYWNrYWdlRGlyID0+ICgpID0+IG5wbVBhY2socGFja2FnZURpcikpKTtcbiAgICBsZXQgdGFySW5mb3MgPSBhd2FpdCBkb25lO1xuXG4gICAgdGFySW5mb3MgPSB0YXJJbmZvcy5maWx0ZXIoaXRlbSA9PiBpdGVtICE9IG51bGwpO1xuICAgIHRhckluZm9zLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICBwYWNrYWdlMnRhcmJhbGxbaXRlbSEubmFtZV0gPSAnLi90YXJiYWxscy8nICsgaXRlbSEuZmlsZW5hbWU7XG4gICAgfSk7XG4gICAgYXdhaXQgZGVsZXRlT2xkVGFyKHRhckluZm9zLm1hcChpdGVtID0+IGl0ZW0hLm5hbWUucmVwbGFjZSgnQCcsICcnKS5yZXBsYWNlKC9bL1xcXFxdL2csICctJykpLFxuICAgICAgdGFySW5mb3MubWFwKGl0ZW0gPT4gaXRlbSEuZmlsZW5hbWUpKTtcbiAgICBjaGFuZ2VQYWNrYWdlSnNvbihwYWNrYWdlMnRhcmJhbGwpO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYWNrUHJvamVjdChhcmd2OiBhbnkpIHtcbiAgZnMubWtkaXJwU3luYygndGFyYmFsbHMnKTtcbiAgLy8gdmFyIGNvdW50ID0gMDtcbiAgY29uc3QgcmVjaXBlMnBhY2thZ2VzOiB7W3JlY2lwZTogc3RyaW5nXToge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9fSA9IHt9O1xuICBjb25zdCBwYWNrYWdlMnRhcmJhbGw6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXG4gIHJlY2lwZU1hbmFnZXIuZWFjaFJlY2lwZVNyYyhhcmd2LnBqLCBmdW5jdGlvbihzcmM6IHN0cmluZywgcmVjaXBlRGlyOiBzdHJpbmcpIHtcbiAgICBpZiAoIXJlY2lwZURpcilcbiAgICAgIHJldHVybjtcbiAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoUGF0aC5qb2luKHJlY2lwZURpciwgJ3BhY2thZ2UuanNvbicpLCAndXRmOCcpKTtcbiAgICByZWNpcGUycGFja2FnZXNbZGF0YS5uYW1lICsgJ0AnICsgZGF0YS52ZXJzaW9uXSA9IGRhdGEuZGVwZW5kZW5jaWVzO1xuICB9KTtcblxuICBjb25zdCBwYWNrQWN0aW9ucyA9IFtdIGFzIEFycmF5PFJldHVyblR5cGU8dHlwZW9mIG5wbVBhY2s+PjtcbiAgY29uc3Qge2FkZH0gPSBxdWV1ZSgzKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbiAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcygobmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZTogc3RyaW5nLCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBwYWNrQWN0aW9ucy5wdXNoKGFkZCgoKSA9PiBucG1QYWNrKHBhY2thZ2VQYXRoKSkpO1xuICB9LCAnc3JjJywgYXJndi5wcm9qZWN0RGlyKTtcblxuXG4gIGxldCB0YXJJbmZvcyA9IGF3YWl0IFByb21pc2UuYWxsKHBhY2tBY3Rpb25zKTtcbiAgdGFySW5mb3MgPSB0YXJJbmZvcy5maWx0ZXIoaXRlbSA9PiBpdGVtICE9IG51bGwpO1xuICB0YXJJbmZvcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgIHBhY2thZ2UydGFyYmFsbFtpdGVtIS5uYW1lXSA9ICcuL3RhcmJhbGxzLycgKyBpdGVtIS5maWxlbmFtZTtcbiAgfSk7XG5cbiAgXy5lYWNoKHJlY2lwZTJwYWNrYWdlcywgKHBhY2thZ2VzLCByZWNpcGUpID0+IHtcbiAgICBfLmVhY2gocGFja2FnZXMsICh2ZXIsIG5hbWUpID0+IHtcbiAgICAgIHBhY2thZ2VzW25hbWVdID0gcGFja2FnZTJ0YXJiYWxsW25hbWVdO1xuICAgIH0pO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYm94U3RyaW5nKCdyZWNpcGU6JyArIHJlY2lwZSArICcsIHlvdSBuZWVkIHRvIGNvcHkgZm9sbG93aW5nIGRlcGVuZGVuY2llcyB0byB5b3VyIHBhY2thZ2UuanNvblxcbicpKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHBhY2thZ2VzLCBudWxsLCAnICAnKSk7XG4gIH0pO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhib3hTdHJpbmcoYFRhcmJhbGwgZmlsZXMgaGF2ZSBiZWVuIHdyaXR0ZW4gdG8gJHtQYXRoLnJlc29sdmUoJ3RhcmJhbGxzJyl9YCkpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBucG1QYWNrKHBhY2thZ2VQYXRoOiBzdHJpbmcpOlxuICBQcm9taXNlPHtuYW1lOiBzdHJpbmcsIGZpbGVuYW1lOiBzdHJpbmd9IHwgbnVsbD4ge1xuICB0cnkge1xuICAgIGNvbnN0IG91dHB1dCA9IGF3YWl0IHByb21pc2lmeUV4ZSgnbnBtJywgJ3BhY2snLCBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgpLFxuICAgICAge3NpbGVudDogdHJ1ZSwgY3dkOiBQYXRoLnJlc29sdmUoJ3RhcmJhbGxzJyl9KTtcbiAgICBjb25zdCByZXN1bHRJbmZvID0gcGFyc2VOcG1QYWNrT3V0cHV0KG91dHB1dCk7XG5cbiAgICBjb25zdCBwYWNrYWdlTmFtZSA9IHJlc3VsdEluZm8uZ2V0KCduYW1lJykhO1xuICAgIC8vIGNiKHBhY2thZ2VOYW1lLCByZXN1bHRJbmZvLmdldCgnZmlsZW5hbWUnKSEpO1xuICAgIGxvZy5pbmZvKG91dHB1dCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IHBhY2thZ2VOYW1lLFxuICAgICAgZmlsZW5hbWU6IHJlc3VsdEluZm8uZ2V0KCdmaWxlbmFtZScpIVxuICAgIH07XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBoYW5kbGVFeHB0aW9uKHBhY2thZ2VQYXRoLCBlKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBjaGFuZ2VQYWNrYWdlSnNvbihwYWNrYWdlMnRhcmJhbGw6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSkge1xuICBpZiAoIWZzLmV4aXN0c1N5bmMoJ3BhY2thZ2UuanNvbicpKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnQ291bGQgbm90IGZpbmQgcGFja2FnZS5qc29uLicpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBwa2ogPSBmcy5jcmVhdGVSZWFkU3RyZWFtKCdwYWNrYWdlLmpzb24nLCAndXRmOCcpO1xuICBjb25zdCBhc3QgPSBhd2FpdCBqc29uUGFyc2VyKHBraik7XG4gIGNvbnN0IGRlcHNBc3QgPSBhc3QucHJvcGVydGllcy5maW5kKCh7bmFtZX0pID0+IEpTT04ucGFyc2UobmFtZS50ZXh0KSA9PT0gJ2RlcGVuZGVuY2llcycpO1xuICBjb25zdCBkZXZEZXBzQXN0ID0gYXN0LnByb3BlcnRpZXMuZmluZCgoe25hbWV9KSA9PiBKU09OLnBhcnNlKG5hbWUudGV4dCkgPT09ICdkZXZEZXBlbmRlbmNpZXMnKTtcbiAgY29uc3QgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdID0gW107XG4gIGlmIChkZXBzQXN0KSB7XG4gICAgY2hhbmdlRGVwZW5kZW5jaWVzKGRlcHNBc3QudmFsdWUgYXMgT2JqZWN0QXN0KTtcbiAgfVxuICBpZiAoZGV2RGVwc0FzdCkge1xuICAgIGNoYW5nZURlcGVuZGVuY2llcyhkZXZEZXBzQXN0LnZhbHVlIGFzIE9iamVjdEFzdCk7XG4gIH1cblxuICBpZiAocmVwbGFjZW1lbnRzLmxlbmd0aCA+IDApXG4gICAgZnMud3JpdGVGaWxlU3luYygncGFja2FnZS5qc29uJywgcmVwbGFjZUNvZGUoZnMucmVhZEZpbGVTeW5jKCdwYWNrYWdlLmpzb24nLCAndXRmOCcpLCByZXBsYWNlbWVudHMpKTtcblxuICBmdW5jdGlvbiBjaGFuZ2VEZXBlbmRlbmNpZXMoZGVwczogT2JqZWN0QXN0KSB7XG5cbiAgICBjb25zdCBmb3VuZERlcHMgPSBkZXBzLnByb3BlcnRpZXMuZmlsdGVyKCh7bmFtZX0pID0+IF8uaGFzKHBhY2thZ2UydGFyYmFsbCwgSlNPTi5wYXJzZShuYW1lLnRleHQpKSk7XG4gICAgZm9yIChjb25zdCBmb3VuZERlcCBvZiBmb3VuZERlcHMpIHtcbiAgICAgIGNvbnN0IHZlclRva2VuID0gZm91bmREZXAudmFsdWUgYXMgVG9rZW48c3RyaW5nPjtcbiAgICAgIGNvbnN0IG5ld1ZlcnNpb24gPSBwYWNrYWdlMnRhcmJhbGxbSlNPTi5wYXJzZShmb3VuZERlcC5uYW1lLnRleHQpXTtcbiAgICAgIGxvZy5pbmZvKGBVcGRhdGUgcGFja2FnZS5qc29uOiAke3ZlclRva2VuLnRleHR9ID0+ICR7bmV3VmVyc2lvbn1gKTtcbiAgICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgICAgc3RhcnQ6IHZlclRva2VuLnBvcyxcbiAgICAgICAgZW5kOiB2ZXJUb2tlbi5lbmQhLFxuICAgICAgICB0ZXh0OiBKU09OLnN0cmluZ2lmeShuZXdWZXJzaW9uKVxuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUV4cHRpb24ocGFja2FnZVBhdGg6IHN0cmluZywgZTogRXJyb3IpIHtcbiAgaWYgKGUgJiYgZS5tZXNzYWdlICYmIGUubWVzc2FnZS5pbmRleE9mKCdFUFVCTElTSENPTkZMSUNUJykgPiAwKVxuICAgIGxvZy5pbmZvKGBucG0gcGFjayAke3BhY2thZ2VQYXRofTogRVBVQkxJU0hDT05GTElDVC5gKTtcbiAgZWxzZVxuICAgIGxvZy5lcnJvcihwYWNrYWdlUGF0aCwgZSk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gb3V0cHV0IFxuICogZS5nLlxubnBtIG5vdGljZSA9PT0gVGFyYmFsbCBEZXRhaWxzID09PSBcbm5wbSBub3RpY2UgbmFtZTogICAgICAgICAgcmVxdWlyZS1pbmplY3RvciAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSB2ZXJzaW9uOiAgICAgICA1LjEuNSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIGZpbGVuYW1lOiAgICAgIHJlcXVpcmUtaW5qZWN0b3ItNS4xLjUudGd6ICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgcGFja2FnZSBzaXplOiAgNTYuOSBrQiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSB1bnBhY2tlZCBzaXplOiAyMjkuMSBrQiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHNoYXN1bTogICAgICAgIGMwNjkzMjcwYzE0MGY2NWE2OTYyMDdhYjlkZWIxOGU2NDQ1MmEwMmNcbm5wbSBub3RpY2UgaW50ZWdyaXR5OiAgICAgc2hhNTEyLWtSR1ZXY3cxZnZRNUpbLi4uXUFCd0xQVThVdlN0YkE9PVxubnBtIG5vdGljZSB0b3RhbCBmaWxlczogICA0NyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIFxuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU5wbVBhY2tPdXRwdXQob3V0cHV0OiBzdHJpbmcpIHtcbiAgY29uc3QgbGluZXMgPSBvdXRwdXQuc3BsaXQoL1xccj9cXG4vKTtcbiAgY29uc3QgbGluZXNPZmZzZXQgPSBfLmZpbmRMYXN0SW5kZXgobGluZXMsIGxpbmUgPT4gbGluZS5pbmRleE9mKCdUYXJiYWxsIERldGFpbHMnKSA+PSAwKTtcbiAgY29uc3QgdGFyYmFsbEluZm8gPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBsaW5lcy5zbGljZShsaW5lc09mZnNldCkuZm9yRWFjaChsaW5lID0+IHtcbiAgICBjb25zdCBtYXRjaCA9IC9ucG0gbm90aWNlXFxzKyhbXjpdKylbOl1cXHMqKC4rPylcXHMqJC8uZXhlYyhsaW5lKTtcbiAgICBpZiAoIW1hdGNoKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHRhcmJhbGxJbmZvLnNldChtYXRjaFsxXSwgbWF0Y2hbMl0pO1xuICB9KTtcbiAgcmV0dXJuIHRhcmJhbGxJbmZvO1xufVxuXG5mdW5jdGlvbiBkZWxldGVPbGRUYXIoZGVsZXRlRmlsZVByZWZpeDogc3RyaW5nW10sIGtlZXBmaWxlczogc3RyaW5nW10pIHtcbiAgY29uc3QgdGFyU2V0ID0gbmV3IFNldChrZWVwZmlsZXMpO1xuICBjb25zdCBkZWxldGVEb25lOiBQcm9taXNlPGFueT5bXSA9IFtdO1xuICBmb3IgKGNvbnN0IGZpbGUgb2YgZnMucmVhZGRpclN5bmMoJ3RhcmJhbGxzJykpIHtcbiAgICBpZiAoIXRhclNldC5oYXMoZmlsZSkgJiYgZGVsZXRlRmlsZVByZWZpeC5zb21lKHByZWZpeCA9PiBmaWxlLnN0YXJ0c1dpdGgocHJlZml4KSkpIHtcbiAgICAgIGRlbGV0ZURvbmUucHVzaChmcy5yZW1vdmUoUGF0aC5yZXNvbHZlKCd0YXJiYWxscycsIGZpbGUpKSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBQcm9taXNlLmFsbChkZWxldGVEb25lKTtcbiAgLy8gbG9nLmluZm8oJ1lvdSBtYXkgZGVsZXRlIG9sZCB2ZXJzaW9uIHRhciBmaWxlIGJ5IGV4ZWN1dGUgY29tbWFuZHM6XFxuJyArIGNtZCk7XG59XG4iXX0=