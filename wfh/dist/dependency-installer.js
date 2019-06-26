"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable max-line-length */
const fs = __importStar(require("fs"));
const fs_extra_1 = require("fs-extra");
const _ = __importStar(require("lodash"));
const Path = __importStar(require("path"));
const config = require('../lib/config');
const chalk = require('chalk');
const semver = require('semver');
const log = require('log4js').getLogger('wfh.' + Path.basename(__filename, '.js'));
const packageUtils = require('../lib/packageMgr/packageUtils');
const getPackageJsonGuarder = require('../lib/gulp/packageJsonGuarder');
const recipeManager = __importStar(require("./recipe-manager"));
function listCompDependency(pkJsonFiles, write, isDrcpSymlink) {
    // log.info('scan components from:\n', pkJsonFiles.join('\n'));
    const installer = new InstallManager();
    installer.scanSrcDeps(pkJsonFiles);
    installer.scanInstalledPeerDeps();
    return installer.printComponentDep(write, isDrcpSymlink);
}
exports.listCompDependency = listCompDependency;
class InstallManager {
    constructor() {
        this.versionReg = /^(\D*)(\d.*?)$/;
        if (!(this instanceof InstallManager)) {
            return new InstallManager();
        }
        this.srcDeps = {}; // src packages needed dependencies and all packages needed peer dependencies
        // this.peerDeps = {}; // all packages needed peer dependencies
    }
    scanSrcDeps(jsonFiles) {
        const self = this;
        this.componentMap = {};
        for (const packageJson of jsonFiles) {
            log.debug('scanSrcDepsAsync() ' + Path.relative(config().rootPath, packageJson));
            const json = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
            if (!json.dr)
                continue;
            this.componentMap[json.name] = { ver: json.version, toInstall: false };
            const deps = json.dependencies;
            if (deps) {
                for (const name of Object.keys(deps)) {
                    const version = deps[name];
                    // log.debug('scanSrcDepsAsync() dep ' + name);
                    self._trackDependency(this.srcDeps, name, version, json.name, packageJson);
                }
            }
            if (json.devDependencies) {
                // log.warn(`$${json.name} contains "devDepenendies", if they are necessary for compiling this component` +
                // 	'you should move them to "dependencies" or "peerDependencies"');
                for (const name of Object.keys(json.devDependencies)) {
                    const version = json.devDependencies[name];
                    self._trackDependency(this.srcDeps, name, version, json.name, packageJson);
                }
            }
            if (json.peerDependencies) {
                for (const name of Object.keys(json.peerDependencies)) {
                    const version = json.peerDependencies[name];
                    self._trackDependency(this.srcDeps, name, version, json.name, packageJson);
                }
            }
        }
    }
    scanInstalledPeerDeps() {
        // TODO: Here I want to determine expected component version to install with, but so far the version number of each component that I get is currently installed
        // one which might be incorrect or outdated, in case like developer did not run "yarn install" before "drcp init".
        // One problem is: 
        // Without running "yarn install" to download "recipe" package, I can't know exact up to date version number of those components
        // which belong to a certain "recipe" pacakge.
        // So firstly, always "yarn install" before "drcp init"
        // Another problem is:
        // These old component versions are tracked in dist/dr.package.json waiting for being compared with newly changed version list.
        // But ...
        packageUtils.findAllPackages((name, entryPath, parsedName, json, packagePath) => {
            if (_.has(this.componentMap, name))
                return; // Skip it, since most likely there is a duplicate "installed" dependency in package.json against an symbolic linked component
            this.componentMap[name] = { ver: json.version, toInstall: true };
            _.each(json.peerDependencies, (version, name) => {
                this._trackDependency(this.srcDeps, name, version, json.name, Path.join(packagePath, 'package.josn'));
            });
        }, 'installed');
    }
    /**
     * @return true if there are newly found dependencies added to package.json
     */
    printComponentDep(write, isDrcpSymlink) {
        const self = this;
        const rootPath = config().rootPath;
        const packageJsonGuarder = getPackageJsonGuarder(rootPath);
        var mainPkjson, mainDeps;
        if (!packageJsonGuarder.isPackageJsonDirty) {
            const mainPkFile = Path.resolve(rootPath, 'package.json');
            log.info('Checking', mainPkFile);
            mainPkjson = JSON.parse(fs.readFileSync(mainPkFile, 'utf8'));
            mainDeps = mainPkjson.dependencies;
            if (mainDeps == null)
                mainDeps = mainPkjson.dependencies = {};
            if (process.env.NODE_ENV === 'development')
                _.assign(mainDeps, mainPkjson.devDependencies);
            _.each(packageJsonGuarder.getChanges().dependencies, (ver, name) => {
                // If there is a same dependency in original package.json, we use the version of that one, cuz' that might be manually set
                if (!_.has(mainDeps, name))
                    mainDeps[name] = ver;
            });
        }
        else {
            mainPkjson = packageJsonGuarder.getChanges();
            mainDeps = mainPkjson.dependencies;
        }
        const depNames = Object.keys(this.srcDeps);
        depNames.sort();
        // var peerDepNames = Object.keys(this.peerDeps);
        if (depNames.length === 0)
            return;
        const nameWidth = _.maxBy(depNames, name => name.length).length;
        // log.warn(Object.keys(this.componentMap));
        if (depNames.length > 0) {
            let printOut = _.pad(' Associated Components Dependencies & ' + chalk.cyan('Components Peer Dependencies'), 60, '-') + '\n';
            printOut += _.padStart('Dependency ', nameWidth + 13) + '| By\n';
            printOut += _.repeat('-', nameWidth + 13) + '|' + _.repeat('-', 10) + '\n';
            let countDep = 0;
            for (const name of depNames) {
                const versionList = this.srcDeps[name];
                const firstVersion = self.sortByVersion(versionList, name)[0];
                let markNew = '  ';
                if (name !== '@dr/internal-recipe' && (!_.has(this.componentMap, name)) &&
                    (mainDeps[name] !== firstVersion.ver)) {
                    mainDeps[name] = firstVersion.ver;
                    markNew = '+ ';
                }
                const hasDiffVersion = self._containsDiffVersion(versionList);
                const printName = (hasDiffVersion ? chalk.red : chalk.cyan)(_.padStart(markNew + name, nameWidth, ' '));
                printOut += `${printName} ${versionList.length > 1 ? '─┬─' : '───'}${_.padEnd(firstVersion.ver, 9, '─')} ${firstVersion.by}\n`;
                var i = versionList.length - 1;
                for (const rest of versionList.slice(1)) {
                    printOut += `${_.repeat(' ', nameWidth)} ${i === 1 ? ' └─' : ' ├─'}${_.padEnd(rest.ver, 9, '─')} ${rest.by}\n`;
                    i--;
                }
                countDep++;
            }
            printOut += _.pad(` total ${chalk.green(countDep)} `, 60, '-');
            log.info(printOut);
        }
        fs_extra_1.mkdirpSync(config().destDir);
        if (write) {
            // _.assign(mainPkjson.dependencies, newDepJson);
            _.each(mainDeps, (ver, name) => {
                if (_.get(this.componentMap, [name, 'toInstall']) === false) {
                    delete mainDeps[name];
                    log.info(chalk.blue('Remove source linked dependency: ' + name));
                }
            });
            recipeManager.eachRecipeSrc((srcDir, recipeDir, recipeName) => {
                if (recipeName && _.has(mainDeps, recipeName)) {
                    delete mainDeps[recipeName];
                    log.info(chalk.blue('Remove recipe dependency: ' + recipeName));
                }
            });
            const changeList = packageJsonGuarder.markChanges(mainPkjson);
            const needInstall = _.size(changeList) > 0;
            if (needInstall) {
                const changed = [];
                const removed = [];
                for (const row of changeList) {
                    if (row[1] == null)
                        removed.push(row[0]);
                    else
                        changed.push(row[0] + '@' + row[1]);
                }
                if (changed.length > 0)
                    log.info('Changed dependencies:', changed.join(', '));
                if (removed.length > 0)
                    log.info(chalk.blue('Removed dependencies:'), removed.join(', '));
            }
            // fs.writeFileSync(mainPkFile, JSON.stringify(mainPkjson, null, '  '));
            // log.info('%s is written.', mainPkFile);
            return needInstall;
        }
        return false;
    }
    _trackDependency(trackTo, name, version, byWhom, path) {
        if (!_.has(trackTo, name)) {
            trackTo[name] = [];
        }
        const m = this.versionReg.exec(version);
        trackTo[name].push({
            ver: version === '*' ? '' : version,
            verNum: m ? m[2] : undefined,
            pre: m ? m[1] : '',
            by: byWhom,
            path
        });
    }
    _containsDiffVersion(sortedVersions) {
        // var self = this;
        for (let i = 0, l = sortedVersions.length - 1; i < l; i++) {
            const a = sortedVersions[i].ver;
            const b = sortedVersions[i + 1].ver;
            if (b === '*' || b === '')
                continue;
            if (a !== b)
                return true;
        }
        return false;
    }
    /**
     * Sort by descending
     * @param verInfoList {ver: string, by: string, name: string}
     */
    sortByVersion(verInfoList, name) {
        if (verInfoList == null)
            return verInfoList;
        try {
            verInfoList.sort((info1, info2) => {
                if (info1.verNum != null && info2.verNum != null) {
                    const res = semver.rcompare(info1.verNum, info2.verNum);
                    if (res === 0)
                        return info1.pre === '' && info2.pre !== '' ? -1 :
                            (info1.pre !== '' && info2.pre === '' ? 1 : 0);
                    else
                        return res;
                }
                else if (info1.verNum != null && info2.verNum == null)
                    return -1;
                else if (info2.verNum != null && info1.verNum == null)
                    return 1;
                else if (info1.ver > info2.ver)
                    return -1;
                else if (info1.ver < info2.ver)
                    return 1;
                else
                    return 0;
            });
        }
        catch (e) {
            log.error(`Invalid semver format for ${name || ''}: ` + JSON.stringify(verInfoList, null, '  '));
            throw e;
        }
        return verInfoList;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeS1pbnN0YWxsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9kZXBlbmRlbmN5LWluc3RhbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxvQ0FBb0M7QUFDcEMsdUNBQXlCO0FBQ3pCLHVDQUFvQztBQUNwQywwQ0FBNEI7QUFDNUIsMkNBQTZCO0FBQzdCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN4QyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDbkYsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDL0QsTUFBTSxxQkFBcUIsR0FBRyxPQUFPLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUN4RSxnRUFBa0Q7QUFFbEQsU0FBZ0Isa0JBQWtCLENBQUMsV0FBcUIsRUFBRSxLQUFjLEVBQUUsYUFBc0I7SUFDL0YsK0RBQStEO0lBQy9ELE1BQU0sU0FBUyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7SUFDdkMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuQyxTQUFTLENBQUMscUJBQXFCLEVBQUUsQ0FBQztJQUNsQyxPQUFPLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUM7QUFDMUQsQ0FBQztBQU5ELGdEQU1DO0FBVUQsTUFBTSxjQUFjO0lBTW5CO1FBSEEsZUFBVSxHQUFHLGdCQUFnQixDQUFDO1FBSTdCLElBQUksQ0FBQyxDQUFDLElBQUks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QUFDLENBQUMsQ0FBQyxDQUFDOzRCQUNqRCxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzt3QkFFaEQsT0FBTyxHQUFHLENBQUM7aUJBQ1o7cUJBQU0sSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLElBQUk7b0JBQ3RELE9BQU8sQ0FBQyxDQUFDLENBQUM7cUJBQ04sSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLElBQUk7b0JBQ3BELE9BQU8sQ0FBQyxDQUFDO3FCQUNMLElBQUksS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRztvQkFDN0IsT0FBTyxDQUFDLENBQUMsQ0FBQztxQkFDTixJQUFJLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUc7b0JBQzdCLE9BQU8sQ0FBQyxDQUFDOztvQkFFVCxPQUFPLENBQUMsQ0FBQztZQUNYLENBQUMsQ0FBQyxDQUFDO1NBQ0g7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNYLEdBQUcsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLElBQUksSUFBSSxFQUFFLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNqRyxNQUFNLENBQUMsQ0FBQztTQUNSO1FBQ0QsT0FBTyxXQUFXLENBQUM7SUFDcEIsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQge21rZGlycFN5bmN9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5jb25zdCBjb25maWcgPSByZXF1aXJlKCcuLi9saWIvY29uZmlnJyk7XG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCBzZW12ZXIgPSByZXF1aXJlKCdzZW12ZXInKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignd2ZoLicgKyBQYXRoLmJhc2VuYW1lKF9fZmlsZW5hbWUsICcuanMnKSk7XG5jb25zdCBwYWNrYWdlVXRpbHMgPSByZXF1aXJlKCcuLi9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKTtcbmNvbnN0IGdldFBhY2thZ2VKc29uR3VhcmRlciA9IHJlcXVpcmUoJy4uL2xpYi9ndWxwL3BhY2thZ2VKc29uR3VhcmRlcicpO1xuaW1wb3J0ICogYXMgcmVjaXBlTWFuYWdlciBmcm9tICcuL3JlY2lwZS1tYW5hZ2VyJztcblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RDb21wRGVwZW5kZW5jeShwa0pzb25GaWxlczogc3RyaW5nW10sIHdyaXRlOiBib29sZWFuLCBpc0RyY3BTeW1saW5rOiBib29sZWFuKSB7XG5cdC8vIGxvZy5pbmZvKCdzY2FuIGNvbXBvbmVudHMgZnJvbTpcXG4nLCBwa0pzb25GaWxlcy5qb2luKCdcXG4nKSk7XG5cdGNvbnN0IGluc3RhbGxlciA9IG5ldyBJbnN0YWxsTWFuYWdlcigpO1xuXHRpbnN0YWxsZXIuc2NhblNyY0RlcHMocGtKc29uRmlsZXMpO1xuXHRpbnN0YWxsZXIuc2Nhbkluc3RhbGxlZFBlZXJEZXBzKCk7XG5cdHJldHVybiBpbnN0YWxsZXIucHJpbnRDb21wb25lbnREZXAod3JpdGUsIGlzRHJjcFN5bWxpbmspO1xufVxuXG5pbnRlcmZhY2UgRGVwSW5mbyB7XG5cdHZlcjogc3RyaW5nO1xuXHR2ZXJOdW0/OiBzdHJpbmc7XG5cdHByZTogc3RyaW5nO1xuXHRieTogc3RyaW5nO1xuXHRwYXRoOiBzdHJpbmc7XG59XG5cbmNsYXNzIEluc3RhbGxNYW5hZ2VyIHtcblxuXHRzcmNEZXBzOiB7W3BOYW1lOiBzdHJpbmddOiBEZXBJbmZvW119O1xuXHR2ZXJzaW9uUmVnID0gL14oXFxEKikoXFxkLio/KSQvO1xuXHRjb21wb25lbnRNYXA6IHtbcE5hbWU6IHN0cmluZ106IHt2ZXI6IHN0cmluZywgdG9JbnN0YWxsOiBib29sZWFufX07XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0aWYgKCEodGhpcyBpbnN0YW5jZW9mIEluc3RhbGxNYW5hZ2VyKSkge1xuXHRcdFx0cmV0dXJuIG5ldyBJbnN0YWxsTWFuYWdlcigpO1xuXHRcdH1cblx0XHR0aGlzLnNyY0RlcHMgPSB7fTsgLy8gc3JjIHBhY2thZ2VzIG5lZWRlZCBkZXBlbmRlbmNpZXMgYW5kIGFsbCBwYWNrYWdlcyBuZWVkZWQgcGVlciBkZXBlbmRlbmNpZXNcblx0XHQvLyB0aGlzLnBlZXJEZXBzID0ge307IC8vIGFsbCBwYWNrYWdlcyBuZWVkZWQgcGVlciBkZXBlbmRlbmNpZXNcblx0fVxuXG5cdHNjYW5TcmNEZXBzKGpzb25GaWxlczogc3RyaW5nW10pIHtcblx0XHRjb25zdCBzZWxmID0gdGhpcztcblx0XHR0aGlzLmNvbXBvbmVudE1hcCA9IHt9O1xuXHRcdGZvciAoY29uc3QgcGFja2FnZUpzb24gb2YganNvbkZpbGVzKSB7XG5cdFx0XHRsb2cuZGVidWcoJ3NjYW5TcmNEZXBzQXN5bmMoKSAnICsgUGF0aC5yZWxhdGl2ZShjb25maWcoKS5yb290UGF0aCwgcGFja2FnZUpzb24pKTtcblx0XHRcdGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYWNrYWdlSnNvbiwgJ3V0ZjgnKSk7XG5cdFx0XHRpZiAoIWpzb24uZHIpXG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0dGhpcy5jb21wb25lbnRNYXBbanNvbi5uYW1lXSA9IHt2ZXI6IGpzb24udmVyc2lvbiwgdG9JbnN0YWxsOiBmYWxzZX07XG5cdFx0XHRjb25zdCBkZXBzID0ganNvbi5kZXBlbmRlbmNpZXM7XG5cdFx0XHRpZiAoZGVwcykge1xuXHRcdFx0XHRmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoZGVwcykpIHtcblx0XHRcdFx0XHRjb25zdCB2ZXJzaW9uID0gZGVwc1tuYW1lXTtcblx0XHRcdFx0XHQvLyBsb2cuZGVidWcoJ3NjYW5TcmNEZXBzQXN5bmMoKSBkZXAgJyArIG5hbWUpO1xuXHRcdFx0XHRcdHNlbGYuX3RyYWNrRGVwZW5kZW5jeSh0aGlzLnNyY0RlcHMsIG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSwgcGFja2FnZUpzb24pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoanNvbi5kZXZEZXBlbmRlbmNpZXMpIHtcblx0XHRcdFx0Ly8gbG9nLndhcm4oYCQke2pzb24ubmFtZX0gY29udGFpbnMgXCJkZXZEZXBlbmVuZGllc1wiLCBpZiB0aGV5IGFyZSBuZWNlc3NhcnkgZm9yIGNvbXBpbGluZyB0aGlzIGNvbXBvbmVudGAgK1xuXHRcdFx0XHQvLyBcdCd5b3Ugc2hvdWxkIG1vdmUgdGhlbSB0byBcImRlcGVuZGVuY2llc1wiIG9yIFwicGVlckRlcGVuZGVuY2llc1wiJyk7XG5cdFx0XHRcdGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhqc29uLmRldkRlcGVuZGVuY2llcykpIHtcblx0XHRcdFx0XHRjb25zdCB2ZXJzaW9uID0ganNvbi5kZXZEZXBlbmRlbmNpZXNbbmFtZV07XG5cdFx0XHRcdFx0c2VsZi5fdHJhY2tEZXBlbmRlbmN5KHRoaXMuc3JjRGVwcywgbmFtZSwgdmVyc2lvbiwganNvbi5uYW1lLCBwYWNrYWdlSnNvbik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChqc29uLnBlZXJEZXBlbmRlbmNpZXMpIHtcblx0XHRcdFx0Zm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGpzb24ucGVlckRlcGVuZGVuY2llcykpIHtcblx0XHRcdFx0XHRjb25zdCB2ZXJzaW9uID0ganNvbi5wZWVyRGVwZW5kZW5jaWVzW25hbWVdO1xuXHRcdFx0XHRcdHNlbGYuX3RyYWNrRGVwZW5kZW5jeSh0aGlzLnNyY0RlcHMsIG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSwgcGFja2FnZUpzb24pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0c2Nhbkluc3RhbGxlZFBlZXJEZXBzKCkge1xuXHRcdC8vIFRPRE86IEhlcmUgSSB3YW50IHRvIGRldGVybWluZSBleHBlY3RlZCBjb21wb25lbnQgdmVyc2lvbiB0byBpbnN0YWxsIHdpdGgsIGJ1dCBzbyBmYXIgdGhlIHZlcnNpb24gbnVtYmVyIG9mIGVhY2ggY29tcG9uZW50IHRoYXQgSSBnZXQgaXMgY3VycmVudGx5IGluc3RhbGxlZFxuXHRcdC8vIG9uZSB3aGljaCBtaWdodCBiZSBpbmNvcnJlY3Qgb3Igb3V0ZGF0ZWQsIGluIGNhc2UgbGlrZSBkZXZlbG9wZXIgZGlkIG5vdCBydW4gXCJ5YXJuIGluc3RhbGxcIiBiZWZvcmUgXCJkcmNwIGluaXRcIi5cblx0XHQvLyBPbmUgcHJvYmxlbSBpczogXG5cdFx0Ly8gV2l0aG91dCBydW5uaW5nIFwieWFybiBpbnN0YWxsXCIgdG8gZG93bmxvYWQgXCJyZWNpcGVcIiBwYWNrYWdlLCBJIGNhbid0IGtub3cgZXhhY3QgdXAgdG8gZGF0ZSB2ZXJzaW9uIG51bWJlciBvZiB0aG9zZSBjb21wb25lbnRzXG5cdFx0Ly8gd2hpY2ggYmVsb25nIHRvIGEgY2VydGFpbiBcInJlY2lwZVwiIHBhY2FrZ2UuXG5cdFx0Ly8gU28gZmlyc3RseSwgYWx3YXlzIFwieWFybiBpbnN0YWxsXCIgYmVmb3JlIFwiZHJjcCBpbml0XCJcblxuXHRcdC8vIEFub3RoZXIgcHJvYmxlbSBpczpcblx0XHQvLyBUaGVzZSBvbGQgY29tcG9uZW50IHZlcnNpb25zIGFyZSB0cmFja2VkIGluIGRpc3QvZHIucGFja2FnZS5qc29uIHdhaXRpbmcgZm9yIGJlaW5nIGNvbXBhcmVkIHdpdGggbmV3bHkgY2hhbmdlZCB2ZXJzaW9uIGxpc3QuXG5cdFx0Ly8gQnV0IC4uLlxuXHRcdHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMoKG5hbWU6IHN0cmluZywgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHN0cmluZywganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSA9PiB7XG5cdFx0XHRpZiAoXy5oYXModGhpcy5jb21wb25lbnRNYXAsIG5hbWUpKVxuXHRcdFx0XHRyZXR1cm47IC8vIFNraXAgaXQsIHNpbmNlIG1vc3QgbGlrZWx5IHRoZXJlIGlzIGEgZHVwbGljYXRlIFwiaW5zdGFsbGVkXCIgZGVwZW5kZW5jeSBpbiBwYWNrYWdlLmpzb24gYWdhaW5zdCBhbiBzeW1ib2xpYyBsaW5rZWQgY29tcG9uZW50XG5cdFx0XHR0aGlzLmNvbXBvbmVudE1hcFtuYW1lXSA9IHt2ZXI6IGpzb24udmVyc2lvbiwgdG9JbnN0YWxsOiB0cnVlfTtcblx0XHRcdF8uZWFjaChqc29uLnBlZXJEZXBlbmRlbmNpZXMsICh2ZXJzaW9uLCBuYW1lKSA9PiB7XG5cdFx0XHRcdHRoaXMuX3RyYWNrRGVwZW5kZW5jeSh0aGlzLnNyY0RlcHMsIG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSwgUGF0aC5qb2luKHBhY2thZ2VQYXRoLCAncGFja2FnZS5qb3NuJykpO1xuXHRcdFx0fSk7XG5cdFx0fSwgJ2luc3RhbGxlZCcpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEByZXR1cm4gdHJ1ZSBpZiB0aGVyZSBhcmUgbmV3bHkgZm91bmQgZGVwZW5kZW5jaWVzIGFkZGVkIHRvIHBhY2thZ2UuanNvblxuXHQgKi9cblx0cHJpbnRDb21wb25lbnREZXAod3JpdGU6IGJvb2xlYW4sIGlzRHJjcFN5bWxpbms6IGJvb2xlYW4pIHtcblx0XHRjb25zdCBzZWxmID0gdGhpcztcblx0XHRjb25zdCByb290UGF0aCA9IGNvbmZpZygpLnJvb3RQYXRoO1xuXHRcdGNvbnN0IHBhY2thZ2VKc29uR3VhcmRlciA9IGdldFBhY2thZ2VKc29uR3VhcmRlcihyb290UGF0aCk7XG5cdFx0dmFyIG1haW5Qa2pzb24sIG1haW5EZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ307XG5cblx0XHRpZiAoIXBhY2thZ2VKc29uR3VhcmRlci5pc1BhY2thZ2VKc29uRGlydHkpIHtcblx0XHRcdGNvbnN0IG1haW5Qa0ZpbGUgPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKTtcblx0XHRcdGxvZy5pbmZvKCdDaGVja2luZycsIG1haW5Qa0ZpbGUpO1xuXHRcdFx0bWFpblBranNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKG1haW5Qa0ZpbGUsICd1dGY4JykpO1xuXHRcdFx0bWFpbkRlcHMgPSBtYWluUGtqc29uLmRlcGVuZGVuY2llcztcblx0XHRcdGlmIChtYWluRGVwcyA9PSBudWxsKVxuXHRcdFx0XHRtYWluRGVwcyA9IG1haW5Qa2pzb24uZGVwZW5kZW5jaWVzID0ge307XG5cdFx0XHRpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCcpXG5cdFx0XHRcdF8uYXNzaWduKG1haW5EZXBzLCBtYWluUGtqc29uLmRldkRlcGVuZGVuY2llcyk7XG5cdFx0XHRfLmVhY2gocGFja2FnZUpzb25HdWFyZGVyLmdldENoYW5nZXMoKS5kZXBlbmRlbmNpZXMsICh2ZXIsIG5hbWUpID0+IHtcblx0XHRcdFx0Ly8gSWYgdGhlcmUgaXMgYSBzYW1lIGRlcGVuZGVuY3kgaW4gb3JpZ2luYWwgcGFja2FnZS5qc29uLCB3ZSB1c2UgdGhlIHZlcnNpb24gb2YgdGhhdCBvbmUsIGN1eicgdGhhdCBtaWdodCBiZSBtYW51YWxseSBzZXRcblx0XHRcdFx0aWYgKCFfLmhhcyhtYWluRGVwcywgbmFtZSkpXG5cdFx0XHRcdFx0bWFpbkRlcHNbbmFtZV0gPSB2ZXI7XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bWFpblBranNvbiA9IHBhY2thZ2VKc29uR3VhcmRlci5nZXRDaGFuZ2VzKCk7XG5cdFx0XHRtYWluRGVwcyA9IG1haW5Qa2pzb24uZGVwZW5kZW5jaWVzO1xuXHRcdH1cblxuXHRcdGNvbnN0IGRlcE5hbWVzID0gT2JqZWN0LmtleXModGhpcy5zcmNEZXBzKTtcblx0XHRkZXBOYW1lcy5zb3J0KCk7XG5cdFx0Ly8gdmFyIHBlZXJEZXBOYW1lcyA9IE9iamVjdC5rZXlzKHRoaXMucGVlckRlcHMpO1xuXHRcdGlmIChkZXBOYW1lcy5sZW5ndGggPT09IDApXG5cdFx0XHRyZXR1cm47XG5cdFx0Y29uc3QgbmFtZVdpZHRoID0gXy5tYXhCeShkZXBOYW1lcywgbmFtZSA9PiBuYW1lLmxlbmd0aCkhLmxlbmd0aDtcblxuXHRcdC8vIGxvZy53YXJuKE9iamVjdC5rZXlzKHRoaXMuY29tcG9uZW50TWFwKSk7XG5cblx0XHRpZiAoZGVwTmFtZXMubGVuZ3RoID4gMCkge1xuXHRcdFx0bGV0IHByaW50T3V0ID0gXy5wYWQoJyBBc3NvY2lhdGVkIENvbXBvbmVudHMgRGVwZW5kZW5jaWVzICYgJyArIGNoYWxrLmN5YW4oJ0NvbXBvbmVudHMgUGVlciBEZXBlbmRlbmNpZXMnKSwgNjAsICctJykgKyAnXFxuJztcblx0XHRcdHByaW50T3V0ICs9IF8ucGFkU3RhcnQoJ0RlcGVuZGVuY3kgJywgbmFtZVdpZHRoICsgMTMpICsgJ3wgQnlcXG4nO1xuXHRcdFx0cHJpbnRPdXQgKz0gXy5yZXBlYXQoJy0nLCBuYW1lV2lkdGggKyAxMykgKyAnfCcgKyBfLnJlcGVhdCgnLScsIDEwKSArICdcXG4nO1xuXHRcdFx0bGV0IGNvdW50RGVwID0gMDtcblx0XHRcdGZvciAoY29uc3QgbmFtZSBvZiBkZXBOYW1lcykge1xuXHRcdFx0XHRjb25zdCB2ZXJzaW9uTGlzdCA9IHRoaXMuc3JjRGVwc1tuYW1lXTtcblx0XHRcdFx0Y29uc3QgZmlyc3RWZXJzaW9uID0gc2VsZi5zb3J0QnlWZXJzaW9uKHZlcnNpb25MaXN0LCBuYW1lKVswXTtcblx0XHRcdFx0bGV0IG1hcmtOZXcgPSAnICAnO1xuXHRcdFx0XHRpZiAobmFtZSAhPT0gJ0Bkci9pbnRlcm5hbC1yZWNpcGUnICYmICghXy5oYXModGhpcy5jb21wb25lbnRNYXAsIG5hbWUpKSAmJlxuXHRcdFx0XHRcdChtYWluRGVwc1tuYW1lXSAhPT0gZmlyc3RWZXJzaW9uLnZlcikpIHtcblx0XHRcdFx0XHRtYWluRGVwc1tuYW1lXSA9IGZpcnN0VmVyc2lvbi52ZXI7XG5cdFx0XHRcdFx0bWFya05ldyA9ICcrICc7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBoYXNEaWZmVmVyc2lvbiA9IHNlbGYuX2NvbnRhaW5zRGlmZlZlcnNpb24odmVyc2lvbkxpc3QpO1xuXHRcdFx0XHRjb25zdCBwcmludE5hbWUgPSAoaGFzRGlmZlZlcnNpb24gPyBjaGFsay5yZWQgOiBjaGFsay5jeWFuKShfLnBhZFN0YXJ0KG1hcmtOZXcgKyBuYW1lLCBuYW1lV2lkdGgsICcgJykpO1xuXHRcdFx0XHRwcmludE91dCArPSBgJHtwcmludE5hbWV9ICR7dmVyc2lvbkxpc3QubGVuZ3RoID4gMSA/ICfilIDilKzilIAnIDogJ+KUgOKUgOKUgCd9JHtfLnBhZEVuZChmaXJzdFZlcnNpb24udmVyLCA5LCAn4pSAJyl9ICR7Zmlyc3RWZXJzaW9uLmJ5fVxcbmA7XG5cdFx0XHRcdHZhciBpID0gdmVyc2lvbkxpc3QubGVuZ3RoIC0gMTtcblx0XHRcdFx0Zm9yIChjb25zdCByZXN0IG9mIHZlcnNpb25MaXN0LnNsaWNlKDEpKSB7XG5cdFx0XHRcdFx0cHJpbnRPdXQgKz0gYCR7Xy5yZXBlYXQoJyAnLCBuYW1lV2lkdGgpfSAke2kgPT09IDEgPyAnIOKUlOKUgCcgOiAnIOKUnOKUgCd9JHtfLnBhZEVuZChyZXN0LnZlciwgOSwgJ+KUgCcpfSAke3Jlc3QuYnl9XFxuYDtcblx0XHRcdFx0XHRpLS07XG5cdFx0XHRcdH1cblx0XHRcdFx0Y291bnREZXArKztcblx0XHRcdH1cblx0XHRcdHByaW50T3V0ICs9IF8ucGFkKGAgdG90YWwgJHtjaGFsay5ncmVlbihjb3VudERlcCl9IGAsIDYwLCAnLScpO1xuXHRcdFx0bG9nLmluZm8ocHJpbnRPdXQpO1xuXHRcdH1cblx0XHRta2RpcnBTeW5jKGNvbmZpZygpLmRlc3REaXIpO1xuXHRcdGlmICh3cml0ZSkge1xuXHRcdFx0Ly8gXy5hc3NpZ24obWFpblBranNvbi5kZXBlbmRlbmNpZXMsIG5ld0RlcEpzb24pO1xuXHRcdFx0Xy5lYWNoKG1haW5EZXBzLCAodmVyLCBuYW1lKSA9PiB7XG5cdFx0XHRcdGlmIChfLmdldCh0aGlzLmNvbXBvbmVudE1hcCwgW25hbWUsICd0b0luc3RhbGwnXSkgYXMgYW55ID09PSBmYWxzZSkge1xuXHRcdFx0XHRcdGRlbGV0ZSBtYWluRGVwc1tuYW1lXTtcblx0XHRcdFx0XHRsb2cuaW5mbyhjaGFsay5ibHVlKCdSZW1vdmUgc291cmNlIGxpbmtlZCBkZXBlbmRlbmN5OiAnICsgbmFtZSkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJlY2lwZU1hbmFnZXIuZWFjaFJlY2lwZVNyYygoc3JjRGlyOiBzdHJpbmcsIHJlY2lwZURpcjogc3RyaW5nLCByZWNpcGVOYW1lOiBzdHJpbmcpID0+IHtcblx0XHRcdFx0aWYgKHJlY2lwZU5hbWUgJiYgXy5oYXMobWFpbkRlcHMsIHJlY2lwZU5hbWUpKSB7XG5cdFx0XHRcdFx0ZGVsZXRlIG1haW5EZXBzW3JlY2lwZU5hbWVdO1xuXHRcdFx0XHRcdGxvZy5pbmZvKGNoYWxrLmJsdWUoJ1JlbW92ZSByZWNpcGUgZGVwZW5kZW5jeTogJyArIHJlY2lwZU5hbWUpKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRjb25zdCBjaGFuZ2VMaXN0OiBBcnJheTxbc3RyaW5nLCBzdHJpbmddPiA9IHBhY2thZ2VKc29uR3VhcmRlci5tYXJrQ2hhbmdlcyhtYWluUGtqc29uKTtcblx0XHRcdGNvbnN0IG5lZWRJbnN0YWxsID0gXy5zaXplKGNoYW5nZUxpc3QpID4gMDtcblx0XHRcdGlmIChuZWVkSW5zdGFsbCkge1xuXHRcdFx0XHRjb25zdCBjaGFuZ2VkID0gW107XG5cdFx0XHRcdGNvbnN0IHJlbW92ZWQgPSBbXTtcblx0XHRcdFx0Zm9yIChjb25zdCByb3cgb2YgY2hhbmdlTGlzdCkge1xuXHRcdFx0XHRcdGlmIChyb3dbMV0gPT0gbnVsbClcblx0XHRcdFx0XHRcdHJlbW92ZWQucHVzaChyb3dbMF0pO1xuXHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdGNoYW5nZWQucHVzaChyb3dbMF0gKyAnQCcgKyByb3dbMV0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChjaGFuZ2VkLmxlbmd0aCA+IDApXG5cdFx0XHRcdFx0bG9nLmluZm8oJ0NoYW5nZWQgZGVwZW5kZW5jaWVzOicsIGNoYW5nZWQuam9pbignLCAnKSk7XG5cdFx0XHRcdGlmIChyZW1vdmVkLmxlbmd0aCA+IDApXG5cdFx0XHRcdFx0bG9nLmluZm8oY2hhbGsuYmx1ZSgnUmVtb3ZlZCBkZXBlbmRlbmNpZXM6JyksIHJlbW92ZWQuam9pbignLCAnKSk7XG5cdFx0XHR9XG5cdFx0XHQvLyBmcy53cml0ZUZpbGVTeW5jKG1haW5Qa0ZpbGUsIEpTT04uc3RyaW5naWZ5KG1haW5Qa2pzb24sIG51bGwsICcgICcpKTtcblx0XHRcdC8vIGxvZy5pbmZvKCclcyBpcyB3cml0dGVuLicsIG1haW5Qa0ZpbGUpO1xuXHRcdFx0cmV0dXJuIG5lZWRJbnN0YWxsO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRwcm90ZWN0ZWQgX3RyYWNrRGVwZW5kZW5jeSh0cmFja1RvOiB7W3BOYW1lOiBzdHJpbmddOiBEZXBJbmZvW119LCBuYW1lOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZywgYnlXaG9tOiBzdHJpbmcsIHBhdGg6IHN0cmluZykge1xuXHRcdGlmICghXy5oYXModHJhY2tUbywgbmFtZSkpIHtcblx0XHRcdHRyYWNrVG9bbmFtZV0gPSBbXTtcblx0XHR9XG5cdFx0Y29uc3QgbSA9IHRoaXMudmVyc2lvblJlZy5leGVjKHZlcnNpb24pO1xuXHRcdHRyYWNrVG9bbmFtZV0ucHVzaCh7XG5cdFx0XHR2ZXI6IHZlcnNpb24gPT09ICcqJyA/ICcnIDogdmVyc2lvbixcblx0XHRcdHZlck51bTogbSA/IG1bMl0gOiB1bmRlZmluZWQsXG5cdFx0XHRwcmU6IG0gPyBtWzFdIDogJycsXG5cdFx0XHRieTogYnlXaG9tLFxuXHRcdFx0cGF0aFxuXHRcdH0pO1xuXHR9XG5cblx0cHJvdGVjdGVkIF9jb250YWluc0RpZmZWZXJzaW9uKHNvcnRlZFZlcnNpb25zOiBEZXBJbmZvW10pIHtcblx0XHQvLyB2YXIgc2VsZiA9IHRoaXM7XG5cdFx0Zm9yIChsZXQgaSA9IDAsIGwgPSBzb3J0ZWRWZXJzaW9ucy5sZW5ndGggLSAxOyBpIDwgbDsgaSsrKSB7XG5cdFx0XHRjb25zdCBhID0gc29ydGVkVmVyc2lvbnNbaV0udmVyO1xuXHRcdFx0Y29uc3QgYiA9IHNvcnRlZFZlcnNpb25zW2kgKyAxXS52ZXI7XG5cblx0XHRcdGlmIChiID09PSAnKicgfHwgYiA9PT0gJycpXG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0aWYgKGEgIT09IGIpXG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0LyoqXG5cdCAqIFNvcnQgYnkgZGVzY2VuZGluZ1xuXHQgKiBAcGFyYW0gdmVySW5mb0xpc3Qge3Zlcjogc3RyaW5nLCBieTogc3RyaW5nLCBuYW1lOiBzdHJpbmd9XG5cdCAqL1xuXHRwcm90ZWN0ZWQgc29ydEJ5VmVyc2lvbih2ZXJJbmZvTGlzdDogRGVwSW5mb1tdLCBuYW1lOiBzdHJpbmcpIHtcblx0XHRpZiAodmVySW5mb0xpc3QgPT0gbnVsbClcblx0XHRcdHJldHVybiB2ZXJJbmZvTGlzdDtcblx0XHR0cnkge1xuXHRcdFx0dmVySW5mb0xpc3Quc29ydCgoaW5mbzEsIGluZm8yKSA9PiB7XG5cdFx0XHRcdGlmIChpbmZvMS52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMi52ZXJOdW0gIT0gbnVsbCkge1xuXHRcdFx0XHRcdGNvbnN0IHJlcyA9IHNlbXZlci5yY29tcGFyZShpbmZvMS52ZXJOdW0sIGluZm8yLnZlck51bSk7XG5cdFx0XHRcdFx0aWYgKHJlcyA9PT0gMClcblx0XHRcdFx0XHRcdHJldHVybiBpbmZvMS5wcmUgPT09ICcnICYmIGluZm8yLnByZSAhPT0gJycgPyAtMSA6XG5cdFx0XHRcdFx0XHRcdChpbmZvMS5wcmUgIT09ICcnICYmIGluZm8yLnByZSA9PT0gJycgPyAxIDogMCk7XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0cmV0dXJuIHJlcztcblx0XHRcdFx0fSBlbHNlIGlmIChpbmZvMS52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMi52ZXJOdW0gPT0gbnVsbClcblx0XHRcdFx0XHRyZXR1cm4gLTE7XG5cdFx0XHRcdGVsc2UgaWYgKGluZm8yLnZlck51bSAhPSBudWxsICYmIGluZm8xLnZlck51bSA9PSBudWxsKVxuXHRcdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0XHRlbHNlIGlmIChpbmZvMS52ZXIgPiBpbmZvMi52ZXIpXG5cdFx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0XHRlbHNlIGlmIChpbmZvMS52ZXIgPCBpbmZvMi52ZXIpXG5cdFx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRyZXR1cm4gMDtcblx0XHRcdH0pO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGxvZy5lcnJvcihgSW52YWxpZCBzZW12ZXIgZm9ybWF0IGZvciAke25hbWUgfHwgJyd9OiBgICsgSlNPTi5zdHJpbmdpZnkodmVySW5mb0xpc3QsIG51bGwsICcgICcpKTtcblx0XHRcdHRocm93IGU7XG5cdFx0fVxuXHRcdHJldHVybiB2ZXJJbmZvTGlzdDtcblx0fVxufVxuIl19