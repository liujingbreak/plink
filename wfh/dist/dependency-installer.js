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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeS1pbnN0YWxsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9kZXBlbmRlbmN5LWluc3RhbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxvQ0FBb0M7QUFDcEMsdUNBQXlCO0FBQ3pCLHVDQUFvQztBQUNwQywwQ0FBNEI7QUFDNUIsMkNBQTZCO0FBQzdCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN4QyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDbkYsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDL0QsTUFBTSxxQkFBcUIsR0FBRyxPQUFPLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUN4RSxnRUFBa0Q7QUFFbEQsU0FBZ0Isa0JBQWtCLENBQUMsV0FBcUIsRUFBRSxLQUFjLEVBQUUsYUFBc0I7SUFDOUYsK0RBQStEO0lBQy9ELE1BQU0sU0FBUyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7SUFDdkMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuQyxTQUFTLENBQUMscUJBQXFCLEVBQUUsQ0FBQztJQUNsQyxPQUFPLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUM7QUFDM0QsQ0FBQztBQU5ELGdEQU1DO0FBVUQsTUFBTSxjQUFjO0lBTWxCO1FBSEEsZUFBVSxHQUFHLGdCQUFnQixDQUFDO1FBSTVCLElBQUksQ0FBQyxDQUFDLElBQUks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QUFDLENBQUMsQ0FBQyxDQUFDOzRCQUNoRCxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzt3QkFFakQsT0FBTyxHQUFHLENBQUM7aUJBQ2Q7cUJBQU0sSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLElBQUk7b0JBQ3JELE9BQU8sQ0FBQyxDQUFDLENBQUM7cUJBQ1AsSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLElBQUk7b0JBQ25ELE9BQU8sQ0FBQyxDQUFDO3FCQUNOLElBQUksS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRztvQkFDNUIsT0FBTyxDQUFDLENBQUMsQ0FBQztxQkFDUCxJQUFJLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUc7b0JBQzVCLE9BQU8sQ0FBQyxDQUFDOztvQkFFVCxPQUFPLENBQUMsQ0FBQztZQUNiLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLElBQUksSUFBSSxFQUFFLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNqRyxNQUFNLENBQUMsQ0FBQztTQUNUO1FBQ0QsT0FBTyxXQUFXLENBQUM7SUFDckIsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQge21rZGlycFN5bmN9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5jb25zdCBjb25maWcgPSByZXF1aXJlKCcuLi9saWIvY29uZmlnJyk7XG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCBzZW12ZXIgPSByZXF1aXJlKCdzZW12ZXInKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignd2ZoLicgKyBQYXRoLmJhc2VuYW1lKF9fZmlsZW5hbWUsICcuanMnKSk7XG5jb25zdCBwYWNrYWdlVXRpbHMgPSByZXF1aXJlKCcuLi9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKTtcbmNvbnN0IGdldFBhY2thZ2VKc29uR3VhcmRlciA9IHJlcXVpcmUoJy4uL2xpYi9ndWxwL3BhY2thZ2VKc29uR3VhcmRlcicpO1xuaW1wb3J0ICogYXMgcmVjaXBlTWFuYWdlciBmcm9tICcuL3JlY2lwZS1tYW5hZ2VyJztcblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RDb21wRGVwZW5kZW5jeShwa0pzb25GaWxlczogc3RyaW5nW10sIHdyaXRlOiBib29sZWFuLCBpc0RyY3BTeW1saW5rOiBib29sZWFuKSB7XG4gIC8vIGxvZy5pbmZvKCdzY2FuIGNvbXBvbmVudHMgZnJvbTpcXG4nLCBwa0pzb25GaWxlcy5qb2luKCdcXG4nKSk7XG4gIGNvbnN0IGluc3RhbGxlciA9IG5ldyBJbnN0YWxsTWFuYWdlcigpO1xuICBpbnN0YWxsZXIuc2NhblNyY0RlcHMocGtKc29uRmlsZXMpO1xuICBpbnN0YWxsZXIuc2Nhbkluc3RhbGxlZFBlZXJEZXBzKCk7XG4gIHJldHVybiBpbnN0YWxsZXIucHJpbnRDb21wb25lbnREZXAod3JpdGUsIGlzRHJjcFN5bWxpbmspO1xufVxuXG5pbnRlcmZhY2UgRGVwSW5mbyB7XG4gIHZlcjogc3RyaW5nO1xuICB2ZXJOdW0/OiBzdHJpbmc7XG4gIHByZTogc3RyaW5nO1xuICBieTogc3RyaW5nO1xuICBwYXRoOiBzdHJpbmc7XG59XG5cbmNsYXNzIEluc3RhbGxNYW5hZ2VyIHtcblxuICBzcmNEZXBzOiB7W3BOYW1lOiBzdHJpbmddOiBEZXBJbmZvW119O1xuICB2ZXJzaW9uUmVnID0gL14oXFxEKikoXFxkLio/KSQvO1xuICBjb21wb25lbnRNYXA6IHtbcE5hbWU6IHN0cmluZ106IHt2ZXI6IHN0cmluZywgdG9JbnN0YWxsOiBib29sZWFufX07XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEluc3RhbGxNYW5hZ2VyKSkge1xuICAgICAgcmV0dXJuIG5ldyBJbnN0YWxsTWFuYWdlcigpO1xuICAgIH1cbiAgICB0aGlzLnNyY0RlcHMgPSB7fTsgLy8gc3JjIHBhY2thZ2VzIG5lZWRlZCBkZXBlbmRlbmNpZXMgYW5kIGFsbCBwYWNrYWdlcyBuZWVkZWQgcGVlciBkZXBlbmRlbmNpZXNcbiAgICAvLyB0aGlzLnBlZXJEZXBzID0ge307IC8vIGFsbCBwYWNrYWdlcyBuZWVkZWQgcGVlciBkZXBlbmRlbmNpZXNcbiAgfVxuXG4gIHNjYW5TcmNEZXBzKGpzb25GaWxlczogc3RyaW5nW10pIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICB0aGlzLmNvbXBvbmVudE1hcCA9IHt9O1xuICAgIGZvciAoY29uc3QgcGFja2FnZUpzb24gb2YganNvbkZpbGVzKSB7XG4gICAgICBsb2cuZGVidWcoJ3NjYW5TcmNEZXBzQXN5bmMoKSAnICsgUGF0aC5yZWxhdGl2ZShjb25maWcoKS5yb290UGF0aCwgcGFja2FnZUpzb24pKTtcbiAgICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYWNrYWdlSnNvbiwgJ3V0ZjgnKSk7XG4gICAgICBpZiAoIWpzb24uZHIpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgdGhpcy5jb21wb25lbnRNYXBbanNvbi5uYW1lXSA9IHt2ZXI6IGpzb24udmVyc2lvbiwgdG9JbnN0YWxsOiBmYWxzZX07XG4gICAgICBjb25zdCBkZXBzID0ganNvbi5kZXBlbmRlbmNpZXM7XG4gICAgICBpZiAoZGVwcykge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoZGVwcykpIHtcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gZGVwc1tuYW1lXTtcbiAgICAgICAgICAvLyBsb2cuZGVidWcoJ3NjYW5TcmNEZXBzQXN5bmMoKSBkZXAgJyArIG5hbWUpO1xuICAgICAgICAgIHNlbGYuX3RyYWNrRGVwZW5kZW5jeSh0aGlzLnNyY0RlcHMsIG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSwgcGFja2FnZUpzb24pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoanNvbi5kZXZEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgLy8gbG9nLndhcm4oYCQke2pzb24ubmFtZX0gY29udGFpbnMgXCJkZXZEZXBlbmVuZGllc1wiLCBpZiB0aGV5IGFyZSBuZWNlc3NhcnkgZm9yIGNvbXBpbGluZyB0aGlzIGNvbXBvbmVudGAgK1xuICAgICAgICAvLyBcdCd5b3Ugc2hvdWxkIG1vdmUgdGhlbSB0byBcImRlcGVuZGVuY2llc1wiIG9yIFwicGVlckRlcGVuZGVuY2llc1wiJyk7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhqc29uLmRldkRlcGVuZGVuY2llcykpIHtcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0ganNvbi5kZXZEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICAgICAgc2VsZi5fdHJhY2tEZXBlbmRlbmN5KHRoaXMuc3JjRGVwcywgbmFtZSwgdmVyc2lvbiwganNvbi5uYW1lLCBwYWNrYWdlSnNvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChqc29uLnBlZXJEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGpzb24ucGVlckRlcGVuZGVuY2llcykpIHtcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0ganNvbi5wZWVyRGVwZW5kZW5jaWVzW25hbWVdO1xuICAgICAgICAgIHNlbGYuX3RyYWNrRGVwZW5kZW5jeSh0aGlzLnNyY0RlcHMsIG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSwgcGFja2FnZUpzb24pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc2Nhbkluc3RhbGxlZFBlZXJEZXBzKCkge1xuICAgIC8vIFRPRE86IEhlcmUgSSB3YW50IHRvIGRldGVybWluZSBleHBlY3RlZCBjb21wb25lbnQgdmVyc2lvbiB0byBpbnN0YWxsIHdpdGgsIGJ1dCBzbyBmYXIgdGhlIHZlcnNpb24gbnVtYmVyIG9mIGVhY2ggY29tcG9uZW50IHRoYXQgSSBnZXQgaXMgY3VycmVudGx5IGluc3RhbGxlZFxuICAgIC8vIG9uZSB3aGljaCBtaWdodCBiZSBpbmNvcnJlY3Qgb3Igb3V0ZGF0ZWQsIGluIGNhc2UgbGlrZSBkZXZlbG9wZXIgZGlkIG5vdCBydW4gXCJ5YXJuIGluc3RhbGxcIiBiZWZvcmUgXCJkcmNwIGluaXRcIi5cbiAgICAvLyBPbmUgcHJvYmxlbSBpczogXG4gICAgLy8gV2l0aG91dCBydW5uaW5nIFwieWFybiBpbnN0YWxsXCIgdG8gZG93bmxvYWQgXCJyZWNpcGVcIiBwYWNrYWdlLCBJIGNhbid0IGtub3cgZXhhY3QgdXAgdG8gZGF0ZSB2ZXJzaW9uIG51bWJlciBvZiB0aG9zZSBjb21wb25lbnRzXG4gICAgLy8gd2hpY2ggYmVsb25nIHRvIGEgY2VydGFpbiBcInJlY2lwZVwiIHBhY2FrZ2UuXG4gICAgLy8gU28gZmlyc3RseSwgYWx3YXlzIFwieWFybiBpbnN0YWxsXCIgYmVmb3JlIFwiZHJjcCBpbml0XCJcblxuICAgIC8vIEFub3RoZXIgcHJvYmxlbSBpczpcbiAgICAvLyBUaGVzZSBvbGQgY29tcG9uZW50IHZlcnNpb25zIGFyZSB0cmFja2VkIGluIGRpc3QvZHIucGFja2FnZS5qc29uIHdhaXRpbmcgZm9yIGJlaW5nIGNvbXBhcmVkIHdpdGggbmV3bHkgY2hhbmdlZCB2ZXJzaW9uIGxpc3QuXG4gICAgLy8gQnV0IC4uLlxuICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMoKG5hbWU6IHN0cmluZywgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHN0cmluZywganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgICBpZiAoXy5oYXModGhpcy5jb21wb25lbnRNYXAsIG5hbWUpKVxuICAgICAgICByZXR1cm47IC8vIFNraXAgaXQsIHNpbmNlIG1vc3QgbGlrZWx5IHRoZXJlIGlzIGEgZHVwbGljYXRlIFwiaW5zdGFsbGVkXCIgZGVwZW5kZW5jeSBpbiBwYWNrYWdlLmpzb24gYWdhaW5zdCBhbiBzeW1ib2xpYyBsaW5rZWQgY29tcG9uZW50XG4gICAgICB0aGlzLmNvbXBvbmVudE1hcFtuYW1lXSA9IHt2ZXI6IGpzb24udmVyc2lvbiwgdG9JbnN0YWxsOiB0cnVlfTtcbiAgICAgIF8uZWFjaChqc29uLnBlZXJEZXBlbmRlbmNpZXMsICh2ZXJzaW9uLCBuYW1lKSA9PiB7XG4gICAgICAgIHRoaXMuX3RyYWNrRGVwZW5kZW5jeSh0aGlzLnNyY0RlcHMsIG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSwgUGF0aC5qb2luKHBhY2thZ2VQYXRoLCAncGFja2FnZS5qb3NuJykpO1xuICAgICAgfSk7XG4gICAgfSwgJ2luc3RhbGxlZCcpO1xuICB9XG5cbiAgLyoqXG5cdCAqIEByZXR1cm4gdHJ1ZSBpZiB0aGVyZSBhcmUgbmV3bHkgZm91bmQgZGVwZW5kZW5jaWVzIGFkZGVkIHRvIHBhY2thZ2UuanNvblxuXHQgKi9cbiAgcHJpbnRDb21wb25lbnREZXAod3JpdGU6IGJvb2xlYW4sIGlzRHJjcFN5bWxpbms6IGJvb2xlYW4pIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBjb25zdCByb290UGF0aCA9IGNvbmZpZygpLnJvb3RQYXRoO1xuICAgIGNvbnN0IHBhY2thZ2VKc29uR3VhcmRlciA9IGdldFBhY2thZ2VKc29uR3VhcmRlcihyb290UGF0aCk7XG4gICAgdmFyIG1haW5Qa2pzb24sIG1haW5EZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ307XG5cbiAgICBpZiAoIXBhY2thZ2VKc29uR3VhcmRlci5pc1BhY2thZ2VKc29uRGlydHkpIHtcbiAgICAgIGNvbnN0IG1haW5Qa0ZpbGUgPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgIGxvZy5pbmZvKCdDaGVja2luZycsIG1haW5Qa0ZpbGUpO1xuICAgICAgbWFpblBranNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKG1haW5Qa0ZpbGUsICd1dGY4JykpO1xuICAgICAgbWFpbkRlcHMgPSBtYWluUGtqc29uLmRlcGVuZGVuY2llcztcbiAgICAgIGlmIChtYWluRGVwcyA9PSBudWxsKVxuICAgICAgICBtYWluRGVwcyA9IG1haW5Qa2pzb24uZGVwZW5kZW5jaWVzID0ge307XG4gICAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCcpXG4gICAgICAgIF8uYXNzaWduKG1haW5EZXBzLCBtYWluUGtqc29uLmRldkRlcGVuZGVuY2llcyk7XG4gICAgICBfLmVhY2gocGFja2FnZUpzb25HdWFyZGVyLmdldENoYW5nZXMoKS5kZXBlbmRlbmNpZXMsICh2ZXIsIG5hbWUpID0+IHtcbiAgICAgICAgLy8gSWYgdGhlcmUgaXMgYSBzYW1lIGRlcGVuZGVuY3kgaW4gb3JpZ2luYWwgcGFja2FnZS5qc29uLCB3ZSB1c2UgdGhlIHZlcnNpb24gb2YgdGhhdCBvbmUsIGN1eicgdGhhdCBtaWdodCBiZSBtYW51YWxseSBzZXRcbiAgICAgICAgaWYgKCFfLmhhcyhtYWluRGVwcywgbmFtZSkpXG4gICAgICAgICAgbWFpbkRlcHNbbmFtZV0gPSB2ZXI7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWFpblBranNvbiA9IHBhY2thZ2VKc29uR3VhcmRlci5nZXRDaGFuZ2VzKCk7XG4gICAgICBtYWluRGVwcyA9IG1haW5Qa2pzb24uZGVwZW5kZW5jaWVzO1xuICAgIH1cblxuICAgIGNvbnN0IGRlcE5hbWVzID0gT2JqZWN0LmtleXModGhpcy5zcmNEZXBzKTtcbiAgICBkZXBOYW1lcy5zb3J0KCk7XG4gICAgLy8gdmFyIHBlZXJEZXBOYW1lcyA9IE9iamVjdC5rZXlzKHRoaXMucGVlckRlcHMpO1xuICAgIGlmIChkZXBOYW1lcy5sZW5ndGggPT09IDApXG4gICAgICByZXR1cm47XG4gICAgY29uc3QgbmFtZVdpZHRoID0gXy5tYXhCeShkZXBOYW1lcywgbmFtZSA9PiBuYW1lLmxlbmd0aCkhLmxlbmd0aDtcblxuICAgIC8vIGxvZy53YXJuKE9iamVjdC5rZXlzKHRoaXMuY29tcG9uZW50TWFwKSk7XG5cbiAgICBpZiAoZGVwTmFtZXMubGVuZ3RoID4gMCkge1xuICAgICAgbGV0IHByaW50T3V0ID0gXy5wYWQoJyBBc3NvY2lhdGVkIENvbXBvbmVudHMgRGVwZW5kZW5jaWVzICYgJyArIGNoYWxrLmN5YW4oJ0NvbXBvbmVudHMgUGVlciBEZXBlbmRlbmNpZXMnKSwgNjAsICctJykgKyAnXFxuJztcbiAgICAgIHByaW50T3V0ICs9IF8ucGFkU3RhcnQoJ0RlcGVuZGVuY3kgJywgbmFtZVdpZHRoICsgMTMpICsgJ3wgQnlcXG4nO1xuICAgICAgcHJpbnRPdXQgKz0gXy5yZXBlYXQoJy0nLCBuYW1lV2lkdGggKyAxMykgKyAnfCcgKyBfLnJlcGVhdCgnLScsIDEwKSArICdcXG4nO1xuICAgICAgbGV0IGNvdW50RGVwID0gMDtcbiAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBkZXBOYW1lcykge1xuICAgICAgICBjb25zdCB2ZXJzaW9uTGlzdCA9IHRoaXMuc3JjRGVwc1tuYW1lXTtcbiAgICAgICAgY29uc3QgZmlyc3RWZXJzaW9uID0gc2VsZi5zb3J0QnlWZXJzaW9uKHZlcnNpb25MaXN0LCBuYW1lKVswXTtcbiAgICAgICAgbGV0IG1hcmtOZXcgPSAnICAnO1xuICAgICAgICBpZiAobmFtZSAhPT0gJ0Bkci9pbnRlcm5hbC1yZWNpcGUnICYmICghXy5oYXModGhpcy5jb21wb25lbnRNYXAsIG5hbWUpKSAmJlxuICAgICAgICAgIChtYWluRGVwc1tuYW1lXSAhPT0gZmlyc3RWZXJzaW9uLnZlcikpIHtcbiAgICAgICAgICBtYWluRGVwc1tuYW1lXSA9IGZpcnN0VmVyc2lvbi52ZXI7XG4gICAgICAgICAgbWFya05ldyA9ICcrICc7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoYXNEaWZmVmVyc2lvbiA9IHNlbGYuX2NvbnRhaW5zRGlmZlZlcnNpb24odmVyc2lvbkxpc3QpO1xuICAgICAgICBjb25zdCBwcmludE5hbWUgPSAoaGFzRGlmZlZlcnNpb24gPyBjaGFsay5yZWQgOiBjaGFsay5jeWFuKShfLnBhZFN0YXJ0KG1hcmtOZXcgKyBuYW1lLCBuYW1lV2lkdGgsICcgJykpO1xuICAgICAgICBwcmludE91dCArPSBgJHtwcmludE5hbWV9ICR7dmVyc2lvbkxpc3QubGVuZ3RoID4gMSA/ICfilIDilKzilIAnIDogJ+KUgOKUgOKUgCd9JHtfLnBhZEVuZChmaXJzdFZlcnNpb24udmVyLCA5LCAn4pSAJyl9ICR7Zmlyc3RWZXJzaW9uLmJ5fVxcbmA7XG4gICAgICAgIHZhciBpID0gdmVyc2lvbkxpc3QubGVuZ3RoIC0gMTtcbiAgICAgICAgZm9yIChjb25zdCByZXN0IG9mIHZlcnNpb25MaXN0LnNsaWNlKDEpKSB7XG4gICAgICAgICAgcHJpbnRPdXQgKz0gYCR7Xy5yZXBlYXQoJyAnLCBuYW1lV2lkdGgpfSAke2kgPT09IDEgPyAnIOKUlOKUgCcgOiAnIOKUnOKUgCd9JHtfLnBhZEVuZChyZXN0LnZlciwgOSwgJ+KUgCcpfSAke3Jlc3QuYnl9XFxuYDtcbiAgICAgICAgICBpLS07XG4gICAgICAgIH1cbiAgICAgICAgY291bnREZXArKztcbiAgICAgIH1cbiAgICAgIHByaW50T3V0ICs9IF8ucGFkKGAgdG90YWwgJHtjaGFsay5ncmVlbihjb3VudERlcCl9IGAsIDYwLCAnLScpO1xuICAgICAgbG9nLmluZm8ocHJpbnRPdXQpO1xuICAgIH1cbiAgICBta2RpcnBTeW5jKGNvbmZpZygpLmRlc3REaXIpO1xuICAgIGlmICh3cml0ZSkge1xuICAgICAgLy8gXy5hc3NpZ24obWFpblBranNvbi5kZXBlbmRlbmNpZXMsIG5ld0RlcEpzb24pO1xuICAgICAgXy5lYWNoKG1haW5EZXBzLCAodmVyLCBuYW1lKSA9PiB7XG4gICAgICAgIGlmIChfLmdldCh0aGlzLmNvbXBvbmVudE1hcCwgW25hbWUsICd0b0luc3RhbGwnXSkgYXMgYW55ID09PSBmYWxzZSkge1xuICAgICAgICAgIGRlbGV0ZSBtYWluRGVwc1tuYW1lXTtcbiAgICAgICAgICBsb2cuaW5mbyhjaGFsay5ibHVlKCdSZW1vdmUgc291cmNlIGxpbmtlZCBkZXBlbmRlbmN5OiAnICsgbmFtZSkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJlY2lwZU1hbmFnZXIuZWFjaFJlY2lwZVNyYygoc3JjRGlyOiBzdHJpbmcsIHJlY2lwZURpcjogc3RyaW5nLCByZWNpcGVOYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgICAgaWYgKHJlY2lwZU5hbWUgJiYgXy5oYXMobWFpbkRlcHMsIHJlY2lwZU5hbWUpKSB7XG4gICAgICAgICAgZGVsZXRlIG1haW5EZXBzW3JlY2lwZU5hbWVdO1xuICAgICAgICAgIGxvZy5pbmZvKGNoYWxrLmJsdWUoJ1JlbW92ZSByZWNpcGUgZGVwZW5kZW5jeTogJyArIHJlY2lwZU5hbWUpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBjb25zdCBjaGFuZ2VMaXN0OiBBcnJheTxbc3RyaW5nLCBzdHJpbmddPiA9IHBhY2thZ2VKc29uR3VhcmRlci5tYXJrQ2hhbmdlcyhtYWluUGtqc29uKTtcbiAgICAgIGNvbnN0IG5lZWRJbnN0YWxsID0gXy5zaXplKGNoYW5nZUxpc3QpID4gMDtcbiAgICAgIGlmIChuZWVkSW5zdGFsbCkge1xuICAgICAgICBjb25zdCBjaGFuZ2VkID0gW107XG4gICAgICAgIGNvbnN0IHJlbW92ZWQgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCByb3cgb2YgY2hhbmdlTGlzdCkge1xuICAgICAgICAgIGlmIChyb3dbMV0gPT0gbnVsbClcbiAgICAgICAgICAgIHJlbW92ZWQucHVzaChyb3dbMF0pO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGNoYW5nZWQucHVzaChyb3dbMF0gKyAnQCcgKyByb3dbMV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGFuZ2VkLmxlbmd0aCA+IDApXG4gICAgICAgICAgbG9nLmluZm8oJ0NoYW5nZWQgZGVwZW5kZW5jaWVzOicsIGNoYW5nZWQuam9pbignLCAnKSk7XG4gICAgICAgIGlmIChyZW1vdmVkLmxlbmd0aCA+IDApXG4gICAgICAgICAgbG9nLmluZm8oY2hhbGsuYmx1ZSgnUmVtb3ZlZCBkZXBlbmRlbmNpZXM6JyksIHJlbW92ZWQuam9pbignLCAnKSk7XG4gICAgICB9XG4gICAgICAvLyBmcy53cml0ZUZpbGVTeW5jKG1haW5Qa0ZpbGUsIEpTT04uc3RyaW5naWZ5KG1haW5Qa2pzb24sIG51bGwsICcgICcpKTtcbiAgICAgIC8vIGxvZy5pbmZvKCclcyBpcyB3cml0dGVuLicsIG1haW5Qa0ZpbGUpO1xuICAgICAgcmV0dXJuIG5lZWRJbnN0YWxsO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3RyYWNrRGVwZW5kZW5jeSh0cmFja1RvOiB7W3BOYW1lOiBzdHJpbmddOiBEZXBJbmZvW119LCBuYW1lOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZywgYnlXaG9tOiBzdHJpbmcsIHBhdGg6IHN0cmluZykge1xuICAgIGlmICghXy5oYXModHJhY2tUbywgbmFtZSkpIHtcbiAgICAgIHRyYWNrVG9bbmFtZV0gPSBbXTtcbiAgICB9XG4gICAgY29uc3QgbSA9IHRoaXMudmVyc2lvblJlZy5leGVjKHZlcnNpb24pO1xuICAgIHRyYWNrVG9bbmFtZV0ucHVzaCh7XG4gICAgICB2ZXI6IHZlcnNpb24gPT09ICcqJyA/ICcnIDogdmVyc2lvbixcbiAgICAgIHZlck51bTogbSA/IG1bMl0gOiB1bmRlZmluZWQsXG4gICAgICBwcmU6IG0gPyBtWzFdIDogJycsXG4gICAgICBieTogYnlXaG9tLFxuICAgICAgcGF0aFxuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIF9jb250YWluc0RpZmZWZXJzaW9uKHNvcnRlZFZlcnNpb25zOiBEZXBJbmZvW10pIHtcbiAgICAvLyB2YXIgc2VsZiA9IHRoaXM7XG4gICAgZm9yIChsZXQgaSA9IDAsIGwgPSBzb3J0ZWRWZXJzaW9ucy5sZW5ndGggLSAxOyBpIDwgbDsgaSsrKSB7XG4gICAgICBjb25zdCBhID0gc29ydGVkVmVyc2lvbnNbaV0udmVyO1xuICAgICAgY29uc3QgYiA9IHNvcnRlZFZlcnNpb25zW2kgKyAxXS52ZXI7XG5cbiAgICAgIGlmIChiID09PSAnKicgfHwgYiA9PT0gJycpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgaWYgKGEgIT09IGIpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLyoqXG5cdCAqIFNvcnQgYnkgZGVzY2VuZGluZ1xuXHQgKiBAcGFyYW0gdmVySW5mb0xpc3Qge3Zlcjogc3RyaW5nLCBieTogc3RyaW5nLCBuYW1lOiBzdHJpbmd9XG5cdCAqL1xuICBwcm90ZWN0ZWQgc29ydEJ5VmVyc2lvbih2ZXJJbmZvTGlzdDogRGVwSW5mb1tdLCBuYW1lOiBzdHJpbmcpIHtcbiAgICBpZiAodmVySW5mb0xpc3QgPT0gbnVsbClcbiAgICAgIHJldHVybiB2ZXJJbmZvTGlzdDtcbiAgICB0cnkge1xuICAgICAgdmVySW5mb0xpc3Quc29ydCgoaW5mbzEsIGluZm8yKSA9PiB7XG4gICAgICAgIGlmIChpbmZvMS52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMi52ZXJOdW0gIT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IHJlcyA9IHNlbXZlci5yY29tcGFyZShpbmZvMS52ZXJOdW0sIGluZm8yLnZlck51bSk7XG4gICAgICAgICAgaWYgKHJlcyA9PT0gMClcbiAgICAgICAgICAgIHJldHVybiBpbmZvMS5wcmUgPT09ICcnICYmIGluZm8yLnByZSAhPT0gJycgPyAtMSA6XG4gICAgICAgICAgICAgIChpbmZvMS5wcmUgIT09ICcnICYmIGluZm8yLnByZSA9PT0gJycgPyAxIDogMCk7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSBlbHNlIGlmIChpbmZvMS52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMi52ZXJOdW0gPT0gbnVsbClcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIGVsc2UgaWYgKGluZm8yLnZlck51bSAhPSBudWxsICYmIGluZm8xLnZlck51bSA9PSBudWxsKVxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICBlbHNlIGlmIChpbmZvMS52ZXIgPiBpbmZvMi52ZXIpXG4gICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICBlbHNlIGlmIChpbmZvMS52ZXIgPCBpbmZvMi52ZXIpXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXR1cm4gMDtcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZy5lcnJvcihgSW52YWxpZCBzZW12ZXIgZm9ybWF0IGZvciAke25hbWUgfHwgJyd9OiBgICsgSlNPTi5zdHJpbmdpZnkodmVySW5mb0xpc3QsIG51bGwsICcgICcpKTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuICAgIHJldHVybiB2ZXJJbmZvTGlzdDtcbiAgfVxufVxuIl19