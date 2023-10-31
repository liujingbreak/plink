import RJ from '../../packages/require-injector';
import { FactoryMapCollection, FactoryMapInterf } from '../../packages/require-injector/dist/factory-map';
import { PlinkSettings } from './config/config-slice';
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
export declare const nodeInjector: DrPackageInjector;
export declare const webInjector: DrPackageInjector;
export interface InjectorConfigHandler {
    /** For Client framework build tool (React, Angular), replace module in "require()" or import syntax */
    setupWebInjector?(factory: DrPackageInjector, allSetting: PlinkSettings): void;
    /** For Node.js runtime, replace module in "require()" or import syntax */
    setupNodeInjector?(factory: DrPackageInjector, allSetting: PlinkSettings): void;
}
export declare function doInjectorConfigSync(factory: DrPackageInjector, isNode?: boolean): void;
/** @deprecated */
export declare function doInjectorConfig(factory: DrPackageInjector, isNode?: boolean): void;
