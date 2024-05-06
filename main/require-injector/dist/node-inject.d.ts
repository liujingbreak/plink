/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import Module from 'module';
import EventEmitter from 'events';
import { DirTree } from './dir-tree';
import { FactoryMap, FactoryMapInterf, FactoryMapCollection } from './factory-map';
export { FactoryMap, FactoryMapInterf, FactoryMapCollection };
export interface InjectorOption {
    /**
       * default is process.cwd(), used to resolve relative path in `.fromDir(path)`
       */
    basedir?: string;
    /**
       * default is false, if you only use this module as Browserify or Webpack's transform,
       * you don't want injection work on Node side, no kidnapping on `Module.prototype.require`,
       * set this property to `true`
       */
    noNode?: boolean;
    resolveOpts?: any;
    debug?: boolean;
}
/**
 * browser-resolve options
 */
export interface ResolveOption {
    basedir?: string;
}
declare class Injector extends EventEmitter.EventEmitter {
    dirTree: DirTree<FactoryMap>;
    oldRequire: NodeJS.Require;
    config: InjectorOption;
    constructor(opts?: InjectorOption);
    cleanup(): void;
    fromPackage(packageName: string | string[], resolveOpts?: ResolveOption): FactoryMapInterf;
    _fromPackage(packageName: string, resolveOpts?: ResolveOption): FactoryMapInterf;
    fromRoot(): FactoryMapInterf;
    fromDir(dir: string | string[]): FactoryMapInterf;
    resolveFromDir(dir: string): FactoryMapInterf;
    /**
       * Recursively build dirTree, subDirMap
       * @param  {string} path new directory
       * @param  {Array<string>} dirs [description]
       * @return {[type]}      [description]
       */
    _fromDir(path: string, tree: DirTree<FactoryMap>): FactoryMap;
    _createFactoryMapFor(path: string | undefined, tree: DirTree<FactoryMap>, existingFactory?: FactoryMap): FactoryMap;
    /**
       * Return array of configured FactoryMap for source code file depends on the file's location.
       * Later on, you can call `factoryMap.matchRequire(name)` to get exact inject value
       * @return {FactoryMap[]} Empty array if there is no injector configured for current file
       */
    factoryMapsForFile(fromFile: string): FactoryMap[];
    testable(): this;
    protected _initOption(opts?: InjectorOption): void;
    protected inject(calleeModule: Module, name: string): any;
    protected replacingRequire(calleeModule: Module, path: string): any;
}
export { Injector as default, Injector as NodeInjector };
/**
 * If a path contains symbolic link, return the exact real path
 * Unlike fs.realpath, it also works for nonexist path
 */
export declare function parseSymlink(path: string): string;
