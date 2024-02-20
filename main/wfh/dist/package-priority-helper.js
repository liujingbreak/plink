"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderPackages = void 0;
const tslib_1 = require("tslib");
const _ = tslib_1.__importStar(require("lodash"));
const log = require('log4js').getLogger('plink.package-priority-helper');
const priorityStrReg = /(before|after)\s+(\S+)/;
// eslint-disable  max-len
function orderPackages(packages, run) {
    const numberTypePrio = [];
    const beforePackages = {};
    const afterPackages = {};
    const beforeOrAfter = new Map();
    packages.forEach(pk => {
        const priority = pk.priority;
        if (_.isNumber(priority)) {
            numberTypePrio.push(pk);
        }
        else if (_.isString(priority)) {
            const res = priorityStrReg.exec(priority);
            if (!res) {
                throw new Error('Invalid format of package.json - priority in ' +
                    pk.name + ': ' + priority);
            }
            const targetPackageName = res[2];
            if (res[1] === 'before') {
                if (!beforePackages[targetPackageName]) {
                    beforePackages[targetPackageName] = [];
                    beforeOrAfter.set(targetPackageName, [pk.name, pk.priority]); // track target package
                }
                beforePackages[targetPackageName].push(pk);
            }
            else if (res[1] === 'after') {
                if (!afterPackages[targetPackageName]) {
                    afterPackages[targetPackageName] = [];
                    beforeOrAfter.set(targetPackageName, [pk.name, pk.priority]); // track target package
                }
                afterPackages[targetPackageName].push(pk);
            }
        }
        else {
            pk.priority = 5000;
            numberTypePrio.push(pk);
        }
    });
    numberTypePrio.sort(function (pk1, pk2) {
        return pk2.priority - pk1.priority;
    });
    const pkNames = packages.map(p => p.name);
    const notFound = _.difference(Array.from(beforeOrAfter.keys()), pkNames)
        .map(name => name + ` by ${beforeOrAfter.get(name).join('\'s ')}`);
    if (notFound.length > 0) {
        const err = 'Priority depended packages are not found: ' + notFound +
            '\nTotal packages available:\n' + pkNames.join('\n');
        log.error(err);
        return Promise.reject(new Error(err));
    }
    async function runPackagesSync(packages) {
        for (const pk of packages) {
            await runPackage(pk);
        }
    }
    function runPackagesAsync(packages) {
        return Promise.all(packages.map(runPackage));
    }
    async function runPackage(pk) {
        await beforeHandlersFor(pk.name);
        log.debug(pk.name, ' starts with priority: ', pk.priority);
        const anyRes = run(pk);
        await Promise.resolve(anyRes);
        log.debug(pk.name, ' ends');
        await afterHandlersFor(pk.name);
    }
    function beforeHandlersFor(name) {
        return runPackagesAsync(beforePackages[name] ? beforePackages[name] : []);
    }
    function afterHandlersFor(name) {
        return runPackagesAsync(afterPackages[name] ? afterPackages[name] : []);
    }
    return runPackagesSync(numberTypePrio);
}
exports.orderPackages = orderPackages;
//# sourceMappingURL=package-priority-helper.js.map