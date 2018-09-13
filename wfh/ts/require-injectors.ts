import {DrcpConfig} from './config-handler';
import {FactoryMapInterf} from 'require-injector/dist/factory-map';
import {RequireInjector} from 'require-injector/dist/replace-require';
export {FactoryMapInterf, RequireInjector};

export interface InjectorFactory extends RequireInjector {
	addPackage(name: string, dir: string): void;
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


type ValueFactory = (sourceFilePath: string, regexpExecRes?: RegExpExecArray) => any;

export interface ReplaceTypeValue {
	replacement: string;
	value: any | ValueFactory;
}
