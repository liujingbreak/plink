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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FactoryMapCollection = exports.FactoryMap = exports.ReplaceType = void 0;
const _ = __importStar(require("lodash"));
var Path = require('path');
const parse_esnext_import_1 = require("./parse-esnext-import");
/** // TODO */
var ReplaceType;
(function (ReplaceType) {
    ReplaceType[ReplaceType["rq"] = 0] = "rq";
    ReplaceType[ReplaceType["ima"] = 1] = "ima";
    ReplaceType[ReplaceType["imp"] = 2] = "imp";
    ReplaceType[ReplaceType["rs"] = 3] = "rs"; // require.ensure()
})(ReplaceType || (exports.ReplaceType = ReplaceType = {}));
class FactoryMap {
    // static METHODS: string[] = ['factory', 'substitute', 'value', 'swigTemplateDir', 'replaceCode', 'variable'];
    constructor(config) {
        this.requireMap = {};
        this.beginWithSearch = []; // Binary search
        this.regexSettings = [];
        this.beginWithSorted = false;
        this.resolvePaths = null;
        if (config === undefined)
            this.config = {};
        else
            this.config = config;
    }
    factory(requiredModule, factoryFunc) {
        return this._addSetting('factory', requiredModule, factoryFunc);
    }
    substitute(requiredModule, newModule) {
        return this._addSetting('substitute', requiredModule, newModule);
    }
    value(requiredModule, newModule) {
        return this._addSetting('value', requiredModule, newModule);
    }
    swigTemplateDir(requiredModule, dir) {
        return this._addSetting('swigTemplateDir', requiredModule, dir);
    }
    replaceCode(requiredModule, newModule) {
        return this._addSetting('replaceCode', requiredModule, newModule);
    }
    alias(requiredModule, newModule) {
        return this._addSetting('substitute', requiredModule, newModule);
    }
    // asInterface() {
    // 	return ((this as any) as FactoryMapInterf & FactoryMap);
    // }
    getInjector(name) {
        return this.matchRequire(name);
    }
    // you can extend with new method here
    matchRequire(name) {
        if (!name)
            return null;
        var webpackLoaderPrefix = '';
        var webpackLoaderIdx = name.lastIndexOf('!');
        if (webpackLoaderIdx >= 0) {
            webpackLoaderPrefix = name.substring(0, webpackLoaderIdx + 1);
            name = name.substring(webpackLoaderIdx + 1);
        }
        let setting;
        if (_.has(this.requireMap, name)) {
            setting = _.extend({}, this.requireMap[name]);
            setting.prefix = webpackLoaderPrefix;
            return setting;
        }
        else {
            const isPackage = !_.startsWith(name, '.') && !Path.isAbsolute(name);
            if (isPackage && (_.startsWith(name, '@') || name.indexOf('/') > 0)) {
                var m = /^((?:@[^\/]+\/)?[^\/]+)(\/.+?)?$/.exec(name);
                if (m && _.has(this.requireMap, m[1])) {
                    setting = _.extend({}, this.requireMap[m[1]]);
                    setting.subPath = m[2];
                    setting.prefix = webpackLoaderPrefix;
                    return setting;
                }
            }
            let foundReg = _.find(this.regexSettings, s => {
                s.execResult = s.regex.exec(name) || undefined;
                return s.execResult != null;
            });
            if (foundReg) {
                foundReg = _.extend({}, foundReg);
                foundReg.prefix = webpackLoaderPrefix;
                return foundReg;
            }
            return null;
        }
    }
    /**
     *
     * @param  {any} factorySetting matchRequire() returned value
     * @param  {ReplaceType} type       "rq" for "require()", "rs" for "require.ensure"
     * @param  {string} fileParam  current replacing file path
     * @return {string}            replacement text
     */
    getReplacement(factorySetting, type, fileParam, info) {
        if (!factorySetting)
            throw new Error('This is require-injector\' fault, error due to null factorySetting, tell author about it.');
        return replaceActions[factorySetting.method].call(this, factorySetting.value, type, fileParam, factorySetting.execResult, info, factorySetting.prefix, factorySetting.subPath);
    }
    getInjected(factorySetting, calleeModuleId, calleeModule, requireCall) {
        if (!factorySetting)
            throw new Error('This is require-injector\'s fault, error due to null factorySetting, tell author about it.');
        return injectActions[factorySetting.method].call(this, factorySetting.value, calleeModuleId, calleeModule, requireCall, factorySetting.subPath);
    }
    addResolvePath(dir) {
        if (this.resolvePaths == null)
            this.resolvePaths = [];
        this.resolvePaths.push(dir);
        return this;
    }
    _addSetting(method, name, value) {
        if (_.isRegExp(name)) {
            this.regexSettings.push({
                regex: name,
                method,
                value,
                subPath: '',
                prefix: ''
            });
        }
        else {
            this.requireMap[name] = {
                method,
                value,
                subPath: '',
                prefix: ''
            };
        }
        return this;
    }
}
exports.FactoryMap = FactoryMap;
let replaceActions = {
    factory(value, type, fileParam, execResult, astInfo, prefix, subPath) {
        const sourcePath = JSON.stringify(this.config.enableFactoryParamFile ? fileParam : '');
        const execFactory = '(' + value.toString() + ')(' + sourcePath +
            (execResult ? ',' + JSON.stringify(execResult) : '') + ')';
        if (type === ReplaceType.rq || type === ReplaceType.ima) { // for require() or import()
            return execFactory;
        }
        else if (type === ReplaceType.imp) {
            return {
                replaceAll: true,
                code: (0, parse_esnext_import_1.toAssignment)(astInfo, execFactory)
            };
        }
        return null;
    },
    substitute(setting, type, fileParam, execResult, astInfo, prefix, subPath) {
        if (type === ReplaceType.rs) { // for require.ensure
            if (_.isFunction(setting))
                return JSON.stringify(setting(fileParam, execResult) + subPath);
            return JSON.stringify(setting + subPath);
        }
        else if (type === ReplaceType.rq) {
            if (_.isFunction(setting))
                return 'require(' + JSON.stringify(prefix + setting(fileParam, execResult)) + subPath + ')';
            return 'require(' + JSON.stringify(prefix + setting + subPath) + ')';
        }
        else if (type === ReplaceType.ima) {
            if (_.isFunction(setting))
                return 'import(' + JSON.stringify(prefix + setting(fileParam, execResult)) + subPath + ')';
            return 'import(' + JSON.stringify(prefix + setting) + subPath + ')';
        }
        else if (type === ReplaceType.imp) {
            var replaced = _.isFunction(setting) ? setting(fileParam, execResult) : setting;
            replaced = JSON.stringify(prefix + replaced + subPath);
            return {
                replaceAll: false,
                code: replaced
            };
        }
        return null;
    },
    value(setting, type, fileParam, execResult, astInfo, prefix, subPath) {
        if (type === ReplaceType.rq || type === ReplaceType.imp || type === ReplaceType.ima) {
            var replaced;
            if (_.has(setting, 'replacement')) {
                const setting1 = setting;
                replaced = (_.isFunction(setting1.replacement)) ?
                    setting1.replacement(fileParam, execResult) :
                    setting1.replacement;
            }
            else {
                replaced = _.isFunction(setting) ? JSON.stringify(setting(fileParam, execResult)) :
                    JSON.stringify(setting);
            }
            return type === ReplaceType.imp ? {
                replaceAll: true,
                code: (0, parse_esnext_import_1.toAssignment)(astInfo, replaced)
            } : replaced;
        }
        return null;
    },
    replaceCode(setting, type, fileParam, execResult, astInfo, prefix, subPath) {
        var replaced = setting;
        if (_.isFunction(setting))
            replaced = setting(fileParam, execResult);
        return type === ReplaceType.imp ? {
            replaceAll: true,
            code: (0, parse_esnext_import_1.toAssignment)(astInfo, replaced)
        } : replaced;
    },
    variable(setting, type, fileParam, execResult, astInfo) {
        if (type === ReplaceType.rq || type === ReplaceType.ima) {
            return setting;
        }
        if (type === ReplaceType.imp)
            return {
                replaceAll: true,
                code: (0, parse_esnext_import_1.toAssignment)(astInfo, setting)
            };
        return null;
    }
    // resolvePath(dir: FactorySetting, type: string, fileParam: string, execResult: RegExpExecArray,
    // 	astInfo: ParseInfo): string {
    // 	return dir as string;
    // }
};
let injectActions = {
    factory(setting, calleeModuleId, calleeModule, requireCall, subPath) {
        if (_.isFunction(setting)) {
            return setting(calleeModuleId);
        }
        else {
            return setting;
        }
    },
    value(setting, calleeModuleId, calleeModule, requireCall, subPath) {
        if (_.has(setting, 'value'))
            return setting.value;
        else
            return setting;
    },
    replaceCode(setting, calleeModuleId, calleeModule, requireCall, subPath) {
        // tslint:disable-next-line:no-console
        console.log('require-injector does not support "replaceCode()" for NodeJS environment');
    },
    substitute(setting, calleeModuleId, calleeModule, requireCall, subPath) {
        return requireCall.call(calleeModule, setting + subPath);
    },
    variable(setting, calleeModuleId, calleeModule, requireCall, subPath) {
        return setting;
    }
};
class FactoryMapCollection {
    constructor(maps) {
        this.maps = maps;
    }
    factory(requiredModule, factoryFunc) {
        return this._addSetting('factory', requiredModule, factoryFunc);
    }
    substitute(requiredModule, newModule) {
        return this._addSetting('substitute', requiredModule, newModule);
    }
    value(requiredModule, newModule) {
        return this._addSetting('value', requiredModule, newModule);
    }
    swigTemplateDir(requiredModule, dir) {
        return this._addSetting('swigTemplateDir', requiredModule, dir);
    }
    replaceCode(requiredModule, newModule) {
        return this._addSetting('replaceCode', requiredModule, newModule);
    }
    alias(requiredModule, newModule) {
        return this._addSetting('substitute', requiredModule, newModule);
    }
    _addSetting(method, requiredModule, newModule) {
        for (const factoryMap of this.maps) {
            factoryMap._addSetting(method, requiredModule, newModule);
        }
        return this;
    }
}
exports.FactoryMapCollection = FactoryMapCollection;
//# sourceMappingURL=factory-map.js.map