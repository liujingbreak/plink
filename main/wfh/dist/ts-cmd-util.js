"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseConfigFileToJson = exports.mergeBaseUrlAndPaths = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 *
 * @param ts
 * @param fromTsconfigFile
 * @param mergeToTsconfigDir
 * @param mergeTo
 * @return json of fromTsconfigFile
 */
function mergeBaseUrlAndPaths(ts, fromTsconfigFile, mergeToTsconfigDir, mergeTo) {
    const mergingTsCfg = ts.parseConfigFileTextToJson(fromTsconfigFile, fs_1.default.readFileSync(fromTsconfigFile, 'utf8')).config;
    const mergingTsCo = mergingTsCfg.compilerOptions;
    if (mergeTo.paths == null) {
        if (mergeTo.baseUrl == null)
            mergeTo.baseUrl = './';
        mergeTo.paths = {};
    }
    if (mergingTsCo.paths) {
        const absBaseUrl = mergingTsCo.baseUrl ?
            path_1.default.resolve(path_1.default.dirname(fromTsconfigFile), mergingTsCo.baseUrl) :
            path_1.default.dirname(fromTsconfigFile);
        const mergeToBaseUrlAbsPath = path_1.default.resolve(mergeToTsconfigDir, mergeTo.baseUrl);
        for (const [key, plist] of Object.entries(mergingTsCo.paths)) {
            mergeTo.paths[key] = plist.map(item => {
                return path_1.default.relative(mergeToBaseUrlAbsPath, path_1.default.resolve(absBaseUrl, item)).replace(/\\/g, '/');
            });
        }
    }
    return mergingTsCfg;
}
exports.mergeBaseUrlAndPaths = mergeBaseUrlAndPaths;
/**
 * typescript's parseConfigFileTextToJson() does not read "extends" property, I have to write my own implementation
 * @param ts
 * @param file
 */
function parseConfigFileToJson(ts, file) {
    const { config, error } = ts.parseConfigFileTextToJson(file, fs_1.default.readFileSync(file, 'utf8'));
    if (error) {
        console.error(error);
        throw new Error('Incorrect tsconfig file: ' + file);
    }
    const json = config;
    if (json.extends) {
        const extendsFile = path_1.default.resolve(path_1.default.dirname(file), json.extends);
        const pJson = parseConfigFileToJson(ts, extendsFile);
        for (const [prop, value] of Object.entries(pJson.compilerOptions)) {
            if (prop !== 'baseUrl' && prop !== 'paths' && !Object.prototype.hasOwnProperty.call(json.compilerOptions, prop)) {
                json.compilerOptions[prop] = value;
            }
        }
        if (pJson.compilerOptions.paths) {
            const absBaseUrl = pJson.compilerOptions.baseUrl ?
                path_1.default.resolve(path_1.default.dirname(extendsFile), pJson.compilerOptions.baseUrl) :
                path_1.default.dirname(extendsFile);
            const mergeToBaseUrlAbsPath = path_1.default.resolve(path_1.default.dirname(file), json.compilerOptions.baseUrl);
            for (const [key, plist] of Object.entries(pJson.compilerOptions.paths)) {
                if (json.compilerOptions.paths == null) {
                    json.compilerOptions.paths = {};
                }
                json.compilerOptions.paths[key] = plist.map(item => {
                    return path_1.default.relative(mergeToBaseUrlAbsPath, path_1.default.resolve(absBaseUrl, item))
                        .replace(/\\/g, '/');
                });
            }
        }
    }
    return json;
}
exports.parseConfigFileToJson = parseConfigFileToJson;
//# sourceMappingURL=ts-cmd-util.js.map