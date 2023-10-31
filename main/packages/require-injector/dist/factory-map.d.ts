import { ParseInfo, ParseExportInfo } from './parse-esnext-import';
export interface Config {
    [key: string]: any;
    enableFactoryParamFile?: boolean | undefined;
}
export interface FactorySetting {
    method: keyof ReplaceActions;
    prefix: string;
    value?: FactoryFunc | any;
    execResult?: RegExpExecArray;
    subPath?: string;
    replacement?: (file: string, execResult: RegExpExecArray) => any | string;
}
export interface ReplaceTypeValue {
    replacement: string;
    value: any | FactoryFunc;
}
/** // TODO */
export declare enum ReplaceType {
    rq = 0,
    ima = 1,
    imp = 2,
    rs = 3
}
export interface RegexSetting extends FactorySetting {
    regex: RegExp;
}
export interface ReplacedResult {
    replaceAll: boolean;
    code: string;
}
interface ReplaceActions {
    [method: string]: (this: FactoryMap, replaceWith: FactoryFunc | any, type: ReplaceType, fileParam: string, execResult: RegExpExecArray, astInfo: ParseInfo, prefix?: any, subPath?: string) => null | string | ReplacedResult;
}
export type FactoryFunc = (sourceFilePath: string, regexpExecResult?: RegExpExecArray) => any;
export declare class FactoryMap implements FactoryMapInterf {
    config: Config;
    requireMap: {
        [k: string]: FactorySetting;
    };
    beginWithSearch: any[];
    regexSettings: RegexSetting[];
    beginWithSorted: boolean;
    private resolvePaths;
    constructor(config?: Config);
    factory(requiredModule: string | RegExp, factoryFunc: FactoryFunc): FactoryMapInterf;
    substitute(requiredModule: string | RegExp, newModule: string | FactoryFunc): FactoryMapInterf;
    value(requiredModule: string | RegExp, newModule: {
        replacement: any;
    } | FactoryFunc | any): FactoryMapInterf;
    swigTemplateDir(requiredModule: string, dir: string): FactoryMapInterf;
    replaceCode(requiredModule: string | RegExp, newModule: string | FactoryFunc): FactoryMapInterf;
    alias(requiredModule: string | RegExp, newModule: string | FactoryFunc): FactoryMapInterf;
    getInjector(name: string): FactorySetting | null;
    matchRequire(name: string): FactorySetting | null;
    /**
     *
     * @param  {any} factorySetting matchRequire() returned value
     * @param  {ReplaceType} type       "rq" for "require()", "rs" for "require.ensure"
     * @param  {string} fileParam  current replacing file path
     * @return {string}            replacement text
     */
    getReplacement(factorySetting: FactorySetting, type: ReplaceType, fileParam: string, info?: ParseInfo | ParseExportInfo): string | ReplacedResult | null;
    getInjected(factorySetting: FactorySetting, calleeModuleId: string, calleeModule: any, requireCall: (m: any, file: string) => FactorySetting): any;
    addResolvePath(dir: string): this;
    _addSetting(this: FactoryMap, method: string, name: string | RegExp, value: FactoryFunc | any): FactoryMap;
}
export interface FactoryMapInterf {
    /**
     * Replacing a required module with a function returned value. Not working for `require.ensure()`
     * @param requiredModule the original module name which is required for, it can't be a relative file path.
     * @param factoryFunc A function invoked with 1 argument: `sourceFilePath` and returns a value which then will replace the original module of `requiredModule`.
     *
     * **Note**: In browser side replacement mode, it replaces entire `require('requiredModule')` expression in source code with Immediately-Invoked Function Expression (IIFE) of the factory function`.toString()`:
        ```js
// require('requiredModule'); ->
'(' + factory.toString() + ')(sourceFilePath, regexpExecResult)';
```
        > In replacement mode, parameter `sourceFilePath` will be null by default, since this would expose
        original source file path of your file system, if you still want to obtain `sourceFilePath`, set option `.enableFactoryParamFile`
        to `true`

        The factory eventually stands in source code, not NodeJS runtime.
        Thus you can not have any reference to any closure variable in factory function.
     */
    factory(requiredModule: string | RegExp, factoryFunc: FactoryFunc): FactoryMapInterf;
    /**
     * Or
        `alias(requiredModule, newModule)`

        Replacing a required module with requiring another module.
        > Also support `npm://package` reference in Swig template tags `include` and `import`,
        check this out [swig-package-tmpl-loader injection](https://www.npmjs.com/package/swig-package-tmpl-loader#injection)

        > It works very like **Webpack**'s `resolve.alias`,
        it also matches module name which is consist of node package name and specific path

        e.g.
        When injector is configured as
        ```js
        rj.fromDir('.').alias('moduleA', 'moduleB');
        ```
        Then the file contains `require('moduleA/foo/bar.js')` will be replaced with `require('moduleB/foo/bar.js')`
     * @param requiredModule the original module name which is required for, it can't be relative file path, only supports absolute path, a package name or Regular Expression.
    > Package name like `lodash/throttle` also works, as long as it can be resolved to same absolute path all the time.
     * @param newModule the new module name that is replaced with.
     * If `newModule` is a function, it will be passed in 2 parameters: `sourceFilePath` and `regexpExecResult`, and must return string value of replaced module name.
    */
    substitute(requiredModule: string | RegExp, newModule: string | FactoryFunc): FactoryMapInterf;
    /**
     * Replacing a required module with any object or primitive value.
        > Not work for `require.ensure()`
     * @param requiredModule the original module name which is required for, it can't be a relative file path.
     * @param newModule the value to replace `requiredModule` exports.
     *
     * When `.injectToFile()` is called or `.transform` is used for Browserify, meaning it is not a Node environment, the solution is actually replacing entire `require('requiredModule')`‘’ expression with result of `JSON.stringify(value)`.
        Sometimes, the value is variable reference,
        you wouldn't want `JSON.stringify` for it, you can use an object expression:
        - `{string}` `value.replacement`: The replaced string literal as variable expression, same as what `.replaceCode()` does.
        - `{object}` `value.value`: Node require injection value
        ```js
        rj.fromDir('dir1')
        .value('replaceMe', {
            replacement: 'window.jQuery', // for Browserify transform
            value: cheerio   // for Node require() injection
        })
        ```
        If `value` is a function, it will be passed in 2 parameters: `sourceFilePath` and `regexpExecResult`, and must return some value.
    */
    value(requiredModule: string | RegExp, newModule: ReplaceTypeValue | FactoryFunc | any): FactoryMapInterf;
    /**
     * Replace `npm://package` reference in Swig template tags `include` and `import`,
check this out [swig-package-tmpl-loader injection](https://www.npmjs.com/package/swig-package-tmpl-loader#injection)
     * @param requiredModule
     * @param dir
     */
    swigTemplateDir(requiredModule: string, dir: string): FactoryMapInterf;
    /**
     * Arbitrary JS code replacement
    > Only work in replacement mode, not NodeJs side

    ```js
    var rjReplace = rj({noNode: true});
    rjReplace.fromPackage([packageA...])
        .replaceCode('foobar', JSON.stringify({foo: 'bar'}));
    ```
    In which "`var foobar = require('foobar');"` is replaced with:
    ```js
    var  foobar = {"foo": "bar"};
    ```
     * @param requiredModule
     * @param newModule
     */
    replaceCode(requiredModule: string | RegExp, newModule: string | FactoryFunc): FactoryMapInterf;
    /**
     * Same as substitute()
     * @param requiredModule
     * @param newModule
     */
    alias(requiredModule: string | RegExp, newModule: string | FactoryFunc): FactoryMapInterf;
}
export declare class FactoryMapCollection implements FactoryMapInterf {
    maps: FactoryMapInterf[];
    constructor(maps: FactoryMapInterf[]);
    factory(requiredModule: string | RegExp, factoryFunc: FactoryFunc): FactoryMapInterf;
    substitute(requiredModule: string | RegExp, newModule: string | FactoryFunc): FactoryMapInterf;
    value(requiredModule: string | RegExp, newModule: any | FactoryFunc): FactoryMapInterf;
    swigTemplateDir(requiredModule: string, dir: string): FactoryMapInterf;
    replaceCode(requiredModule: string | RegExp, newModule: string | FactoryFunc): FactoryMapInterf;
    alias(requiredModule: string | RegExp, newModule: string | FactoryFunc): FactoryMapInterf;
    protected _addSetting(this: FactoryMapCollection, method: string, requiredModule: string | RegExp, newModule: string | FactoryFunc): FactoryMapInterf;
}
export {};
