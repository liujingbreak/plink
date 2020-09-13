import { FactoryMapInterf } from 'require-injector/dist/factory-map';
import { RequireInjector } from 'require-injector/dist/replace-require';
import { DrPackageInjector } from './injector-factory';
export { DrPackageInjector as InjectorFactory };
export { FactoryMapInterf, RequireInjector };
export interface InjectorConfigHandler {
    setupNodeInjector?(factory: DrPackageInjector): void;
    setupWebInjector?(factory: DrPackageInjector): void;
}
export declare function doInjectorConfig(factory: DrPackageInjector, isNode?: boolean): Promise<void>;
declare type ValueFactory = (sourceFilePath: string, regexpExecRes?: RegExpExecArray) => any;
export interface ReplaceTypeValue {
    replacement: string;
    value: any | ValueFactory;
}
