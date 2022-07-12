"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanPackages = exports.allSrcDirs = exports.eachRecipeSrc = exports.setLinkPatterns = exports.setProjectList = void 0;
/* eslint-disable max-len */
/**
 * To avoid cyclic referecing, This file should not depends on package-mgr/index !!!
 */
const _ = __importStar(require("lodash"));
const Path = __importStar(require("path"));
const rxjs_1 = require("rxjs");
const fs = __importStar(require("fs-extra"));
const find_package_1 = __importDefault(require("./package-mgr/find-package"));
// import * as rwPackageJson from './rwPackageJson';
const operators_1 = require("rxjs/operators");
let projectList = [];
let linkPatterns = [];
function setProjectList(list) {
    projectList = list;
}
exports.setProjectList = setProjectList;
function setLinkPatterns(list) {
    linkPatterns = Array.from(list);
}
exports.setLinkPatterns = setLinkPatterns;
function eachRecipeSrc(projectDir, callback) {
    if (arguments.length === 1) {
        callback = arguments[0];
        forProject(projectList);
    }
    else if (arguments.length === 2) {
        if (typeof projectDir === 'string' || Array.isArray(projectDir)) {
            forProject(projectDir);
        }
        else {
            forProject(projectList);
        }
    }
    function forProject(prjDirs) {
        [].concat(prjDirs).forEach(prjDir => {
            for (const srcDir of srcDirsOfProject(prjDir)) {
                callback(srcDir, prjDir);
            }
            // const e2eDir = Path.join(prjDir, 'e2etest');
            // if (fs.existsSync(e2eDir))
            //   callback!(e2eDir, prjDir);
        });
    }
}
exports.eachRecipeSrc = eachRecipeSrc;
function* allSrcDirs() {
    for (const projDir of projectList) {
        for (const srcDir of srcDirsOfProject(projDir)) {
            yield { srcDir, projDir };
        }
    }
    for (let pat of linkPatterns) {
        if (pat.endsWith('/**'))
            pat = pat.slice(0, -3);
        else if (pat.endsWith('/*'))
            pat = pat.slice(0, -2);
        pat = _.trimStart(pat, '.');
        yield { srcDir: pat };
    }
}
exports.allSrcDirs = allSrcDirs;
function* srcDirsOfProject(projectDir) {
    const srcRecipeMapFile = Path.resolve(projectDir, 'dr.recipes.json');
    const pkJsonFile = Path.resolve(projectDir, 'package.json');
    // const recipeSrcMapping: {[recipe: string]: string} = {};
    let nameSrcSetting = {};
    let normalizedPrjName = Path.resolve(projectDir).replace(/[\/\\]/g, '.');
    normalizedPrjName = _.trim(normalizedPrjName, '.');
    if (fs.existsSync(pkJsonFile)) {
        const pkjson = JSON.parse(fs.readFileSync(pkJsonFile, 'utf8'));
        if (pkjson.packages) {
            for (let pat of [].concat(pkjson.packages)) {
                if (pat.endsWith('/**'))
                    pat = pat.slice(0, -3);
                else if (pat.endsWith('/*'))
                    pat = pat.slice(0, -2);
                pat = _.trimStart(pat, '.');
                yield Path.resolve(projectDir, pat);
                // nameSrcSetting[config.resolve(
                //   'destDir', `recipes/${pkjson.name}${pat.length > 0 ? '.' : ''}${pat.replace(/[\/\\]/g, '.')}.recipe`)] =
                //     Path.resolve(projectDir, pat);
            }
            return;
        }
    }
    if (fs.existsSync(srcRecipeMapFile)) {
        // legacy: read dr.recipes.json
        nameSrcSetting = JSON.parse(fs.readFileSync(srcRecipeMapFile, 'utf8'));
    }
    else {
        const projectName = fs.existsSync(pkJsonFile) ? require(pkJsonFile).name : Path.basename(projectDir);
        if (fs.existsSync(Path.join(projectDir, 'src'))) {
            nameSrcSetting['recipes/' + projectName] = 'src';
        }
        else {
            const testSrcDir = Path.join(projectDir, 'app');
            if (fs.existsSync(testSrcDir) && fs.statSync(testSrcDir).isDirectory())
                nameSrcSetting['recipes/' + projectName] = 'app';
            else
                nameSrcSetting['recipes/' + projectName] = '.';
        }
    }
    for (const srcDir of Object.values(nameSrcSetting)) {
        yield srcDir;
    }
    return;
}
/**
 * @returns Observable of tuple [project, package.json file]
 */
function scanPackages() {
    return (0, rxjs_1.from)(allSrcDirs()).pipe((0, operators_1.mergeMap)(({ srcDir, projDir }) => (0, find_package_1.default)(srcDir, false).pipe((0, operators_1.map)(jsonFile => [projDir, jsonFile, srcDir]))));
}
exports.scanPackages = scanPackages;
//# sourceMappingURL=recipe-manager.js.map