"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Q = require("promise-queue");
const _ = require("lodash");
const fs = require("fs-extra");
const Path = require("path");
const process_utils_1 = require("./process-utils");
const utils_1 = require("./utils");
const recipeManager = require("./recipe-manager");
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
        const q = new Q(5, Infinity);
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
//# sourceMappingURL=drcp-cmd.js.map