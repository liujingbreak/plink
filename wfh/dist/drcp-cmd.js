"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const promise_queue_1 = tslib_1.__importDefault(require("promise-queue"));
const _ = tslib_1.__importStar(require("lodash"));
const fs = tslib_1.__importStar(require("fs-extra"));
const Path = tslib_1.__importStar(require("path"));
const process_utils_1 = require("./process-utils");
const utils_1 = require("./utils");
const recipeManager = tslib_1.__importStar(require("./recipe-manager"));
const config = require('../lib/config');
require('../lib/logConfig')(config());
const packageUtils = require('../lib/packageMgr/packageUtils');
// const recipeManager = require('../lib/gulp/recipeManager');
const log = require('log4js').getLogger('drcp-cmd');
function pack(argv) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        fs.mkdirpSync('tarballs');
        const promises = [];
        // var count = 0;
        const q = new promise_queue_1.default(5, Infinity);
        const recipe2packages = {};
        const package2tarball = {};
        recipeManager.eachRecipeSrc(argv.projectDir, function (src, recipeDir) {
            if (!recipeDir)
                return;
            const data = JSON.parse(fs.readFileSync(Path.join(recipeDir, 'package.json'), 'utf8'));
            recipe2packages[data.name + '@' + data.version] = data.dependencies;
        });
        const namePat = /name:\s+([^ \n\r]+)/mi;
        const fileNamePat = /filename:\s+([^ \n\r]+)/mi;
        packageUtils.findAllPackages((name, entryPath, parsedName, json, packagePath) => {
            promises.push(q.add(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
                try {
                    const output = yield process_utils_1.promisifyExe('npm', 'pack', packagePath, { silent: true, cwd: Path.resolve('tarballs') });
                    const offset = output.indexOf('Tarball Details');
                    namePat.lastIndex = offset;
                    const name = namePat.exec(output)[1];
                    fileNamePat.lastIndex = namePat.lastIndex;
                    const tarball = fileNamePat.exec(output)[1];
                    package2tarball[name] = './tarballs/' + tarball;
                    log.info(output);
                    return output;
                }
                catch (e) {
                    handleExption(json.name + '@' + json.version, e);
                }
            })));
        }, 'src', argv.projectDir);
        function handleExption(packageName, e) {
            if (e && e.message && e.message.indexOf('EPUBLISHCONFLICT') > 0)
                log.info(packageName + ' exists.');
            else
                log.error(packageName, e);
        }
        yield Promise.all(promises);
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
exports.pack = pack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJjcC1jbWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9kcmNwLWNtZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSwwRUFBOEI7QUFDOUIsa0RBQTRCO0FBQzVCLHFEQUErQjtBQUMvQixtREFBNkI7QUFDN0IsbURBQTZDO0FBQzdDLG1DQUFrQztBQUNsQyx3RUFBa0Q7QUFDbEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3hDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFFdEMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDL0QsOERBQThEO0FBQzlELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7QUFFcEQsU0FBc0IsSUFBSSxDQUFDLElBQVM7O1FBQ25DLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUIsTUFBTSxRQUFRLEdBQXNCLEVBQUUsQ0FBQztRQUN2QyxpQkFBaUI7UUFDakIsTUFBTSxDQUFDLEdBQUcsSUFBSSx1QkFBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM3QixNQUFNLGVBQWUsR0FBaUQsRUFBRSxDQUFDO1FBQ3pFLE1BQU0sZUFBZSxHQUE2QixFQUFFLENBQUM7UUFFckQsYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQVMsR0FBVyxFQUFFLFNBQWlCO1lBQ25GLElBQUksQ0FBQyxTQUFTO2dCQUNiLE9BQU87WUFDUixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN2Rixl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