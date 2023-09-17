import {FactoryMapInterf} from 'require-injector/dist/factory-map';
// import {RequireInjector} from 'require-injector/dist/replace-require';
import {DrPackageInjector} from './injector-factory';
export {DrPackageInjector as InjectorFactory};
export {FactoryMapInterf};

// export interface InjectorFactory extends RequireInjector {
// 	addPackage(name: string, dir: string): void;
// 	fromAllComponents(): FactoryMapInterf;
// 	notFromPackages(excludePackages: string | string[]): FactoryMapInterf;
// }

type ValueFactory = (sourceFilePath: string, regexpExecRes?: RegExpExecArray) => any;
export interface ReplaceTypeValue {
  replacement: string;
  value: any | ValueFactory;
}
