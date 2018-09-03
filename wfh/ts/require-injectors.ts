
import {DrcpConfig} from './config-handler';

export interface RequireInjector {
	fromDir(dir: string): FactoryMapInterf;
	// fromPackage(dir: string): FactoryMapInterf;
}
export interface InjectorFactory extends RequireInjector {
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

export function doInjectorConfig(factory: InjectorFactory, isNode = false): Promise<void> {
	const config: DrcpConfig = require('../lib/config');
	return config.configHandlerMgr().runEach<InjectorConfigHandler>((file: string, lastResult: any, handler) => {
		if (isNode && handler.setupNodeInjector)
			handler.setupNodeInjector(factory);
		else if (!isNode && handler.setupWebInjector)
			handler.setupWebInjector(factory);
	});
}


type StringFactory = (sourceFilePath: string, regexpExecRes?: RegExpExecArray) => string;
type ValueFactory = (sourceFilePath: string, regexpExecRes?: RegExpExecArray) => any;

export interface FactoryMapInterf {
	factory(requiredModule: string | RegExp, factoryFunc: (sourceFilePath: string) => string): FactoryMapInterf;

	substitute(requiredModule: string | RegExp,
		newModule: string | StringFactory): FactoryMapInterf;

	value(requiredModule: string | RegExp, value: ReplaceTypeValue | ValueFactory | any): FactoryMapInterf;

	swigTemplateDir(requiredModule: string, dir: string): FactoryMapInterf;

	replaceCode(requiredModule: string | RegExp, jsCode: string | StringFactory): FactoryMapInterf;
	alias(requiredModule: string | RegExp, newModule: string| StringFactory): FactoryMapInterf;
}
export interface ReplaceTypeValue {
	replacement: string;
	value: any | ValueFactory;
}
