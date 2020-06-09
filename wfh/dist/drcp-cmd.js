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
const json_sync_parser_1 = __importDefault(require("./utils/json-sync-parser"));
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
    if (!fs.existsSync('package.json')) {
        // tslint:disable-next-line:no-console
        console.log('Could not find package.json.');
        return;
    }
    const pkj = fs.readFileSync('package.json', 'utf8');
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
    if (!fs.existsSync('tarballs'))
        fs.mkdirpSync('tarballs');
    // TODO: wait for timeout
    for (const file of fs.readdirSync('tarballs')) {
        if (!tarSet.has(file) && deleteFilePrefix.some(prefix => file.startsWith(prefix))) {
            deleteDone.push(fs.remove(Path.resolve('tarballs', file)));
        }
    }
    return Promise.all(deleteDone);
    // log.info('You may delete old version tar file by execute commands:\n' + cmd);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJjcC1jbWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9kcmNwLWNtZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDJEQUFzRDtBQUN0RCwwQ0FBNEI7QUFDNUIsNkNBQStCO0FBQy9CLDJDQUE2QjtBQUM3QixtREFBNkM7QUFDN0MsbUNBQWtDO0FBQ2xDLGdFQUFrRDtBQUNsRCxnRkFBc0U7QUFDdEUsa0ZBQTZFO0FBQzdFLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN4QyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBRXRDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQy9ELDhEQUE4RDtBQUM5RCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3BELDJDQUEyQztBQUMzQyxtREFBbUQ7QUFFbkQsU0FBc0IsSUFBSSxDQUFDLElBQVM7O1FBQ2xDLElBQUksSUFBSSxDQUFDLEVBQUU7WUFDVCxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUzQixNQUFNLGVBQWUsR0FBNkIsRUFBRSxDQUFDO1FBQ3JELElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNqQixNQUFNLE9BQU8sR0FBYSxJQUFJLENBQUMsUUFBUSxDQUFDO1lBRXhDLE1BQU0sSUFBSSxHQUFHLHdCQUFPLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlFLElBQUksUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDO1lBRTFCLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUks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QUMsRUFBRTtZQUNqRixVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzVEO0tBQ0Y7SUFDRCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDL0IsZ0ZBQWdGO0FBQ2xGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCB7cXVldWVVcCwgcXVldWV9IGZyb20gJy4vdXRpbHMvcHJvbWlzZS1xdWVxdWUnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7cHJvbWlzaWZ5RXhlfSBmcm9tICcuL3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IHtib3hTdHJpbmd9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0ICogYXMgcmVjaXBlTWFuYWdlciBmcm9tICcuL3JlY2lwZS1tYW5hZ2VyJztcbmltcG9ydCBqc29uUGFyc2VyLCB7T2JqZWN0QXN0LCBUb2tlbn0gZnJvbSAnLi91dGlscy9qc29uLXN5bmMtcGFyc2VyJztcbmltcG9ydCByZXBsYWNlQ29kZSwge1JlcGxhY2VtZW50SW5mfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvcGF0Y2gtdGV4dCc7XG5jb25zdCBjb25maWcgPSByZXF1aXJlKCcuLi9saWIvY29uZmlnJyk7XG5yZXF1aXJlKCcuLi9saWIvbG9nQ29uZmlnJykoY29uZmlnKCkpO1xuXG5jb25zdCBwYWNrYWdlVXRpbHMgPSByZXF1aXJlKCcuLi9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKTtcbi8vIGNvbnN0IHJlY2lwZU1hbmFnZXIgPSByZXF1aXJlKCcuLi9saWIvZ3VscC9yZWNpcGVNYW5hZ2VyJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ2RyY3AtY21kJyk7XG4vLyBjb25zdCBuYW1lUGF0ID0gL25hbWU6XFxzKyhbXiBcXG5cXHJdKykvbWk7XG4vLyBjb25zdCBmaWxlTmFtZVBhdCA9IC9maWxlbmFtZTpcXHMrKFteIFxcblxccl0rKS9taTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBhY2soYXJndjogYW55KSB7XG4gIGlmIChhcmd2LnBqKVxuICAgIHJldHVybiBwYWNrUHJvamVjdChhcmd2KTtcblxuICBjb25zdCBwYWNrYWdlMnRhcmJhbGw6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICBpZiAoYXJndi5wYWNrYWdlcykge1xuICAgIGNvbnN0IHBnUGF0aHM6IHN0cmluZ1tdID0gYXJndi5wYWNrYWdlcztcblxuICAgIGNvbnN0IGRvbmUgPSBxdWV1ZVVwKDMsIHBnUGF0aHMubWFwKHBhY2thZ2VEaXIgPT4gKCkgPT4gbnBtUGFjayhwYWNrYWdlRGlyKSkpO1xuICAgIGxldCB0YXJJbmZvcyA9IGF3YWl0IGRvbmU7XG5cbiAgICB0YXJJbmZvcyA9IHRhckluZm9zLmZpbHRlcihpdGVtID0+IGl0ZW0gIT0gbnVsbCk7XG4gICAgdGFySW5mb3MuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgIHBhY2thZ2UydGFyYmFsbFtpdGVtIS5uYW1lXSA9ICcuL3RhcmJhbGxzLycgKyBpdGVtIS5maWxlbmFtZTtcbiAgICB9KTtcbiAgICBhd2FpdCBkZWxldGVPbGRUYXIodGFySW5mb3MubWFwKGl0ZW0gPT4gaXRlbSEubmFtZS5yZXBsYWNlKCdAJywgJycpLnJlcGxhY2UoL1svXFxcXF0vZywgJy0nKSksXG4gICAgICB0YXJJbmZvcy5tYXAoaXRlbSA9PiBpdGVtIS5maWxlbmFtZSkpO1xuICAgIGNoYW5nZVBhY2thZ2VKc29uKHBhY2thZ2UydGFyYmFsbCk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBhY2tQcm9qZWN0KGFyZ3Y6IGFueSkge1xuICBmcy5ta2RpcnBTeW5jKCd0YXJiYWxscycpO1xuICAvLyB2YXIgY291bnQgPSAwO1xuICBjb25zdCByZWNpcGUycGFja2FnZXM6IHtbcmVjaXBlOiBzdHJpbmddOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ319ID0ge307XG4gIGNvbnN0IHBhY2thZ2UydGFyYmFsbDoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG5cbiAgcmVjaXBlTWFuYWdlci5lYWNoUmVjaXBlU3JjKGFyZ3YucGosIGZ1bmN0aW9uKHNyYzogc3RyaW5nLCByZWNpcGVEaXI6IHN0cmluZykge1xuICAgIGlmICghcmVjaXBlRGlyKVxuICAgICAgcmV0dXJuO1xuICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhQYXRoLmpvaW4ocmVjaXBlRGlyLCAncGFja2FnZS5qc29uJyksICd1dGY4JykpO1xuICAgIHJlY2lwZTJwYWNrYWdlc1tkYXRhLm5hbWUgKyAnQCcgKyBkYXRhLnZlcnNpb25dID0gZGF0YS5kZXBlbmRlbmNpZXM7XG4gIH0pO1xuXG4gIGNvbnN0IHBhY2tBY3Rpb25zID0gW10gYXMgQXJyYXk8UmV0dXJuVHlwZTx0eXBlb2YgbnBtUGFjaz4+O1xuICBjb25zdCB7YWRkfSA9IHF1ZXVlKDMpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG1heC1saW5lLWxlbmd0aFxuICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKChuYW1lOiBzdHJpbmcsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiBzdHJpbmcsIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykgPT4ge1xuICAgIHBhY2tBY3Rpb25zLnB1c2goYWRkKCgpID0+IG5wbVBhY2socGFja2FnZVBhdGgpKSk7XG4gIH0sICdzcmMnLCBhcmd2LnByb2plY3REaXIpO1xuXG5cbiAgbGV0IHRhckluZm9zID0gYXdhaXQgUHJvbWlzZS5hbGwocGFja0FjdGlvbnMpO1xuICB0YXJJbmZvcyA9IHRhckluZm9zLmZpbHRlcihpdGVtID0+IGl0ZW0gIT0gbnVsbCk7XG4gIHRhckluZm9zLmZvckVhY2goaXRlbSA9PiB7XG4gICAgcGFja2FnZTJ0YXJiYWxsW2l0ZW0hLm5hbWVdID0gJy4vdGFyYmFsbHMvJyArIGl0ZW0hLmZpbGVuYW1lO1xuICB9KTtcblxuICBfLmVhY2gocmVjaXBlMnBhY2thZ2VzLCAocGFja2FnZXMsIHJlY2lwZSkgPT4ge1xuICAgIF8uZWFjaChwYWNrYWdlcywgKHZlciwgbmFtZSkgPT4ge1xuICAgICAgcGFja2FnZXNbbmFtZV0gPSBwYWNrYWdlMnRhcmJhbGxbbmFtZV07XG4gICAgfSk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhib3hTdHJpbmcoJ3JlY2lwZTonICsgcmVjaXBlICsgJywgeW91IG5lZWQgdG8gY29weSBmb2xsb3dpbmcgZGVwZW5kZW5jaWVzIHRvIHlvdXIgcGFja2FnZS5qc29uXFxuJykpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkocGFja2FnZXMsIG51bGwsICcgICcpKTtcbiAgfSk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKGJveFN0cmluZyhgVGFyYmFsbCBmaWxlcyBoYXZlIGJlZW4gd3JpdHRlbiB0byAke1BhdGgucmVzb2x2ZSgndGFyYmFsbHMnKX1gKSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG5wbVBhY2socGFja2FnZVBhdGg6IHN0cmluZyk6XG4gIFByb21pc2U8e25hbWU6IHN0cmluZywgZmlsZW5hbWU6IHN0cmluZ30gfCBudWxsPiB7XG4gIHRyeSB7XG4gICAgY29uc3Qgb3V0cHV0ID0gYXdhaXQgcHJvbWlzaWZ5RXhlKCducG0nLCAncGFjaycsIFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCksXG4gICAgICB7c2lsZW50OiB0cnVlLCBjd2Q6IFBhdGgucmVzb2x2ZSgndGFyYmFsbHMnKX0pO1xuICAgIGNvbnN0IHJlc3VsdEluZm8gPSBwYXJzZU5wbVBhY2tPdXRwdXQob3V0cHV0KTtcblxuICAgIGNvbnN0IHBhY2thZ2VOYW1lID0gcmVzdWx0SW5mby5nZXQoJ25hbWUnKSE7XG4gICAgLy8gY2IocGFja2FnZU5hbWUsIHJlc3VsdEluZm8uZ2V0KCdmaWxlbmFtZScpISk7XG4gICAgbG9nLmluZm8ob3V0cHV0KTtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogcGFja2FnZU5hbWUsXG4gICAgICBmaWxlbmFtZTogcmVzdWx0SW5mby5nZXQoJ2ZpbGVuYW1lJykhXG4gICAgfTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGhhbmRsZUV4cHRpb24ocGFja2FnZVBhdGgsIGUpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNoYW5nZVBhY2thZ2VKc29uKHBhY2thZ2UydGFyYmFsbDoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9KSB7XG4gIGlmICghZnMuZXhpc3RzU3luYygncGFja2FnZS5qc29uJykpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdDb3VsZCBub3QgZmluZCBwYWNrYWdlLmpzb24uJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHBraiA9IGZzLnJlYWRGaWxlU3luYygncGFja2FnZS5qc29uJywgJ3V0ZjgnKTtcbiAgY29uc3QgYXN0ID0ganNvblBhcnNlcihwa2opO1xuICBjb25zdCBkZXBzQXN0ID0gYXN0LnByb3BlcnRpZXMuZmluZCgoe25hbWV9KSA9PiBKU09OLnBhcnNlKG5hbWUudGV4dCkgPT09ICdkZXBlbmRlbmNpZXMnKTtcbiAgY29uc3QgZGV2RGVwc0FzdCA9IGFzdC5wcm9wZXJ0aWVzLmZpbmQoKHtuYW1lfSkgPT4gSlNPTi5wYXJzZShuYW1lLnRleHQpID09PSAnZGV2RGVwZW5kZW5jaWVzJyk7XG4gIGNvbnN0IHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuICBpZiAoZGVwc0FzdCkge1xuICAgIGNoYW5nZURlcGVuZGVuY2llcyhkZXBzQXN0LnZhbHVlIGFzIE9iamVjdEFzdCk7XG4gIH1cbiAgaWYgKGRldkRlcHNBc3QpIHtcbiAgICBjaGFuZ2VEZXBlbmRlbmNpZXMoZGV2RGVwc0FzdC52YWx1ZSBhcyBPYmplY3RBc3QpO1xuICB9XG5cbiAgaWYgKHJlcGxhY2VtZW50cy5sZW5ndGggPiAwKVxuICAgIGZzLndyaXRlRmlsZVN5bmMoJ3BhY2thZ2UuanNvbicsIHJlcGxhY2VDb2RlKGZzLnJlYWRGaWxlU3luYygncGFja2FnZS5qc29uJywgJ3V0ZjgnKSwgcmVwbGFjZW1lbnRzKSk7XG5cbiAgZnVuY3Rpb24gY2hhbmdlRGVwZW5kZW5jaWVzKGRlcHM6IE9iamVjdEFzdCkge1xuXG4gICAgY29uc3QgZm91bmREZXBzID0gZGVwcy5wcm9wZXJ0aWVzLmZpbHRlcigoe25hbWV9KSA9PiBfLmhhcyhwYWNrYWdlMnRhcmJhbGwsIEpTT04ucGFyc2UobmFtZS50ZXh0KSkpO1xuICAgIGZvciAoY29uc3QgZm91bmREZXAgb2YgZm91bmREZXBzKSB7XG4gICAgICBjb25zdCB2ZXJUb2tlbiA9IGZvdW5kRGVwLnZhbHVlIGFzIFRva2VuO1xuICAgICAgY29uc3QgbmV3VmVyc2lvbiA9IHBhY2thZ2UydGFyYmFsbFtKU09OLnBhcnNlKGZvdW5kRGVwLm5hbWUudGV4dCldO1xuICAgICAgbG9nLmluZm8oYFVwZGF0ZSBwYWNrYWdlLmpzb246ICR7dmVyVG9rZW4udGV4dH0gPT4gJHtuZXdWZXJzaW9ufWApO1xuICAgICAgcmVwbGFjZW1lbnRzLnB1c2goe1xuICAgICAgICBzdGFydDogdmVyVG9rZW4ucG9zLFxuICAgICAgICBlbmQ6IHZlclRva2VuLmVuZCEsXG4gICAgICAgIHRleHQ6IEpTT04uc3RyaW5naWZ5KG5ld1ZlcnNpb24pXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRXhwdGlvbihwYWNrYWdlUGF0aDogc3RyaW5nLCBlOiBFcnJvcikge1xuICBpZiAoZSAmJiBlLm1lc3NhZ2UgJiYgZS5tZXNzYWdlLmluZGV4T2YoJ0VQVUJMSVNIQ09ORkxJQ1QnKSA+IDApXG4gICAgbG9nLmluZm8oYG5wbSBwYWNrICR7cGFja2FnZVBhdGh9OiBFUFVCTElTSENPTkZMSUNULmApO1xuICBlbHNlXG4gICAgbG9nLmVycm9yKHBhY2thZ2VQYXRoLCBlKTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBvdXRwdXQgXG4gKiBlLmcuXG5ucG0gbm90aWNlID09PSBUYXJiYWxsIERldGFpbHMgPT09IFxubnBtIG5vdGljZSBuYW1lOiAgICAgICAgICByZXF1aXJlLWluamVjdG9yICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHZlcnNpb246ICAgICAgIDUuMS41ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgZmlsZW5hbWU6ICAgICAgcmVxdWlyZS1pbmplY3Rvci01LjEuNS50Z3ogICAgICAgICAgICAgIFxubnBtIG5vdGljZSBwYWNrYWdlIHNpemU6ICA1Ni45IGtCICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHVucGFja2VkIHNpemU6IDIyOS4xIGtCICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2Ugc2hhc3VtOiAgICAgICAgYzA2OTMyNzBjMTQwZjY1YTY5NjIwN2FiOWRlYjE4ZTY0NDUyYTAyY1xubnBtIG5vdGljZSBpbnRlZ3JpdHk6ICAgICBzaGE1MTIta1JHVldjdzFmdlE1SlsuLi5dQUJ3TFBVOFV2U3RiQT09XG5ucG0gbm90aWNlIHRvdGFsIGZpbGVzOiAgIDQ3ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgXG5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTnBtUGFja091dHB1dChvdXRwdXQ6IHN0cmluZykge1xuICBjb25zdCBsaW5lcyA9IG91dHB1dC5zcGxpdCgvXFxyP1xcbi8pO1xuICBjb25zdCBsaW5lc09mZnNldCA9IF8uZmluZExhc3RJbmRleChsaW5lcywgbGluZSA9PiBsaW5lLmluZGV4T2YoJ1RhcmJhbGwgRGV0YWlscycpID49IDApO1xuICBjb25zdCB0YXJiYWxsSW5mbyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGxpbmVzLnNsaWNlKGxpbmVzT2Zmc2V0KS5mb3JFYWNoKGxpbmUgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0gL25wbSBub3RpY2VcXHMrKFteOl0rKVs6XVxccyooLis/KVxccyokLy5leGVjKGxpbmUpO1xuICAgIGlmICghbWF0Y2gpXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gdGFyYmFsbEluZm8uc2V0KG1hdGNoWzFdLCBtYXRjaFsyXSk7XG4gIH0pO1xuICByZXR1cm4gdGFyYmFsbEluZm87XG59XG5cbmZ1bmN0aW9uIGRlbGV0ZU9sZFRhcihkZWxldGVGaWxlUHJlZml4OiBzdHJpbmdbXSwga2VlcGZpbGVzOiBzdHJpbmdbXSkge1xuICBjb25zdCB0YXJTZXQgPSBuZXcgU2V0KGtlZXBmaWxlcyk7XG4gIGNvbnN0IGRlbGV0ZURvbmU6IFByb21pc2U8YW55PltdID0gW107XG4gIGlmICghZnMuZXhpc3RzU3luYygndGFyYmFsbHMnKSlcbiAgICBmcy5ta2RpcnBTeW5jKCd0YXJiYWxscycpO1xuICAvLyBUT0RPOiB3YWl0IGZvciB0aW1lb3V0XG4gIGZvciAoY29uc3QgZmlsZSBvZiBmcy5yZWFkZGlyU3luYygndGFyYmFsbHMnKSkge1xuICAgIGlmICghdGFyU2V0LmhhcyhmaWxlKSAmJiBkZWxldGVGaWxlUHJlZml4LnNvbWUocHJlZml4ID0+IGZpbGUuc3RhcnRzV2l0aChwcmVmaXgpKSkge1xuICAgICAgZGVsZXRlRG9uZS5wdXNoKGZzLnJlbW92ZShQYXRoLnJlc29sdmUoJ3RhcmJhbGxzJywgZmlsZSkpKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFByb21pc2UuYWxsKGRlbGV0ZURvbmUpO1xuICAvLyBsb2cuaW5mbygnWW91IG1heSBkZWxldGUgb2xkIHZlcnNpb24gdGFyIGZpbGUgYnkgZXhlY3V0ZSBjb21tYW5kczpcXG4nICsgY21kKTtcbn1cbiJdfQ==