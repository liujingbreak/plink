import { FactoryMapInterf } from 'require-injector/dist/factory-map';
import { RequireInjector } from 'require-injector/dist/replace-require';
export { FactoryMapInterf, RequireInjector };
export interface InjectorFactory extends RequireInjector {
    addPackage(name: string, dir: string): void;
    fromAllComponents(): FactoryMapInterf;
    notFromPackages(excludePackages: string | string[]): FactoryMapInterf;
}
export interface InjectorConfigHandler {
    setupNodeInjector(factory: InjectorFactory): void;
    setupWebInjector(factory: InjectorFactory): void;
}
export declare function doInjectorConfig(factory: InjectorFactory, isNode?: boolean): Promise<void>;
declare type ValueFactory = (sourceFilePath: string, regexpExecRes?: RegExpExecArray) => any;
export interface ReplaceTypeValue {
    replacement: string;
    value: any | ValueFactory;
}
