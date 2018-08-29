export interface InjectorFactory {
    addPackage(name: string, dir: string): void;
    fromComponent(name: string, dir: string): FactoryMapInterf;
    fromPackage(name: string, dir: string): FactoryMapInterf;
    fromAllComponents(): FactoryMapInterf;
    notFromPackages(excludePackages: string | string[]): FactoryMapInterf;
}
export interface InjectorConfigHandler {
    setupNodeInjector(factory: InjectorFactory): void;
    setupWebInjector(factory: InjectorFactory): void;
}
export declare function doInjectorConfig(factory: InjectorFactory, isNode?: boolean): Promise<void>;
declare type StringFactory = (sourceFilePath: string, regexpExecRes?: RegExpExecArray) => string;
declare type ValueFactory = (sourceFilePath: string, regexpExecRes?: RegExpExecArray) => any;
export interface FactoryMapInterf {
    factory(requiredModule: string | RegExp, factoryFunc: (sourceFilePath: string) => string): FactoryMapInterf;
    substitute(requiredModule: string | RegExp, newModule: string | StringFactory): FactoryMapInterf;
    value(requiredModule: string | RegExp, value: ReplaceTypeValue | ValueFactory | any): FactoryMapInterf;
    swigTemplateDir(requiredModule: string, dir: string): FactoryMapInterf;
    replaceCode(requiredModule: string | RegExp, jsCode: string | StringFactory): FactoryMapInterf;
    alias(requiredModule: string | RegExp, newModule: string | StringFactory): FactoryMapInterf;
}
export interface ReplaceTypeValue {
    replacement: string;
    value: any | ValueFactory;
}
export {};
