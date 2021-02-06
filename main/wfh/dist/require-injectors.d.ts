import { FactoryMapInterf } from 'require-injector/dist/factory-map';
import { DrPackageInjector } from './injector-factory';
export { DrPackageInjector as InjectorFactory };
export { FactoryMapInterf };
declare type ValueFactory = (sourceFilePath: string, regexpExecRes?: RegExpExecArray) => any;
export interface ReplaceTypeValue {
    replacement: string;
    value: any | ValueFactory;
}
