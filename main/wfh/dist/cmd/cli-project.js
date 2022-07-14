"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProject = void 0;
const tslib_1 = require("tslib");
// import fs from 'fs-extra';
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const path_1 = tslib_1.__importDefault(require("path"));
const operators_1 = require("rxjs/operators");
const package_mgr_1 = require("../package-mgr");
const misc_1 = require("../utils/misc");
const store_1 = require("../store");
// import { writeFile } from './utils';
// import config from '../config';
const rootPath = (0, misc_1.getRootDir)();
/**
 * @param action
 * @param dirs
 */
function default_1(opts, action, dirs) {
    listProject(undefined, true);
    switch (action) {
        case 'add':
            store_1.dispatcher.changeActionOnExit('save');
            if (dirs) {
                if (opts.isSrcDir)
                    package_mgr_1.actionDispatcher.addSrcDirs(dirs);
                else
                    package_mgr_1.actionDispatcher.addProject(dirs);
            }
            break;
        case 'remove':
            store_1.dispatcher.changeActionOnExit('save');
            if (dirs) {
                if (opts.isSrcDir)
                    package_mgr_1.actionDispatcher.deleteSrcDirs(dirs);
                else
                    package_mgr_1.actionDispatcher.deleteProject(dirs);
            }
            break;
        default:
            listProject();
    }
}
exports.default = default_1;
function listProject(projects, afterChange = false) {
    (0, package_mgr_1.getStore)().pipe((0, operators_1.distinctUntilChanged)((a, b) => a.project2Packages === b.project2Packages &&
        a.srcDir2Packages === b.srcDir2Packages), (0, operators_1.map)(s => ({ project2Packages: [...s.project2Packages.keys()], srcDir2Packages: [...s.srcDir2Packages.keys()] })), (0, operators_1.distinctUntilChanged)((a, b) => {
        return lodash_1.default.difference(a.project2Packages, b.project2Packages).length === 0 &&
            lodash_1.default.difference(b.project2Packages, a.project2Packages).length === 0 &&
            lodash_1.default.difference(a.srcDir2Packages, b.srcDir2Packages).length === 0 &&
            lodash_1.default.difference(b.srcDir2Packages, a.srcDir2Packages).length === 0;
    }), afterChange ? (0, operators_1.skip)(1) : (0, operators_1.map)(s => s), (0, operators_1.map)(s => {
        printProjects(s.project2Packages, s.srcDir2Packages);
    }), (0, operators_1.take)(1)).subscribe();
}
exports.listProject = listProject;
function printProjects(projects, srcDirs) {
    let str = 'Project directories'.toUpperCase();
    str += '\n \n';
    let i = 0;
    for (let dir of projects) {
        dir = path_1.default.resolve(rootPath, dir);
        str += lodash_1.default.padEnd(i + 1 + '. ', 5, ' ') + dir;
        str += '\n';
        i++;
    }
    if (i === 0) {
        str += 'No projects';
    }
    // eslint-disable-next-line no-console
    console.log((0, misc_1.boxString)(str));
    str = 'Linked source directories'.toUpperCase();
    str += '\n \n';
    i = 0;
    for (let dir of srcDirs) {
        dir = path_1.default.resolve(rootPath, dir);
        str += lodash_1.default.padEnd(i + 1 + '. ', 5, ' ') + dir;
        str += '\n';
        i++;
    }
    if (i === 0) {
        str = 'No linked source directories';
    }
    // eslint-disable-next-line no-console
    console.log((0, misc_1.boxString)(str));
}
//# sourceMappingURL=cli-project.js.map