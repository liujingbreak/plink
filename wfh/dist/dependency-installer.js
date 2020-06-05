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
const package_json_guarder_1 = require("./package-json-guarder");
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
        const packageJsonGuarder = package_json_guarder_1.getInstance(rootPath);
        let mainPkjson;
        let mainDeps;
        let mainDevDeps;
        if (!packageJsonGuarder.isPackageJsonDirty) {
            const mainPkFile = Path.resolve(rootPath, 'package.json');
            log.info('Checking', mainPkFile);
            mainPkjson = JSON.parse(fs.readFileSync(mainPkFile, 'utf8'));
            mainDeps = mainPkjson.dependencies;
            mainDevDeps = mainPkjson.devDependencies;
            if (mainDeps == null)
                mainDeps = mainPkjson.dependencies = {};
            if (mainDevDeps == null)
                mainDevDeps = mainPkjson.devDependencies = {};
            // if (process.env.NODE_ENV !== 'production')
            //   _.assign(mainDeps, mainPkjson.devDependencies);
            _.each(packageJsonGuarder.getChanges().dependencies, (ver, name) => {
                // If there is a same dependency in original package.json, we use the version of that one, cuz' that might be manually set
                if (!_.has(mainDeps, name))
                    mainDeps[name] = ver;
            });
        }
        else {
            mainPkjson = packageJsonGuarder.getChanges();
            mainDeps = mainPkjson.dependencies || {};
            mainDevDeps = mainPkjson.devDependencies || {};
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
            printOut += _.padStart('Dependency ', nameWidth + 13) + '| Dependent\n';
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
            const deleted = [];
            for (const depList of [mainDeps, mainDevDeps]) {
                for (const name of Object.keys(depList)) {
                    if (_.get(this.componentMap, [name, 'toInstall']) === false) {
                        delete mainDeps[name];
                        deleted.push(name);
                    }
                }
            }
            log.info(chalk.blue('source linked dependency: ' + deleted.join(', ')));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeS1pbnN0YWxsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9kZXBlbmRlbmN5LWluc3RhbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxvQ0FBb0M7QUFDcEMsdUNBQXlCO0FBQ3pCLHVDQUFvQztBQUNwQywwQ0FBNEI7QUFDNUIsMkNBQTZCO0FBQzdCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN4QyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDbkYsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDL0QsaUVBQTRFO0FBQzVFLGdFQUFrRDtBQUVsRCxTQUFnQixrQkFBa0IsQ0FBQyxXQUFxQixFQUFFLEtBQWMsRUFBRSxhQUFzQjtJQUM5RiwrREFBK0Q7SUFDL0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQztJQUN2QyxTQUFTLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ25DLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0lBQ2xDLE9BQU8sU0FBUyxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQztBQUMzRCxDQUFDO0FBTkQsZ0RBTUM7QUFVRCxNQUFNLGNBQWM7SUFNbEI7UUFIQSxlQUFVLEdBQUcsZ0JBQWdCLENBQUM7UUFJNUIsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLGNBQWMsQ0FBQyxFQUFFO1lBQ3JDLE9BQU8sSUFBSSxj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TSxDQUFDLENBQUM7U0FDVDtRQUNELE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtta2RpcnBTeW5jfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuY29uc3QgY29uZmlnID0gcmVxdWlyZSgnLi4vbGliL2NvbmZpZycpO1xuY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuY29uc3Qgc2VtdmVyID0gcmVxdWlyZSgnc2VtdmVyJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ3dmaC4nICsgUGF0aC5iYXNlbmFtZShfX2ZpbGVuYW1lLCAnLmpzJykpO1xuY29uc3QgcGFja2FnZVV0aWxzID0gcmVxdWlyZSgnLi4vbGliL3BhY2thZ2VNZ3IvcGFja2FnZVV0aWxzJyk7XG5pbXBvcnQge2dldEluc3RhbmNlIGFzIGdldFBhY2thZ2VKc29uR3VhcmRlcn0gZnJvbSAnLi9wYWNrYWdlLWpzb24tZ3VhcmRlcic7XG5pbXBvcnQgKiBhcyByZWNpcGVNYW5hZ2VyIGZyb20gJy4vcmVjaXBlLW1hbmFnZXInO1xuXG5leHBvcnQgZnVuY3Rpb24gbGlzdENvbXBEZXBlbmRlbmN5KHBrSnNvbkZpbGVzOiBzdHJpbmdbXSwgd3JpdGU6IGJvb2xlYW4sIGlzRHJjcFN5bWxpbms6IGJvb2xlYW4pIHtcbiAgLy8gbG9nLmluZm8oJ3NjYW4gY29tcG9uZW50cyBmcm9tOlxcbicsIHBrSnNvbkZpbGVzLmpvaW4oJ1xcbicpKTtcbiAgY29uc3QgaW5zdGFsbGVyID0gbmV3IEluc3RhbGxNYW5hZ2VyKCk7XG4gIGluc3RhbGxlci5zY2FuU3JjRGVwcyhwa0pzb25GaWxlcyk7XG4gIGluc3RhbGxlci5zY2FuSW5zdGFsbGVkUGVlckRlcHMoKTtcbiAgcmV0dXJuIGluc3RhbGxlci5wcmludENvbXBvbmVudERlcCh3cml0ZSwgaXNEcmNwU3ltbGluayk7XG59XG5cbmludGVyZmFjZSBEZXBJbmZvIHtcbiAgdmVyOiBzdHJpbmc7XG4gIHZlck51bT86IHN0cmluZztcbiAgcHJlOiBzdHJpbmc7XG4gIGJ5OiBzdHJpbmc7XG4gIHBhdGg6IHN0cmluZztcbn1cblxuY2xhc3MgSW5zdGFsbE1hbmFnZXIge1xuXG4gIHNyY0RlcHM6IHtbcE5hbWU6IHN0cmluZ106IERlcEluZm9bXX07XG4gIHZlcnNpb25SZWcgPSAvXihcXEQqKShcXGQuKj8pJC87XG4gIGNvbXBvbmVudE1hcDoge1twTmFtZTogc3RyaW5nXToge3Zlcjogc3RyaW5nLCB0b0luc3RhbGw6IGJvb2xlYW59fTtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgSW5zdGFsbE1hbmFnZXIpKSB7XG4gICAgICByZXR1cm4gbmV3IEluc3RhbGxNYW5hZ2VyKCk7XG4gICAgfVxuICAgIHRoaXMuc3JjRGVwcyA9IHt9OyAvLyBzcmMgcGFja2FnZXMgbmVlZGVkIGRlcGVuZGVuY2llcyBhbmQgYWxsIHBhY2thZ2VzIG5lZWRlZCBwZWVyIGRlcGVuZGVuY2llc1xuICAgIC8vIHRoaXMucGVlckRlcHMgPSB7fTsgLy8gYWxsIHBhY2thZ2VzIG5lZWRlZCBwZWVyIGRlcGVuZGVuY2llc1xuICB9XG5cbiAgc2NhblNyY0RlcHMoanNvbkZpbGVzOiBzdHJpbmdbXSkge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuY29tcG9uZW50TWFwID0ge307XG4gICAgZm9yIChjb25zdCBwYWNrYWdlSnNvbiBvZiBqc29uRmlsZXMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnc2NhblNyY0RlcHNBc3luYygpICcgKyBQYXRoLnJlbGF0aXZlKGNvbmZpZygpLnJvb3RQYXRoLCBwYWNrYWdlSnNvbikpO1xuICAgICAgY29uc3QganNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBhY2thZ2VKc29uLCAndXRmOCcpKTtcbiAgICAgIGlmICghanNvbi5kcilcbiAgICAgICAgY29udGludWU7XG4gICAgICB0aGlzLmNvbXBvbmVudE1hcFtqc29uLm5hbWVdID0ge3ZlcjoganNvbi52ZXJzaW9uLCB0b0luc3RhbGw6IGZhbHNlfTtcbiAgICAgIGNvbnN0IGRlcHMgPSBqc29uLmRlcGVuZGVuY2llcztcbiAgICAgIGlmIChkZXBzKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhkZXBzKSkge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBkZXBzW25hbWVdO1xuICAgICAgICAgIC8vIGxvZy5kZWJ1Zygnc2NhblNyY0RlcHNBc3luYygpIGRlcCAnICsgbmFtZSk7XG4gICAgICAgICAgc2VsZi5fdHJhY2tEZXBlbmRlbmN5KHRoaXMuc3JjRGVwcywgbmFtZSwgdmVyc2lvbiwganNvbi5uYW1lLCBwYWNrYWdlSnNvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChqc29uLmRldkRlcGVuZGVuY2llcykge1xuICAgICAgICAvLyBsb2cud2FybihgJCR7anNvbi5uYW1lfSBjb250YWlucyBcImRldkRlcGVuZW5kaWVzXCIsIGlmIHRoZXkgYXJlIG5lY2Vzc2FyeSBmb3IgY29tcGlsaW5nIHRoaXMgY29tcG9uZW50YCArXG4gICAgICAgIC8vIFx0J3lvdSBzaG91bGQgbW92ZSB0aGVtIHRvIFwiZGVwZW5kZW5jaWVzXCIgb3IgXCJwZWVyRGVwZW5kZW5jaWVzXCInKTtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGpzb24uZGV2RGVwZW5kZW5jaWVzKSkge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBqc29uLmRldkRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgICAgICBzZWxmLl90cmFja0RlcGVuZGVuY3kodGhpcy5zcmNEZXBzLCBuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUsIHBhY2thZ2VKc29uKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGpzb24ucGVlckRlcGVuZGVuY2llcykge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoanNvbi5wZWVyRGVwZW5kZW5jaWVzKSkge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBqc29uLnBlZXJEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICAgICAgc2VsZi5fdHJhY2tEZXBlbmRlbmN5KHRoaXMuc3JjRGVwcywgbmFtZSwgdmVyc2lvbiwganNvbi5uYW1lLCBwYWNrYWdlSnNvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzY2FuSW5zdGFsbGVkUGVlckRlcHMoKSB7XG4gICAgLy8gVE9ETzogSGVyZSBJIHdhbnQgdG8gZGV0ZXJtaW5lIGV4cGVjdGVkIGNvbXBvbmVudCB2ZXJzaW9uIHRvIGluc3RhbGwgd2l0aCwgYnV0IHNvIGZhciB0aGUgdmVyc2lvbiBudW1iZXIgb2YgZWFjaCBjb21wb25lbnQgdGhhdCBJIGdldCBpcyBjdXJyZW50bHkgaW5zdGFsbGVkXG4gICAgLy8gb25lIHdoaWNoIG1pZ2h0IGJlIGluY29ycmVjdCBvciBvdXRkYXRlZCwgaW4gY2FzZSBsaWtlIGRldmVsb3BlciBkaWQgbm90IHJ1biBcInlhcm4gaW5zdGFsbFwiIGJlZm9yZSBcImRyY3AgaW5pdFwiLlxuICAgIC8vIE9uZSBwcm9ibGVtIGlzOiBcbiAgICAvLyBXaXRob3V0IHJ1bm5pbmcgXCJ5YXJuIGluc3RhbGxcIiB0byBkb3dubG9hZCBcInJlY2lwZVwiIHBhY2thZ2UsIEkgY2FuJ3Qga25vdyBleGFjdCB1cCB0byBkYXRlIHZlcnNpb24gbnVtYmVyIG9mIHRob3NlIGNvbXBvbmVudHNcbiAgICAvLyB3aGljaCBiZWxvbmcgdG8gYSBjZXJ0YWluIFwicmVjaXBlXCIgcGFjYWtnZS5cbiAgICAvLyBTbyBmaXJzdGx5LCBhbHdheXMgXCJ5YXJuIGluc3RhbGxcIiBiZWZvcmUgXCJkcmNwIGluaXRcIlxuXG4gICAgLy8gQW5vdGhlciBwcm9ibGVtIGlzOlxuICAgIC8vIFRoZXNlIG9sZCBjb21wb25lbnQgdmVyc2lvbnMgYXJlIHRyYWNrZWQgaW4gZGlzdC9kci5wYWNrYWdlLmpzb24gd2FpdGluZyBmb3IgYmVpbmcgY29tcGFyZWQgd2l0aCBuZXdseSBjaGFuZ2VkIHZlcnNpb24gbGlzdC5cbiAgICAvLyBCdXQgLi4uXG4gICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcygobmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZTogc3RyaW5nLCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpID0+IHtcbiAgICAgIGlmIChfLmhhcyh0aGlzLmNvbXBvbmVudE1hcCwgbmFtZSkpXG4gICAgICAgIHJldHVybjsgLy8gU2tpcCBpdCwgc2luY2UgbW9zdCBsaWtlbHkgdGhlcmUgaXMgYSBkdXBsaWNhdGUgXCJpbnN0YWxsZWRcIiBkZXBlbmRlbmN5IGluIHBhY2thZ2UuanNvbiBhZ2FpbnN0IGFuIHN5bWJvbGljIGxpbmtlZCBjb21wb25lbnRcbiAgICAgIHRoaXMuY29tcG9uZW50TWFwW25hbWVdID0ge3ZlcjoganNvbi52ZXJzaW9uLCB0b0luc3RhbGw6IHRydWV9O1xuICAgICAgXy5lYWNoKGpzb24ucGVlckRlcGVuZGVuY2llcywgKHZlcnNpb24sIG5hbWUpID0+IHtcbiAgICAgICAgdGhpcy5fdHJhY2tEZXBlbmRlbmN5KHRoaXMuc3JjRGVwcywgbmFtZSwgdmVyc2lvbiwganNvbi5uYW1lLCBQYXRoLmpvaW4ocGFja2FnZVBhdGgsICdwYWNrYWdlLmpvc24nKSk7XG4gICAgICB9KTtcbiAgICB9LCAnaW5zdGFsbGVkJyk7XG4gIH1cblxuICAvKipcblx0ICogQHJldHVybiB0cnVlIGlmIHRoZXJlIGFyZSBuZXdseSBmb3VuZCBkZXBlbmRlbmNpZXMgYWRkZWQgdG8gcGFja2FnZS5qc29uXG5cdCAqL1xuICBwcmludENvbXBvbmVudERlcCh3cml0ZTogYm9vbGVhbiwgaXNEcmNwU3ltbGluazogYm9vbGVhbikge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGNvbnN0IHJvb3RQYXRoID0gY29uZmlnKCkucm9vdFBhdGg7XG4gICAgY29uc3QgcGFja2FnZUpzb25HdWFyZGVyID0gZ2V0UGFja2FnZUpzb25HdWFyZGVyKHJvb3RQYXRoKTtcbiAgICBsZXQgbWFpblBranNvbjoge2RlcGVuZGVuY2llczogYW55LCBkZXZEZXBlbmRlbmNpZXM6IGFueX07XG4gICAgbGV0IG1haW5EZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ307XG4gICAgbGV0IG1haW5EZXZEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ307XG5cbiAgICBpZiAoIXBhY2thZ2VKc29uR3VhcmRlci5pc1BhY2thZ2VKc29uRGlydHkpIHtcbiAgICAgIGNvbnN0IG1haW5Qa0ZpbGUgPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgIGxvZy5pbmZvKCdDaGVja2luZycsIG1haW5Qa0ZpbGUpO1xuICAgICAgbWFpblBranNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKG1haW5Qa0ZpbGUsICd1dGY4JykpO1xuICAgICAgbWFpbkRlcHMgPSBtYWluUGtqc29uLmRlcGVuZGVuY2llcztcbiAgICAgIG1haW5EZXZEZXBzID0gbWFpblBranNvbi5kZXZEZXBlbmRlbmNpZXM7XG4gICAgICBpZiAobWFpbkRlcHMgPT0gbnVsbClcbiAgICAgICAgbWFpbkRlcHMgPSBtYWluUGtqc29uLmRlcGVuZGVuY2llcyA9IHt9O1xuICAgICAgaWYgKG1haW5EZXZEZXBzID09IG51bGwpXG4gICAgICAgIG1haW5EZXZEZXBzID0gbWFpblBranNvbi5kZXZEZXBlbmRlbmNpZXMgPSB7fTtcblxuICAgICAgLy8gaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpXG4gICAgICAvLyAgIF8uYXNzaWduKG1haW5EZXBzLCBtYWluUGtqc29uLmRldkRlcGVuZGVuY2llcyk7XG4gICAgICBfLmVhY2gocGFja2FnZUpzb25HdWFyZGVyLmdldENoYW5nZXMoKS5kZXBlbmRlbmNpZXMsICh2ZXIsIG5hbWUpID0+IHtcbiAgICAgICAgLy8gSWYgdGhlcmUgaXMgYSBzYW1lIGRlcGVuZGVuY3kgaW4gb3JpZ2luYWwgcGFja2FnZS5qc29uLCB3ZSB1c2UgdGhlIHZlcnNpb24gb2YgdGhhdCBvbmUsIGN1eicgdGhhdCBtaWdodCBiZSBtYW51YWxseSBzZXRcbiAgICAgICAgaWYgKCFfLmhhcyhtYWluRGVwcywgbmFtZSkpXG4gICAgICAgICAgbWFpbkRlcHNbbmFtZV0gPSB2ZXI7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWFpblBranNvbiA9IHBhY2thZ2VKc29uR3VhcmRlci5nZXRDaGFuZ2VzKCk7XG4gICAgICBtYWluRGVwcyA9IG1haW5Qa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9O1xuICAgICAgbWFpbkRldkRlcHMgPSBtYWluUGtqc29uLmRldkRlcGVuZGVuY2llcyB8fCB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBkZXBOYW1lcyA9IE9iamVjdC5rZXlzKHRoaXMuc3JjRGVwcyk7XG4gICAgZGVwTmFtZXMuc29ydCgpO1xuICAgIC8vIHZhciBwZWVyRGVwTmFtZXMgPSBPYmplY3Qua2V5cyh0aGlzLnBlZXJEZXBzKTtcbiAgICBpZiAoZGVwTmFtZXMubGVuZ3RoID09PSAwKVxuICAgICAgcmV0dXJuO1xuICAgIGNvbnN0IG5hbWVXaWR0aCA9IF8ubWF4QnkoZGVwTmFtZXMsIG5hbWUgPT4gbmFtZS5sZW5ndGgpIS5sZW5ndGg7XG5cbiAgICAvLyBsb2cud2FybihPYmplY3Qua2V5cyh0aGlzLmNvbXBvbmVudE1hcCkpO1xuXG4gICAgaWYgKGRlcE5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGxldCBwcmludE91dCA9IF8ucGFkKCcgQXNzb2NpYXRlZCBDb21wb25lbnRzIERlcGVuZGVuY2llcyAmICcgKyBjaGFsay5jeWFuKCdDb21wb25lbnRzIFBlZXIgRGVwZW5kZW5jaWVzJyksIDYwLCAnLScpICsgJ1xcbic7XG4gICAgICBwcmludE91dCArPSBfLnBhZFN0YXJ0KCdEZXBlbmRlbmN5ICcsIG5hbWVXaWR0aCArIDEzKSArICd8IERlcGVuZGVudFxcbic7XG4gICAgICBwcmludE91dCArPSBfLnJlcGVhdCgnLScsIG5hbWVXaWR0aCArIDEzKSArICd8JyArIF8ucmVwZWF0KCctJywgMTApICsgJ1xcbic7XG4gICAgICBsZXQgY291bnREZXAgPSAwO1xuICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGRlcE5hbWVzKSB7XG4gICAgICAgIGNvbnN0IHZlcnNpb25MaXN0ID0gdGhpcy5zcmNEZXBzW25hbWVdO1xuICAgICAgICBjb25zdCBmaXJzdFZlcnNpb24gPSBzZWxmLnNvcnRCeVZlcnNpb24odmVyc2lvbkxpc3QsIG5hbWUpWzBdO1xuICAgICAgICBsZXQgbWFya05ldyA9ICcgICc7XG4gICAgICAgIGlmIChuYW1lICE9PSAnQGRyL2ludGVybmFsLXJlY2lwZScgJiYgKCFfLmhhcyh0aGlzLmNvbXBvbmVudE1hcCwgbmFtZSkpICYmXG4gICAgICAgICAgKG1haW5EZXBzW25hbWVdICE9PSBmaXJzdFZlcnNpb24udmVyKSkge1xuICAgICAgICAgIG1haW5EZXBzW25hbWVdID0gZmlyc3RWZXJzaW9uLnZlcjtcbiAgICAgICAgICBtYXJrTmV3ID0gJysgJztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhc0RpZmZWZXJzaW9uID0gc2VsZi5fY29udGFpbnNEaWZmVmVyc2lvbih2ZXJzaW9uTGlzdCk7XG4gICAgICAgIGNvbnN0IHByaW50TmFtZSA9IChoYXNEaWZmVmVyc2lvbiA/IGNoYWxrLnJlZCA6IGNoYWxrLmN5YW4pKF8ucGFkU3RhcnQobWFya05ldyArIG5hbWUsIG5hbWVXaWR0aCwgJyAnKSk7XG4gICAgICAgIHByaW50T3V0ICs9IGAke3ByaW50TmFtZX0gJHt2ZXJzaW9uTGlzdC5sZW5ndGggPiAxID8gJ+KUgOKUrOKUgCcgOiAn4pSA4pSA4pSAJ30ke18ucGFkRW5kKGZpcnN0VmVyc2lvbi52ZXIsIDksICfilIAnKX0gJHtmaXJzdFZlcnNpb24uYnl9XFxuYDtcbiAgICAgICAgdmFyIGkgPSB2ZXJzaW9uTGlzdC5sZW5ndGggLSAxO1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3Qgb2YgdmVyc2lvbkxpc3Quc2xpY2UoMSkpIHtcbiAgICAgICAgICBwcmludE91dCArPSBgJHtfLnJlcGVhdCgnICcsIG5hbWVXaWR0aCl9ICR7aSA9PT0gMSA/ICcg4pSU4pSAJyA6ICcg4pSc4pSAJ30ke18ucGFkRW5kKHJlc3QudmVyLCA5LCAn4pSAJyl9ICR7cmVzdC5ieX1cXG5gO1xuICAgICAgICAgIGktLTtcbiAgICAgICAgfVxuICAgICAgICBjb3VudERlcCsrO1xuICAgICAgfVxuICAgICAgcHJpbnRPdXQgKz0gXy5wYWQoYCB0b3RhbCAke2NoYWxrLmdyZWVuKGNvdW50RGVwKX0gYCwgNjAsICctJyk7XG4gICAgICBsb2cuaW5mbyhwcmludE91dCk7XG4gICAgfVxuICAgIG1rZGlycFN5bmMoY29uZmlnKCkuZGVzdERpcik7XG4gICAgaWYgKHdyaXRlKSB7XG4gICAgICAvLyBfLmFzc2lnbihtYWluUGtqc29uLmRlcGVuZGVuY2llcywgbmV3RGVwSnNvbik7XG4gICAgICBjb25zdCBkZWxldGVkOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgICBmb3IgKGNvbnN0IGRlcExpc3Qgb2YgW21haW5EZXBzLCBtYWluRGV2RGVwc10pIHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGRlcExpc3QpKSB7XG4gICAgICAgICAgaWYgKF8uZ2V0KHRoaXMuY29tcG9uZW50TWFwLCBbbmFtZSwgJ3RvSW5zdGFsbCddKSBhcyBhbnkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBkZWxldGUgbWFpbkRlcHNbbmFtZV07XG4gICAgICAgICAgICBkZWxldGVkLnB1c2gobmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBsb2cuaW5mbyhjaGFsay5ibHVlKCdzb3VyY2UgbGlua2VkIGRlcGVuZGVuY3k6ICcgKyBkZWxldGVkLmpvaW4oJywgJykpKTtcbiAgICAgIHJlY2lwZU1hbmFnZXIuZWFjaFJlY2lwZVNyYygoc3JjRGlyOiBzdHJpbmcsIHJlY2lwZURpcjogc3RyaW5nLCByZWNpcGVOYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgICAgaWYgKHJlY2lwZU5hbWUgJiYgXy5oYXMobWFpbkRlcHMsIHJlY2lwZU5hbWUpKSB7XG4gICAgICAgICAgZGVsZXRlIG1haW5EZXBzW3JlY2lwZU5hbWVdO1xuICAgICAgICAgIGxvZy5pbmZvKGNoYWxrLmJsdWUoJ1JlbW92ZSByZWNpcGUgZGVwZW5kZW5jeTogJyArIHJlY2lwZU5hbWUpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBjb25zdCBjaGFuZ2VMaXN0OiBBcnJheTxbc3RyaW5nLCBzdHJpbmddPiA9IHBhY2thZ2VKc29uR3VhcmRlci5tYXJrQ2hhbmdlcyhtYWluUGtqc29uKTtcbiAgICAgIGNvbnN0IG5lZWRJbnN0YWxsID0gXy5zaXplKGNoYW5nZUxpc3QpID4gMDtcbiAgICAgIGlmIChuZWVkSW5zdGFsbCkge1xuICAgICAgICBjb25zdCBjaGFuZ2VkID0gW107XG4gICAgICAgIGNvbnN0IHJlbW92ZWQgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCByb3cgb2YgY2hhbmdlTGlzdCkge1xuICAgICAgICAgIGlmIChyb3dbMV0gPT0gbnVsbClcbiAgICAgICAgICAgIHJlbW92ZWQucHVzaChyb3dbMF0pO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGNoYW5nZWQucHVzaChyb3dbMF0gKyAnQCcgKyByb3dbMV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGFuZ2VkLmxlbmd0aCA+IDApXG4gICAgICAgICAgbG9nLmluZm8oJ0NoYW5nZWQgZGVwZW5kZW5jaWVzOicsIGNoYW5nZWQuam9pbignLCAnKSk7XG4gICAgICAgIGlmIChyZW1vdmVkLmxlbmd0aCA+IDApXG4gICAgICAgICAgbG9nLmluZm8oY2hhbGsuYmx1ZSgnUmVtb3ZlZCBkZXBlbmRlbmNpZXM6JyksIHJlbW92ZWQuam9pbignLCAnKSk7XG4gICAgICB9XG4gICAgICAvLyBmcy53cml0ZUZpbGVTeW5jKG1haW5Qa0ZpbGUsIEpTT04uc3RyaW5naWZ5KG1haW5Qa2pzb24sIG51bGwsICcgICcpKTtcbiAgICAgIC8vIGxvZy5pbmZvKCclcyBpcyB3cml0dGVuLicsIG1haW5Qa0ZpbGUpO1xuICAgICAgcmV0dXJuIG5lZWRJbnN0YWxsO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3RyYWNrRGVwZW5kZW5jeSh0cmFja1RvOiB7W3BOYW1lOiBzdHJpbmddOiBEZXBJbmZvW119LCBuYW1lOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZywgYnlXaG9tOiBzdHJpbmcsIHBhdGg6IHN0cmluZykge1xuICAgIGlmICghXy5oYXModHJhY2tUbywgbmFtZSkpIHtcbiAgICAgIHRyYWNrVG9bbmFtZV0gPSBbXTtcbiAgICB9XG4gICAgY29uc3QgbSA9IHRoaXMudmVyc2lvblJlZy5leGVjKHZlcnNpb24pO1xuICAgIHRyYWNrVG9bbmFtZV0ucHVzaCh7XG4gICAgICB2ZXI6IHZlcnNpb24gPT09ICcqJyA/ICcnIDogdmVyc2lvbixcbiAgICAgIHZlck51bTogbSA/IG1bMl0gOiB1bmRlZmluZWQsXG4gICAgICBwcmU6IG0gPyBtWzFdIDogJycsXG4gICAgICBieTogYnlXaG9tLFxuICAgICAgcGF0aFxuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIF9jb250YWluc0RpZmZWZXJzaW9uKHNvcnRlZFZlcnNpb25zOiBEZXBJbmZvW10pIHtcbiAgICAvLyB2YXIgc2VsZiA9IHRoaXM7XG4gICAgZm9yIChsZXQgaSA9IDAsIGwgPSBzb3J0ZWRWZXJzaW9ucy5sZW5ndGggLSAxOyBpIDwgbDsgaSsrKSB7XG4gICAgICBjb25zdCBhID0gc29ydGVkVmVyc2lvbnNbaV0udmVyO1xuICAgICAgY29uc3QgYiA9IHNvcnRlZFZlcnNpb25zW2kgKyAxXS52ZXI7XG5cbiAgICAgIGlmIChiID09PSAnKicgfHwgYiA9PT0gJycpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgaWYgKGEgIT09IGIpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLyoqXG5cdCAqIFNvcnQgYnkgZGVzY2VuZGluZ1xuXHQgKiBAcGFyYW0gdmVySW5mb0xpc3Qge3Zlcjogc3RyaW5nLCBieTogc3RyaW5nLCBuYW1lOiBzdHJpbmd9XG5cdCAqL1xuICBwcm90ZWN0ZWQgc29ydEJ5VmVyc2lvbih2ZXJJbmZvTGlzdDogRGVwSW5mb1tdLCBuYW1lOiBzdHJpbmcpIHtcbiAgICBpZiAodmVySW5mb0xpc3QgPT0gbnVsbClcbiAgICAgIHJldHVybiB2ZXJJbmZvTGlzdDtcbiAgICB0cnkge1xuICAgICAgdmVySW5mb0xpc3Quc29ydCgoaW5mbzEsIGluZm8yKSA9PiB7XG4gICAgICAgIGlmIChpbmZvMS52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMi52ZXJOdW0gIT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IHJlcyA9IHNlbXZlci5yY29tcGFyZShpbmZvMS52ZXJOdW0sIGluZm8yLnZlck51bSk7XG4gICAgICAgICAgaWYgKHJlcyA9PT0gMClcbiAgICAgICAgICAgIHJldHVybiBpbmZvMS5wcmUgPT09ICcnICYmIGluZm8yLnByZSAhPT0gJycgPyAtMSA6XG4gICAgICAgICAgICAgIChpbmZvMS5wcmUgIT09ICcnICYmIGluZm8yLnByZSA9PT0gJycgPyAxIDogMCk7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSBlbHNlIGlmIChpbmZvMS52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMi52ZXJOdW0gPT0gbnVsbClcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIGVsc2UgaWYgKGluZm8yLnZlck51bSAhPSBudWxsICYmIGluZm8xLnZlck51bSA9PSBudWxsKVxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICBlbHNlIGlmIChpbmZvMS52ZXIgPiBpbmZvMi52ZXIpXG4gICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICBlbHNlIGlmIChpbmZvMS52ZXIgPCBpbmZvMi52ZXIpXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXR1cm4gMDtcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZy5lcnJvcihgSW52YWxpZCBzZW12ZXIgZm9ybWF0IGZvciAke25hbWUgfHwgJyd9OiBgICsgSlNPTi5zdHJpbmdpZnkodmVySW5mb0xpc3QsIG51bGwsICcgICcpKTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuICAgIHJldHVybiB2ZXJJbmZvTGlzdDtcbiAgfVxufVxuIl19