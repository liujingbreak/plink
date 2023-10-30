"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDependencyTo = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const log4js_1 = require("log4js");
const lodash_1 = __importDefault(require("lodash"));
const chalk_1 = __importDefault(require("chalk"));
const strip_ansi_1 = __importDefault(require("strip-ansi"));
const process_utils_1 = require("../process-utils");
const patch_text_1 = __importDefault(require("../utils/patch-text"));
const json_sync_parser_1 = __importDefault(require("../utils/json-sync-parser"));
const misc_1 = require("../utils/misc");
const package_list_helper_1 = require("../package-mgr/package-list-helper");
const index_1 = require("../package-mgr/index");
require("../editor-helper");
const store_1 = require("../store");
const utils_1 = require("./utils");
// import inspector from 'inspector';
// inspector.open(9222, '0.0.0.0', true);
const log = (0, log4js_1.getLogger)('plink.cli-add-package');
async function addDependencyTo(packages, to, dev = false) {
    if (packages.length === 0) {
        throw new Error('At least specify one dependency argument');
    }
    store_1.dispatcher.changeActionOnExit('save');
    let wsDirs = [];
    if (to == null) {
        if ((0, index_1.isCwdWorkspace)()) {
            to = misc_1.plinkEnv.workDir;
        }
        else {
            const ws = (0, index_1.getState)().currWorkspace;
            if (ws == null) {
                throw new Error('No worktree space is found for current directory, and no "--to" option is specified.\n' +
                    'Either execute this command with option "--to <pkg name | pkg dir | worktree space>"' +
                    'or in a workstree space directory.');
            }
            to = (0, index_1.workspaceDir)(ws);
        }
        wsDirs.push(to);
    }
    else {
        const tryWsKey = (0, index_1.workspaceKey)(to);
        if ((0, index_1.getState)().workspaces.has(tryWsKey)) {
            wsDirs.push(path_1.default.resolve(to));
        }
        else {
            const [foundPkg] = (0, utils_1.findPackagesByNames)([to]);
            if (foundPkg == null) {
                throw new Error('No matched linked package or worktree space is found for option "--to"');
            }
            to = foundPkg.realPath;
            const rootDir = misc_1.plinkEnv.rootDir;
            wsDirs = Array.from((0, package_list_helper_1.workspacesOfDependencies)(foundPkg.name))
                .map(ws => path_1.default.resolve(rootDir, ws));
        }
    }
    await add(packages, to, dev);
    setImmediate(() => {
        for (const wsDir of wsDirs) {
            index_1.actionDispatcher.updateWorkspace({ dir: wsDir, isForce: false });
        }
    });
}
exports.addDependencyTo = addDependencyTo;
async function add(packages, toDir, dev = false) {
    const targetJsonFile = path_1.default.resolve(toDir, 'package.json');
    const pkgJsonStr = fs_1.default.readFileSync(targetJsonFile, 'utf-8');
    const objAst = (0, json_sync_parser_1.default)(pkgJsonStr);
    const patches = [];
    const depsAst = dev
        ? objAst.properties.find(prop => prop.name.text === '"devDependencies"') :
        objAst.properties.find(prop => prop.name.text === '"dependencies"');
    const depsSet = depsAst == null ?
        new Set() :
        new Set(depsAst.value.properties.map(prop => prop.name.text.slice(1, -1)));
    log.debug('existing:', depsSet);
    const input = packages.map(rawName => {
        const m = /^((?:@[^/]+\/)?[^/@]+)(?:@([^]+))?$/.exec(rawName);
        if (m) {
            return [m[1], m[2]];
        }
        else {
            throw new Error(`Invalid package name: ${rawName}, valid name should be like "<pkg name>[@<version>]"`);
        }
    });
    let i = 0;
    let newLines = '';
    const srcPkgs = Array.from((0, utils_1.findPackagesByNames)(input.map(item => item[0])));
    await Promise.all(srcPkgs.map(async (pkg) => {
        const inputItem = input[i++];
        let version = inputItem[1];
        if (pkg == null || (pkg.json.dr == null && pkg.json.plink == null)) {
            const name = inputItem[0];
            if (depsSet.has(name)) {
                log.warn(`Found duplicate existing dependency ${chalk_1.default.red(name)}`);
                return;
            }
            if (version == null) {
                version = await fetchRemoteVersion(name);
            }
            log.info(`Package ${name}@${version} is not a linked package, add as 3rd party dependency`);
            newLines += `    "${name}": "${version}",\n`;
        }
        else {
            if (depsSet.has(pkg.name)) {
                log.warn(`Duplicate with existing dependency ${chalk_1.default.red(pkg.name)}`);
                return;
            }
            log.info(`Add package ${chalk_1.default.cyan(pkg.name)} ${version || ''}`);
            newLines += `    "${pkg.name}": "${version || pkg.json.version}",\n`;
        }
    }));
    if (newLines.length > 0)
        newLines = newLines.slice(0, newLines.length - 2); // trim last comma
    else
        return;
    log.debug(newLines);
    if (depsAst == null) {
        const last = objAst.properties[objAst.properties.length - 1];
        const pos = last.value.end;
        patches.push({ start: pos, end: pos,
            text: `,\n  "${dev ? 'devDependencies' : 'dependencies'}": {\n${newLines}\n  }` });
    }
    else {
        const props = depsAst.value.properties;
        let start = 0;
        if (props.length > 0) {
            start = props[props.length - 1].value.end;
            newLines = ',\n' + newLines;
        }
        else {
            start = depsAst.value.end - 1;
        }
        patches.push({ start, end: start, text: newLines });
    }
    const newJsonText = (0, patch_text_1.default)(pkgJsonStr, patches);
    log.info(`Write file: ${targetJsonFile}:\n` + newJsonText);
    fs_1.default.writeFileSync(targetJsonFile, newJsonText);
}
// TODO: set a timeout control
async function fetchRemoteVersion(pkgName) {
    const text = (0, strip_ansi_1.default)(await (0, process_utils_1.exe)('npm', 'view', pkgName, { silent: true }).promise);
    const rPattern = lodash_1.default.escapeRegExp(pkgName) + '@(\\S*)\\s';
    const pattern = new RegExp(rPattern);
    const m = pattern.exec(text);
    if (m) {
        return m[1];
    }
    throw new Error(`Failed to fetch dependency latest version (pattern: ${rPattern}) from message:\n ${text}`);
}
//# sourceMappingURL=cli-add-package.js.map