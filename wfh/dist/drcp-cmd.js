"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_queue_1 = __importDefault(require("promise-queue"));
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
            const q = new promise_queue_1.default(5, Infinity);
            const done = pgPaths.map(packageDir => q.add(() => npmPack(packageDir)));
            let tarInfos = yield Promise.all(done);
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
        const promises = [];
        // var count = 0;
        const q = new promise_queue_1.default(5, Infinity);
        const recipe2packages = {};
        const package2tarball = {};
        recipeManager.eachRecipeSrc(argv.pj, function (src, recipeDir) {
            if (!recipeDir)
                return;
            const data = JSON.parse(fs.readFileSync(Path.join(recipeDir, 'package.json'), 'utf8'));
            recipe2packages[data.name + '@' + data.version] = data.dependencies;
        });
        // tslint:disable-next-line: max-line-length
        packageUtils.findAllPackages((name, entryPath, parsedName, json, packagePath) => {
            promises.push(q.add(() => npmPack(packagePath)));
        }, 'src', argv.projectDir);
        let tarInfos = yield Promise.all(promises);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJjcC1jbWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9kcmNwLWNtZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLGtFQUE4QjtBQUM5QiwwQ0FBNEI7QUFDNUIsNkNBQStCO0FBQy9CLDJDQUE2QjtBQUM3QixtREFBNkM7QUFDN0MsbUNBQWtDO0FBQ2xDLGdFQUFrRDtBQUNsRCxzRUFBaUU7QUFDakUsa0ZBQTZFO0FBQzdFLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN4QyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBRXRDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQy9ELDhEQUE4RDtBQUM5RCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3BELDJDQUEyQztBQUMzQyxtREFBbUQ7QUFFbkQsU0FBc0IsSUFBSSxDQUFDLElBQVM7O1FBQ2xDLElBQUksSUFBSSxDQUFDLEVBQUU7WUFDVCxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUzQixNQUFNLGVBQWUsR0FBNkIsRUFBRSxDQUFDO1FBQ3JELElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNqQixNQUFNLE9BQU8sR0FBYSxJQUFJLENBQUMsUUFBUSxDQUFDO1lBRXhDLE1BQU0sQ0FBQyxHQUFHLElBQUksdUJBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDN0IsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6RSxJQUFJLFFBQVEs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VSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUU7WUFDakYsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM1RDtLQUNGO0lBQ0QsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQy9CLGdGQUFnRjtBQUNsRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgUSBmcm9tICdwcm9taXNlLXF1ZXVlJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge3Byb21pc2lmeUV4ZX0gZnJvbSAnLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCB7Ym94U3RyaW5nfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCAqIGFzIHJlY2lwZU1hbmFnZXIgZnJvbSAnLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQganNvblBhcnNlciwge09iamVjdEFzdCwgVG9rZW59IGZyb20gJy4vdXRpbHMvanNvbi1wYXJzZXInO1xuaW1wb3J0IHJlcGxhY2VDb2RlLCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9wYXRjaC10ZXh0JztcbmNvbnN0IGNvbmZpZyA9IHJlcXVpcmUoJy4uL2xpYi9jb25maWcnKTtcbnJlcXVpcmUoJy4uL2xpYi9sb2dDb25maWcnKShjb25maWcoKSk7XG5cbmNvbnN0IHBhY2thZ2VVdGlscyA9IHJlcXVpcmUoJy4uL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpO1xuLy8gY29uc3QgcmVjaXBlTWFuYWdlciA9IHJlcXVpcmUoJy4uL2xpYi9ndWxwL3JlY2lwZU1hbmFnZXInKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignZHJjcC1jbWQnKTtcbi8vIGNvbnN0IG5hbWVQYXQgPSAvbmFtZTpcXHMrKFteIFxcblxccl0rKS9taTtcbi8vIGNvbnN0IGZpbGVOYW1lUGF0ID0gL2ZpbGVuYW1lOlxccysoW14gXFxuXFxyXSspL21pO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFjayhhcmd2OiBhbnkpIHtcbiAgaWYgKGFyZ3YucGopXG4gICAgcmV0dXJuIHBhY2tQcm9qZWN0KGFyZ3YpO1xuXG4gIGNvbnN0IHBhY2thZ2UydGFyYmFsbDoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gIGlmIChhcmd2LnBhY2thZ2VzKSB7XG4gICAgY29uc3QgcGdQYXRoczogc3RyaW5nW10gPSBhcmd2LnBhY2thZ2VzO1xuXG4gICAgY29uc3QgcSA9IG5ldyBRKDUsIEluZmluaXR5KTtcbiAgICBjb25zdCBkb25lID0gcGdQYXRocy5tYXAocGFja2FnZURpciA9PiBxLmFkZCgoKSA9PiBucG1QYWNrKHBhY2thZ2VEaXIpKSk7XG4gICAgbGV0IHRhckluZm9zID0gYXdhaXQgUHJvbWlzZS5hbGwoZG9uZSk7XG4gICAgdGFySW5mb3MgPSB0YXJJbmZvcy5maWx0ZXIoaXRlbSA9PiBpdGVtICE9IG51bGwpO1xuICAgIHRhckluZm9zLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICBwYWNrYWdlMnRhcmJhbGxbaXRlbSEubmFtZV0gPSAnLi90YXJiYWxscy8nICsgaXRlbSEuZmlsZW5hbWU7XG4gICAgfSk7XG4gICAgYXdhaXQgZGVsZXRlT2xkVGFyKHRhckluZm9zLm1hcChpdGVtID0+IGl0ZW0hLm5hbWUucmVwbGFjZSgnQCcsICcnKS5yZXBsYWNlKC9bL1xcXFxdL2csICctJykpLFxuICAgICAgdGFySW5mb3MubWFwKGl0ZW0gPT4gaXRlbSEuZmlsZW5hbWUpKTtcbiAgICBjaGFuZ2VQYWNrYWdlSnNvbihwYWNrYWdlMnRhcmJhbGwpO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYWNrUHJvamVjdChhcmd2OiBhbnkpIHtcbiAgZnMubWtkaXJwU3luYygndGFyYmFsbHMnKTtcbiAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8YW55PltdID0gW107XG4gIC8vIHZhciBjb3VudCA9IDA7XG4gIGNvbnN0IHEgPSBuZXcgUSg1LCBJbmZpbml0eSk7XG4gIGNvbnN0IHJlY2lwZTJwYWNrYWdlczoge1tyZWNpcGU6IHN0cmluZ106IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfX0gPSB7fTtcbiAgY29uc3QgcGFja2FnZTJ0YXJiYWxsOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcblxuICByZWNpcGVNYW5hZ2VyLmVhY2hSZWNpcGVTcmMoYXJndi5waiwgZnVuY3Rpb24oc3JjOiBzdHJpbmcsIHJlY2lwZURpcjogc3RyaW5nKSB7XG4gICAgaWYgKCFyZWNpcGVEaXIpXG4gICAgICByZXR1cm47XG4gICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKFBhdGguam9pbihyZWNpcGVEaXIsICdwYWNrYWdlLmpzb24nKSwgJ3V0ZjgnKSk7XG4gICAgcmVjaXBlMnBhY2thZ2VzW2RhdGEubmFtZSArICdAJyArIGRhdGEudmVyc2lvbl0gPSBkYXRhLmRlcGVuZGVuY2llcztcbiAgfSk7XG5cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbiAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcygobmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZTogc3RyaW5nLCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBwcm9taXNlcy5wdXNoKFxuICAgICAgcS5hZGQoKCkgPT4gbnBtUGFjayhwYWNrYWdlUGF0aCkpKTtcbiAgfSwgJ3NyYycsIGFyZ3YucHJvamVjdERpcik7XG5cblxuICBsZXQgdGFySW5mb3MgPSBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gIHRhckluZm9zID0gdGFySW5mb3MuZmlsdGVyKGl0ZW0gPT4gaXRlbSAhPSBudWxsKTtcbiAgdGFySW5mb3MuZm9yRWFjaChpdGVtID0+IHtcbiAgICBwYWNrYWdlMnRhcmJhbGxbaXRlbSEubmFtZV0gPSAnLi90YXJiYWxscy8nICsgaXRlbSEuZmlsZW5hbWU7XG4gIH0pO1xuXG4gIF8uZWFjaChyZWNpcGUycGFja2FnZXMsIChwYWNrYWdlcywgcmVjaXBlKSA9PiB7XG4gICAgXy5lYWNoKHBhY2thZ2VzLCAodmVyLCBuYW1lKSA9PiB7XG4gICAgICBwYWNrYWdlc1tuYW1lXSA9IHBhY2thZ2UydGFyYmFsbFtuYW1lXTtcbiAgICB9KTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGJveFN0cmluZygncmVjaXBlOicgKyByZWNpcGUgKyAnLCB5b3UgbmVlZCB0byBjb3B5IGZvbGxvd2luZyBkZXBlbmRlbmNpZXMgdG8geW91ciBwYWNrYWdlLmpzb25cXG4nKSk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShwYWNrYWdlcywgbnVsbCwgJyAgJykpO1xuICB9KTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coYm94U3RyaW5nKGBUYXJiYWxsIGZpbGVzIGhhdmUgYmVlbiB3cml0dGVuIHRvICR7UGF0aC5yZXNvbHZlKCd0YXJiYWxscycpfWApKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbnBtUGFjayhwYWNrYWdlUGF0aDogc3RyaW5nKTpcbiAgUHJvbWlzZTx7bmFtZTogc3RyaW5nLCBmaWxlbmFtZTogc3RyaW5nfSB8IG51bGw+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBvdXRwdXQgPSBhd2FpdCBwcm9taXNpZnlFeGUoJ25wbScsICdwYWNrJywgUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoKSxcbiAgICAgIHtzaWxlbnQ6IHRydWUsIGN3ZDogUGF0aC5yZXNvbHZlKCd0YXJiYWxscycpfSk7XG4gICAgY29uc3QgcmVzdWx0SW5mbyA9IHBhcnNlTnBtUGFja091dHB1dChvdXRwdXQpO1xuXG4gICAgY29uc3QgcGFja2FnZU5hbWUgPSByZXN1bHRJbmZvLmdldCgnbmFtZScpITtcbiAgICAvLyBjYihwYWNrYWdlTmFtZSwgcmVzdWx0SW5mby5nZXQoJ2ZpbGVuYW1lJykhKTtcbiAgICBsb2cuaW5mbyhvdXRwdXQpO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBwYWNrYWdlTmFtZSxcbiAgICAgIGZpbGVuYW1lOiByZXN1bHRJbmZvLmdldCgnZmlsZW5hbWUnKSFcbiAgICB9O1xuICB9IGNhdGNoIChlKSB7XG4gICAgaGFuZGxlRXhwdGlvbihwYWNrYWdlUGF0aCwgZSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gY2hhbmdlUGFja2FnZUpzb24ocGFja2FnZTJ0YXJiYWxsOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30pIHtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKCdwYWNrYWdlLmpzb24nKSkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ0NvdWxkIG5vdCBmaW5kIHBhY2thZ2UuanNvbi4nKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgcGtqID0gZnMuY3JlYXRlUmVhZFN0cmVhbSgncGFja2FnZS5qc29uJywgJ3V0ZjgnKTtcbiAgY29uc3QgYXN0ID0gYXdhaXQganNvblBhcnNlcihwa2opO1xuICBjb25zdCBkZXBzQXN0ID0gYXN0LnByb3BlcnRpZXMuZmluZCgoe25hbWV9KSA9PiBKU09OLnBhcnNlKG5hbWUudGV4dCkgPT09ICdkZXBlbmRlbmNpZXMnKTtcbiAgY29uc3QgZGV2RGVwc0FzdCA9IGFzdC5wcm9wZXJ0aWVzLmZpbmQoKHtuYW1lfSkgPT4gSlNPTi5wYXJzZShuYW1lLnRleHQpID09PSAnZGV2RGVwZW5kZW5jaWVzJyk7XG4gIGNvbnN0IHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuICBpZiAoZGVwc0FzdCkge1xuICAgIGNoYW5nZURlcGVuZGVuY2llcyhkZXBzQXN0LnZhbHVlIGFzIE9iamVjdEFzdCk7XG4gIH1cbiAgaWYgKGRldkRlcHNBc3QpIHtcbiAgICBjaGFuZ2VEZXBlbmRlbmNpZXMoZGV2RGVwc0FzdC52YWx1ZSBhcyBPYmplY3RBc3QpO1xuICB9XG5cbiAgaWYgKHJlcGxhY2VtZW50cy5sZW5ndGggPiAwKVxuICAgIGZzLndyaXRlRmlsZVN5bmMoJ3BhY2thZ2UuanNvbicsIHJlcGxhY2VDb2RlKGZzLnJlYWRGaWxlU3luYygncGFja2FnZS5qc29uJywgJ3V0ZjgnKSwgcmVwbGFjZW1lbnRzKSk7XG5cbiAgZnVuY3Rpb24gY2hhbmdlRGVwZW5kZW5jaWVzKGRlcHM6IE9iamVjdEFzdCkge1xuXG4gICAgY29uc3QgZm91bmREZXBzID0gZGVwcy5wcm9wZXJ0aWVzLmZpbHRlcigoe25hbWV9KSA9PiBfLmhhcyhwYWNrYWdlMnRhcmJhbGwsIEpTT04ucGFyc2UobmFtZS50ZXh0KSkpO1xuICAgIGZvciAoY29uc3QgZm91bmREZXAgb2YgZm91bmREZXBzKSB7XG4gICAgICBjb25zdCB2ZXJUb2tlbiA9IGZvdW5kRGVwLnZhbHVlIGFzIFRva2VuO1xuICAgICAgY29uc3QgbmV3VmVyc2lvbiA9IHBhY2thZ2UydGFyYmFsbFtKU09OLnBhcnNlKGZvdW5kRGVwLm5hbWUudGV4dCldO1xuICAgICAgbG9nLmluZm8oYFVwZGF0ZSBwYWNrYWdlLmpzb246ICR7dmVyVG9rZW4udGV4dH0gPT4gJHtuZXdWZXJzaW9ufWApO1xuICAgICAgcmVwbGFjZW1lbnRzLnB1c2goe1xuICAgICAgICBzdGFydDogdmVyVG9rZW4ucG9zLFxuICAgICAgICBlbmQ6IHZlclRva2VuLmVuZCEsXG4gICAgICAgIHRleHQ6IEpTT04uc3RyaW5naWZ5KG5ld1ZlcnNpb24pXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRXhwdGlvbihwYWNrYWdlUGF0aDogc3RyaW5nLCBlOiBFcnJvcikge1xuICBpZiAoZSAmJiBlLm1lc3NhZ2UgJiYgZS5tZXNzYWdlLmluZGV4T2YoJ0VQVUJMSVNIQ09ORkxJQ1QnKSA+IDApXG4gICAgbG9nLmluZm8oYG5wbSBwYWNrICR7cGFja2FnZVBhdGh9OiBFUFVCTElTSENPTkZMSUNULmApO1xuICBlbHNlXG4gICAgbG9nLmVycm9yKHBhY2thZ2VQYXRoLCBlKTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBvdXRwdXQgXG4gKiBlLmcuXG5ucG0gbm90aWNlID09PSBUYXJiYWxsIERldGFpbHMgPT09IFxubnBtIG5vdGljZSBuYW1lOiAgICAgICAgICByZXF1aXJlLWluamVjdG9yICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHZlcnNpb246ICAgICAgIDUuMS41ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgZmlsZW5hbWU6ICAgICAgcmVxdWlyZS1pbmplY3Rvci01LjEuNS50Z3ogICAgICAgICAgICAgIFxubnBtIG5vdGljZSBwYWNrYWdlIHNpemU6ICA1Ni45IGtCICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHVucGFja2VkIHNpemU6IDIyOS4xIGtCICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2Ugc2hhc3VtOiAgICAgICAgYzA2OTMyNzBjMTQwZjY1YTY5NjIwN2FiOWRlYjE4ZTY0NDUyYTAyY1xubnBtIG5vdGljZSBpbnRlZ3JpdHk6ICAgICBzaGE1MTIta1JHVldjdzFmdlE1SlsuLi5dQUJ3TFBVOFV2U3RiQT09XG5ucG0gbm90aWNlIHRvdGFsIGZpbGVzOiAgIDQ3ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgXG5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTnBtUGFja091dHB1dChvdXRwdXQ6IHN0cmluZykge1xuICBjb25zdCBsaW5lcyA9IG91dHB1dC5zcGxpdCgvXFxyP1xcbi8pO1xuICBjb25zdCBsaW5lc09mZnNldCA9IF8uZmluZExhc3RJbmRleChsaW5lcywgbGluZSA9PiBsaW5lLmluZGV4T2YoJ1RhcmJhbGwgRGV0YWlscycpID49IDApO1xuICBjb25zdCB0YXJiYWxsSW5mbyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGxpbmVzLnNsaWNlKGxpbmVzT2Zmc2V0KS5mb3JFYWNoKGxpbmUgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0gL25wbSBub3RpY2VcXHMrKFteOl0rKVs6XVxccyooLis/KVxccyokLy5leGVjKGxpbmUpO1xuICAgIGlmICghbWF0Y2gpXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gdGFyYmFsbEluZm8uc2V0KG1hdGNoWzFdLCBtYXRjaFsyXSk7XG4gIH0pO1xuICByZXR1cm4gdGFyYmFsbEluZm87XG59XG5cbmZ1bmN0aW9uIGRlbGV0ZU9sZFRhcihkZWxldGVGaWxlUHJlZml4OiBzdHJpbmdbXSwga2VlcGZpbGVzOiBzdHJpbmdbXSkge1xuICBjb25zdCB0YXJTZXQgPSBuZXcgU2V0KGtlZXBmaWxlcyk7XG4gIGNvbnN0IGRlbGV0ZURvbmU6IFByb21pc2U8YW55PltdID0gW107XG4gIGZvciAoY29uc3QgZmlsZSBvZiBmcy5yZWFkZGlyU3luYygndGFyYmFsbHMnKSkge1xuICAgIGlmICghdGFyU2V0LmhhcyhmaWxlKSAmJiBkZWxldGVGaWxlUHJlZml4LnNvbWUocHJlZml4ID0+IGZpbGUuc3RhcnRzV2l0aChwcmVmaXgpKSkge1xuICAgICAgZGVsZXRlRG9uZS5wdXNoKGZzLnJlbW92ZShQYXRoLnJlc29sdmUoJ3RhcmJhbGxzJywgZmlsZSkpKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFByb21pc2UuYWxsKGRlbGV0ZURvbmUpO1xuICAvLyBsb2cuaW5mbygnWW91IG1heSBkZWxldGUgb2xkIHZlcnNpb24gdGFyIGZpbGUgYnkgZXhlY3V0ZSBjb21tYW5kczpcXG4nICsgY21kKTtcbn1cbiJdfQ==