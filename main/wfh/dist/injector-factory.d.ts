import RJ from 'require-injector';
import { DrcpSettings } from './config/config-slice';
import { FactoryMapCollection, FactoryMapInterf } from 'require-injector/dist/factory-map';
export declare class DrPackageInjector extends RJ {
    protected noNode: boolean;
    constructor(noNode?: boolean);
    addPackage(name: string, dir: string, symlinkDir?: string): void;
    fromPlinkPackage(name: string | string[], dir?: string | string[]): FactoryMapCollection;
    fromAllComponents(): FactoryMapInterf;
    fromAllPackages(): FactoryMapInterf;
    notFromPackages(...excludePackages: string[]): FactoryMapInterf;
    readInjectFile(fileNameWithoutExt?: string): void;
}
export declare let nodeInjector: DrPackageInjector;
export declare let webInjector: DrPackageInjector;
export interface InjectorConfigHandler {
    /** For Client framework build tool (React, Angular), replace module in "require()" or import syntax */
    setupWebInjector?(factory: DrPackageInjector, allSetting: DrcpSettings): void;
    /** For Node.js runtime, replace module in "require()" or import syntax */
    setupNodeInjector?(factory: DrPackageInjector, allSetting: DrcpSettings): void;
}
export declare function doInjectorConfigSync(factory: DrPackageInjector, isNode?: boolean): void;
/** @deprecated */
export declare function doInjectorConfig(factory: DrPackageInjector, isNode?: boolean): void;
