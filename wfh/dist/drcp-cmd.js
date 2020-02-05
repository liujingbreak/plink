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
    for (const file of fs.readdirSync('tarballs')) {
        if (!tarSet.has(file) && deleteFilePrefix.some(prefix => file.startsWith(prefix))) {
            deleteDone.push(fs.remove(Path.resolve('tarballs', file)));
        }
    }
    return Promise.all(deleteDone);
    // log.info('You may delete old version tar file by execute commands:\n' + cmd);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJjcC1jbWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9kcmNwLWNtZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDJEQUFzRDtBQUN0RCwwQ0FBNEI7QUFDNUIsNkNBQStCO0FBQy9CLDJDQUE2QjtBQUM3QixtREFBNkM7QUFDN0MsbUNBQWtDO0FBQ2xDLGdFQUFrRDtBQUNsRCxnRkFBc0U7QUFDdEUsa0ZBQTZFO0FBQzdFLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN4QyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBRXRDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQy9ELDhEQUE4RDtBQUM5RCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3BELDJDQUEyQztBQUMzQyxtREFBbUQ7QUFFbkQsU0FBc0IsSUFBSSxDQUFDLElBQVM7O1FBQ2xDLElBQUksSUFBSSxDQUFDLEVBQUU7WUFDVCxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUzQixNQUFNLGVBQWUsR0FBNkIsRUFBRSxDQUFDO1FBQ3JELElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNqQixNQUFNLE9BQU8sR0FBYSxJQUFJLENBQUMsUUFBUSxDQUFDO1lBRXhDLE1BQU0sSUFBSSxHQUFHLHdCQUFPLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlFLElBQUksUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDO1lBRTFCLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDO1lBQ2pELFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3RCLGVBQWUsQ0FBQyxJQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsYUFBYSxHQUFHLElBQUssQ0FBQyxRQUFRLENBQUM7WUFDL0QsQ0FBQyxDQUFDLENBQUM7WUFDSCxNQUFNLFlBQVksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFDekYsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ3hDLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxDQUFDO1NBQ3BDO0lBQ0gsQ0FBQztDQUFBO0FBbkJELG9CQW1CQztBQUVELFNBQXNCLFdBQVcsQ0FBQyxJQUFTOztRQUN6QyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzFCLGlCQUFpQjtRQUNqQixNQUFNLGVBQWUsR0FBaUQsRUFBRSxDQUFDO1FBQ3pFLE1BQU0sZUFBZSxHQUE2QixFQUFFLENBQUM7UUFFckQsYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLFVBQVMsR0FBVyxFQUFFLFNBQWlCO1lBQzFFLElBQUksQ0FBQyxTQUFTO2dCQUNaLE9BQU87WUFDVCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN2RixlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7UUFDdEUsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLFdBQVcsR0FBRyxFQUF1QyxDQUFDO1FBQzVELE1BQU0sRUFBQyxHQUFHLEVBQUMsR0FBRyxzQkFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZCLDRDQUE0QztRQUM1QyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBWSxFQUFFLFNBQWlCLEVBQUUsVUFBa0IsRUFBRSxJQUFTLEVBQUUsV0FBbUIsRUFBRSxFQUFFO1lBQ25ILFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEQsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFHM0IsSUFBSSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzlDLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDO1FBQ2pELFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdEIsZUFBZSxDQUFDLElBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxhQUFhLEdBQUcsSUFBSyxDQUFDLFFBQVEsQ0FBQztRQUMvRCxDQUFDLENBQUMsQ0FBQztRQUVILENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQzNDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFO2dCQUM3QixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pDLENBQUMsQ0FBQyxDQUFDO1lBQ0gsc0NBQXNDO1lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQVMsQ0FBQyxTQUFTLEdBQUcsTUFBTSxHQUFHLGtFQUFrRSxDQUFDLENBQUMsQ0FBQztZQUNoSCxzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNwRCxDQUFDLENBQUMsQ0FBQztRQUNILHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFTLENBQUMsc0NBQXNDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDM0YsQ0FBQztDQUFBO0FBdENELGtDQXNDQztBQUVELFNBQWUsT0FBTyxDQUFDLFdBQW1COztRQUV4QyxJQUFJO1lBQ0YsTUFBTSxNQUFNLEdBQUcsTUFBTSw0QkFBWSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFDeEUsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFDLENBQUMsQ0FBQztZQUNqRCxNQUFNLFVBQVUsR0FBRyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUU5QyxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBRSxDQUFDO1lBQzVDLGdEQUFnRDtZQUNoRCxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2pCLE9BQU87Z0JBQ0wsSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLFFBQVEsRUFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBRTthQUN0QyxDQUFDO1NBQ0g7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDOUIsT0FBTyxJQUFJLENBQUM7U0FDYjtJQUNILENBQUM7Q0FBQTtBQUVELFNBQVMsaUJBQWlCLENBQUMsZUFBeUM7SUFDbEUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLEVBQUU7UUFDbEMsc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQThCLENBQUMsQ0FBQztRQUM1QyxPQUFPO0tBQ1I7SUFDRCxNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNwRCxNQUFNLEdBQUcsR0FBRywwQkFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzVCLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssY0FBYyxDQUFDLENBQUM7SUFDMUYsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ2hHLE1BQU0sWUFBWSxHQUFxQixFQUFFLENBQUM7SUFDMUMsSUFBSSxPQUFPLEVBQUU7UUFDWCxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsS0FBa0IsQ0FBQyxDQUFDO0tBQ2hEO0lBQ0QsSUFBSSxVQUFVLEVBQUU7UUFDZCxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsS0FBa0IsQ0FBQyxDQUFDO0tBQ25EO0lBRUQsSUFBSSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUM7UUFDekIsRUFBRSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsb0JBQVcsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBRXZHLFNBQVMsa0JBQWtCLENBQUMsSUFBZTtRQUV6QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRyxLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRTtZQUNoQyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsS0FBYyxDQUFDO1lBQ3pDLE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNuRSxHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixRQUFRLENBQUMsSUFBSSxPQUFPLFVBQVUsRUFBRSxDQUFDLENBQUM7WUFDbkUsWUFBWSxDQUFDLElBQUksQ0FBQztnQkFDaEIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxHQUFHO2dCQUNuQixHQUFHLEVBQUUsUUFBUSxDQUFDLEdBQUk7Z0JBQ2xCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQzthQUNqQyxDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsV0FBbUIsRUFBRSxDQUFRO0lBQ2xELElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDO1FBQzdELEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxXQUFXLHFCQUFxQixDQUFDLENBQUM7O1FBRXZELEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzlCLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFDSCxTQUFnQixrQkFBa0IsQ0FBQyxNQUFjO0lBQy9DLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDcEMsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDekYsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7SUFDOUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDdEMsTUFBTSxLQUFLLEdBQUcscUNBQXFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9ELElBQUksQ0FBQyxLQUFLO1lBQ1IsT0FBTyxJQUFJLENBQUM7UUFDZCxPQUFPLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdDLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxXQUFXLENBQUM7QUFDckIsQ0FBQztBQVhELGdEQVdDO0FBRUQsU0FBUyxZQUFZLENBQUMsZ0JBQTBCLEVBQUUsU0FBbUI7SUFDbkUsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbEMsTUFBTSxVQUFVLEdBQW1CLEVBQUUsQ0FBQztJQUN0QyxLQUFLLE1BQU0sSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDN0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFO1lBQ2pGLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDNUQ7S0FDRjtJQUNELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMvQixnRkFBZ0Y7QUFDbEYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IHtxdWV1ZVVwLCBxdWV1ZX0gZnJvbSAnLi91dGlscy9wcm9taXNlLXF1ZXF1ZSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtwcm9taXNpZnlFeGV9IGZyb20gJy4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQge2JveFN0cmluZ30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgKiBhcyByZWNpcGVNYW5hZ2VyIGZyb20gJy4vcmVjaXBlLW1hbmFnZXInO1xuaW1wb3J0IGpzb25QYXJzZXIsIHtPYmplY3RBc3QsIFRva2VufSBmcm9tICcuL3V0aWxzL2pzb24tc3luYy1wYXJzZXInO1xuaW1wb3J0IHJlcGxhY2VDb2RlLCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9wYXRjaC10ZXh0JztcbmNvbnN0IGNvbmZpZyA9IHJlcXVpcmUoJy4uL2xpYi9jb25maWcnKTtcbnJlcXVpcmUoJy4uL2xpYi9sb2dDb25maWcnKShjb25maWcoKSk7XG5cbmNvbnN0IHBhY2thZ2VVdGlscyA9IHJlcXVpcmUoJy4uL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpO1xuLy8gY29uc3QgcmVjaXBlTWFuYWdlciA9IHJlcXVpcmUoJy4uL2xpYi9ndWxwL3JlY2lwZU1hbmFnZXInKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignZHJjcC1jbWQnKTtcbi8vIGNvbnN0IG5hbWVQYXQgPSAvbmFtZTpcXHMrKFteIFxcblxccl0rKS9taTtcbi8vIGNvbnN0IGZpbGVOYW1lUGF0ID0gL2ZpbGVuYW1lOlxccysoW14gXFxuXFxyXSspL21pO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFjayhhcmd2OiBhbnkpIHtcbiAgaWYgKGFyZ3YucGopXG4gICAgcmV0dXJuIHBhY2tQcm9qZWN0KGFyZ3YpO1xuXG4gIGNvbnN0IHBhY2thZ2UydGFyYmFsbDoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gIGlmIChhcmd2LnBhY2thZ2VzKSB7XG4gICAgY29uc3QgcGdQYXRoczogc3RyaW5nW10gPSBhcmd2LnBhY2thZ2VzO1xuXG4gICAgY29uc3QgZG9uZSA9IHF1ZXVlVXAoMywgcGdQYXRocy5tYXAocGFja2FnZURpciA9PiAoKSA9PiBucG1QYWNrKHBhY2thZ2VEaXIpKSk7XG4gICAgbGV0IHRhckluZm9zID0gYXdhaXQgZG9uZTtcblxuICAgIHRhckluZm9zID0gdGFySW5mb3MuZmlsdGVyKGl0ZW0gPT4gaXRlbSAhPSBudWxsKTtcbiAgICB0YXJJbmZvcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgcGFja2FnZTJ0YXJiYWxsW2l0ZW0hLm5hbWVdID0gJy4vdGFyYmFsbHMvJyArIGl0ZW0hLmZpbGVuYW1lO1xuICAgIH0pO1xuICAgIGF3YWl0IGRlbGV0ZU9sZFRhcih0YXJJbmZvcy5tYXAoaXRlbSA9PiBpdGVtIS5uYW1lLnJlcGxhY2UoJ0AnLCAnJykucmVwbGFjZSgvWy9cXFxcXS9nLCAnLScpKSxcbiAgICAgIHRhckluZm9zLm1hcChpdGVtID0+IGl0ZW0hLmZpbGVuYW1lKSk7XG4gICAgY2hhbmdlUGFja2FnZUpzb24ocGFja2FnZTJ0YXJiYWxsKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFja1Byb2plY3QoYXJndjogYW55KSB7XG4gIGZzLm1rZGlycFN5bmMoJ3RhcmJhbGxzJyk7XG4gIC8vIHZhciBjb3VudCA9IDA7XG4gIGNvbnN0IHJlY2lwZTJwYWNrYWdlczoge1tyZWNpcGU6IHN0cmluZ106IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfX0gPSB7fTtcbiAgY29uc3QgcGFja2FnZTJ0YXJiYWxsOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcblxuICByZWNpcGVNYW5hZ2VyLmVhY2hSZWNpcGVTcmMoYXJndi5waiwgZnVuY3Rpb24oc3JjOiBzdHJpbmcsIHJlY2lwZURpcjogc3RyaW5nKSB7XG4gICAgaWYgKCFyZWNpcGVEaXIpXG4gICAgICByZXR1cm47XG4gICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKFBhdGguam9pbihyZWNpcGVEaXIsICdwYWNrYWdlLmpzb24nKSwgJ3V0ZjgnKSk7XG4gICAgcmVjaXBlMnBhY2thZ2VzW2RhdGEubmFtZSArICdAJyArIGRhdGEudmVyc2lvbl0gPSBkYXRhLmRlcGVuZGVuY2llcztcbiAgfSk7XG5cbiAgY29uc3QgcGFja0FjdGlvbnMgPSBbXSBhcyBBcnJheTxSZXR1cm5UeXBlPHR5cGVvZiBucG1QYWNrPj47XG4gIGNvbnN0IHthZGR9ID0gcXVldWUoMyk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMoKG5hbWU6IHN0cmluZywgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHN0cmluZywganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgcGFja0FjdGlvbnMucHVzaChhZGQoKCkgPT4gbnBtUGFjayhwYWNrYWdlUGF0aCkpKTtcbiAgfSwgJ3NyYycsIGFyZ3YucHJvamVjdERpcik7XG5cblxuICBsZXQgdGFySW5mb3MgPSBhd2FpdCBQcm9taXNlLmFsbChwYWNrQWN0aW9ucyk7XG4gIHRhckluZm9zID0gdGFySW5mb3MuZmlsdGVyKGl0ZW0gPT4gaXRlbSAhPSBudWxsKTtcbiAgdGFySW5mb3MuZm9yRWFjaChpdGVtID0+IHtcbiAgICBwYWNrYWdlMnRhcmJhbGxbaXRlbSEubmFtZV0gPSAnLi90YXJiYWxscy8nICsgaXRlbSEuZmlsZW5hbWU7XG4gIH0pO1xuXG4gIF8uZWFjaChyZWNpcGUycGFja2FnZXMsIChwYWNrYWdlcywgcmVjaXBlKSA9PiB7XG4gICAgXy5lYWNoKHBhY2thZ2VzLCAodmVyLCBuYW1lKSA9PiB7XG4gICAgICBwYWNrYWdlc1tuYW1lXSA9IHBhY2thZ2UydGFyYmFsbFtuYW1lXTtcbiAgICB9KTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGJveFN0cmluZygncmVjaXBlOicgKyByZWNpcGUgKyAnLCB5b3UgbmVlZCB0byBjb3B5IGZvbGxvd2luZyBkZXBlbmRlbmNpZXMgdG8geW91ciBwYWNrYWdlLmpzb25cXG4nKSk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShwYWNrYWdlcywgbnVsbCwgJyAgJykpO1xuICB9KTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coYm94U3RyaW5nKGBUYXJiYWxsIGZpbGVzIGhhdmUgYmVlbiB3cml0dGVuIHRvICR7UGF0aC5yZXNvbHZlKCd0YXJiYWxscycpfWApKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbnBtUGFjayhwYWNrYWdlUGF0aDogc3RyaW5nKTpcbiAgUHJvbWlzZTx7bmFtZTogc3RyaW5nLCBmaWxlbmFtZTogc3RyaW5nfSB8IG51bGw+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBvdXRwdXQgPSBhd2FpdCBwcm9taXNpZnlFeGUoJ25wbScsICdwYWNrJywgUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoKSxcbiAgICAgIHtzaWxlbnQ6IHRydWUsIGN3ZDogUGF0aC5yZXNvbHZlKCd0YXJiYWxscycpfSk7XG4gICAgY29uc3QgcmVzdWx0SW5mbyA9IHBhcnNlTnBtUGFja091dHB1dChvdXRwdXQpO1xuXG4gICAgY29uc3QgcGFja2FnZU5hbWUgPSByZXN1bHRJbmZvLmdldCgnbmFtZScpITtcbiAgICAvLyBjYihwYWNrYWdlTmFtZSwgcmVzdWx0SW5mby5nZXQoJ2ZpbGVuYW1lJykhKTtcbiAgICBsb2cuaW5mbyhvdXRwdXQpO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBwYWNrYWdlTmFtZSxcbiAgICAgIGZpbGVuYW1lOiByZXN1bHRJbmZvLmdldCgnZmlsZW5hbWUnKSFcbiAgICB9O1xuICB9IGNhdGNoIChlKSB7XG4gICAgaGFuZGxlRXhwdGlvbihwYWNrYWdlUGF0aCwgZSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gY2hhbmdlUGFja2FnZUpzb24ocGFja2FnZTJ0YXJiYWxsOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30pIHtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKCdwYWNrYWdlLmpzb24nKSkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ0NvdWxkIG5vdCBmaW5kIHBhY2thZ2UuanNvbi4nKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgcGtqID0gZnMucmVhZEZpbGVTeW5jKCdwYWNrYWdlLmpzb24nLCAndXRmOCcpO1xuICBjb25zdCBhc3QgPSBqc29uUGFyc2VyKHBraik7XG4gIGNvbnN0IGRlcHNBc3QgPSBhc3QucHJvcGVydGllcy5maW5kKCh7bmFtZX0pID0+IEpTT04ucGFyc2UobmFtZS50ZXh0KSA9PT0gJ2RlcGVuZGVuY2llcycpO1xuICBjb25zdCBkZXZEZXBzQXN0ID0gYXN0LnByb3BlcnRpZXMuZmluZCgoe25hbWV9KSA9PiBKU09OLnBhcnNlKG5hbWUudGV4dCkgPT09ICdkZXZEZXBlbmRlbmNpZXMnKTtcbiAgY29uc3QgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdID0gW107XG4gIGlmIChkZXBzQXN0KSB7XG4gICAgY2hhbmdlRGVwZW5kZW5jaWVzKGRlcHNBc3QudmFsdWUgYXMgT2JqZWN0QXN0KTtcbiAgfVxuICBpZiAoZGV2RGVwc0FzdCkge1xuICAgIGNoYW5nZURlcGVuZGVuY2llcyhkZXZEZXBzQXN0LnZhbHVlIGFzIE9iamVjdEFzdCk7XG4gIH1cblxuICBpZiAocmVwbGFjZW1lbnRzLmxlbmd0aCA+IDApXG4gICAgZnMud3JpdGVGaWxlU3luYygncGFja2FnZS5qc29uJywgcmVwbGFjZUNvZGUoZnMucmVhZEZpbGVTeW5jKCdwYWNrYWdlLmpzb24nLCAndXRmOCcpLCByZXBsYWNlbWVudHMpKTtcblxuICBmdW5jdGlvbiBjaGFuZ2VEZXBlbmRlbmNpZXMoZGVwczogT2JqZWN0QXN0KSB7XG5cbiAgICBjb25zdCBmb3VuZERlcHMgPSBkZXBzLnByb3BlcnRpZXMuZmlsdGVyKCh7bmFtZX0pID0+IF8uaGFzKHBhY2thZ2UydGFyYmFsbCwgSlNPTi5wYXJzZShuYW1lLnRleHQpKSk7XG4gICAgZm9yIChjb25zdCBmb3VuZERlcCBvZiBmb3VuZERlcHMpIHtcbiAgICAgIGNvbnN0IHZlclRva2VuID0gZm91bmREZXAudmFsdWUgYXMgVG9rZW47XG4gICAgICBjb25zdCBuZXdWZXJzaW9uID0gcGFja2FnZTJ0YXJiYWxsW0pTT04ucGFyc2UoZm91bmREZXAubmFtZS50ZXh0KV07XG4gICAgICBsb2cuaW5mbyhgVXBkYXRlIHBhY2thZ2UuanNvbjogJHt2ZXJUb2tlbi50ZXh0fSA9PiAke25ld1ZlcnNpb259YCk7XG4gICAgICByZXBsYWNlbWVudHMucHVzaCh7XG4gICAgICAgIHN0YXJ0OiB2ZXJUb2tlbi5wb3MsXG4gICAgICAgIGVuZDogdmVyVG9rZW4uZW5kISxcbiAgICAgICAgdGV4dDogSlNPTi5zdHJpbmdpZnkobmV3VmVyc2lvbilcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVFeHB0aW9uKHBhY2thZ2VQYXRoOiBzdHJpbmcsIGU6IEVycm9yKSB7XG4gIGlmIChlICYmIGUubWVzc2FnZSAmJiBlLm1lc3NhZ2UuaW5kZXhPZignRVBVQkxJU0hDT05GTElDVCcpID4gMClcbiAgICBsb2cuaW5mbyhgbnBtIHBhY2sgJHtwYWNrYWdlUGF0aH06IEVQVUJMSVNIQ09ORkxJQ1QuYCk7XG4gIGVsc2VcbiAgICBsb2cuZXJyb3IocGFja2FnZVBhdGgsIGUpO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIG91dHB1dCBcbiAqIGUuZy5cbm5wbSBub3RpY2UgPT09IFRhcmJhbGwgRGV0YWlscyA9PT0gXG5ucG0gbm90aWNlIG5hbWU6ICAgICAgICAgIHJlcXVpcmUtaW5qZWN0b3IgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgdmVyc2lvbjogICAgICAgNS4xLjUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSBmaWxlbmFtZTogICAgICByZXF1aXJlLWluamVjdG9yLTUuMS41LnRneiAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHBhY2thZ2Ugc2l6ZTogIDU2Ljkga0IgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgdW5wYWNrZWQgc2l6ZTogMjI5LjEga0IgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSBzaGFzdW06ICAgICAgICBjMDY5MzI3MGMxNDBmNjVhNjk2MjA3YWI5ZGViMThlNjQ0NTJhMDJjXG5ucG0gbm90aWNlIGludGVncml0eTogICAgIHNoYTUxMi1rUkdWV2N3MWZ2UTVKWy4uLl1BQndMUFU4VXZTdGJBPT1cbm5wbSBub3RpY2UgdG90YWwgZmlsZXM6ICAgNDcgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSBcblxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VOcG1QYWNrT3V0cHV0KG91dHB1dDogc3RyaW5nKSB7XG4gIGNvbnN0IGxpbmVzID0gb3V0cHV0LnNwbGl0KC9cXHI/XFxuLyk7XG4gIGNvbnN0IGxpbmVzT2Zmc2V0ID0gXy5maW5kTGFzdEluZGV4KGxpbmVzLCBsaW5lID0+IGxpbmUuaW5kZXhPZignVGFyYmFsbCBEZXRhaWxzJykgPj0gMCk7XG4gIGNvbnN0IHRhcmJhbGxJbmZvID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgbGluZXMuc2xpY2UobGluZXNPZmZzZXQpLmZvckVhY2gobGluZSA9PiB7XG4gICAgY29uc3QgbWF0Y2ggPSAvbnBtIG5vdGljZVxccysoW146XSspWzpdXFxzKiguKz8pXFxzKiQvLmV4ZWMobGluZSk7XG4gICAgaWYgKCFtYXRjaClcbiAgICAgIHJldHVybiBudWxsO1xuICAgIHJldHVybiB0YXJiYWxsSW5mby5zZXQobWF0Y2hbMV0sIG1hdGNoWzJdKTtcbiAgfSk7XG4gIHJldHVybiB0YXJiYWxsSW5mbztcbn1cblxuZnVuY3Rpb24gZGVsZXRlT2xkVGFyKGRlbGV0ZUZpbGVQcmVmaXg6IHN0cmluZ1tdLCBrZWVwZmlsZXM6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IHRhclNldCA9IG5ldyBTZXQoa2VlcGZpbGVzKTtcbiAgY29uc3QgZGVsZXRlRG9uZTogUHJvbWlzZTxhbnk+W10gPSBbXTtcbiAgZm9yIChjb25zdCBmaWxlIG9mIGZzLnJlYWRkaXJTeW5jKCd0YXJiYWxscycpKSB7XG4gICAgaWYgKCF0YXJTZXQuaGFzKGZpbGUpICYmIGRlbGV0ZUZpbGVQcmVmaXguc29tZShwcmVmaXggPT4gZmlsZS5zdGFydHNXaXRoKHByZWZpeCkpKSB7XG4gICAgICBkZWxldGVEb25lLnB1c2goZnMucmVtb3ZlKFBhdGgucmVzb2x2ZSgndGFyYmFsbHMnLCBmaWxlKSkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gUHJvbWlzZS5hbGwoZGVsZXRlRG9uZSk7XG4gIC8vIGxvZy5pbmZvKCdZb3UgbWF5IGRlbGV0ZSBvbGQgdmVyc2lvbiB0YXIgZmlsZSBieSBleGVjdXRlIGNvbW1hbmRzOlxcbicgKyBjbWQpO1xufVxuIl19