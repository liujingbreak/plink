/* tslint:disable no-console */
import * as Path from 'path';
import vm = require('vm');
import * as fs from 'fs';
import {readTsConfig, transpileSingleTs} from './ts-compiler';
const {cyan, green} = require('chalk');

export interface DrcpConfig {
	configHandlerMgr(): ConfigHandlerMgr;
	get(path: string|string[], defaultValue?: any): any;
	set(path: string|string[], value: any): void;
	resolve(...path: string[]): string;
	(): {[property: string]: any};
	load(): Promise<{[property: string]: any}>;
	reload(): Promise<{[property: string]: any}>;
	init(): Promise<{[property: string]: any}>;
}

export interface ConfigHandler {
	/**
	 * 
	 * @param configSetting Override properties from dist/config.yaml, which is also you get from `api.config()`
	 * @param drcpCliArgv Override command line argumemnt for DRCP
	 */
	onConfig(configSetting: {[prop: string]: any}, drcpCliArgv?: {[prop: string]: any}): Promise<void> | void;
}

export class ConfigHandlerMgr {
	static initConfigHandlers(files: string[]): Array<{file: string, handler: ConfigHandler}> {
		// const files = browserOptions.drcpConfig ? browserOptions.drcpConfig.split(/\s*[,;:]\s*/) : [];
		const exporteds: Array<{file: string, handler: ConfigHandler}> = [];
		const compilerOpt = readTsConfig(require.resolve('dr-comp-package/wfh/tsconfig.json'));
		files.forEach(file => {
			if (file.endsWith('.ts')) {
				console.log('ConfigHandlerMgr compile', file);
				const jscode = transpileSingleTs(fs.readFileSync(Path.resolve(file), 'utf8'), compilerOpt);
				console.log(jscode);
				const mod = {exports: {}};
				const context = vm.createContext({module: mod, exports: mod.exports, console, process, require,
					__filename: file, __dirname: Path.dirname(file)});
				try {
					vm.runInContext(jscode, context, {filename: file});
				} catch (ex) {
					console.error(ex);
					throw ex;
				}
				exporteds.push({file, handler: (mod.exports as any).default});
			} else if (file.endsWith('.js')) {
				const exp = require(Path.resolve(file));
				exporteds.push({file, handler: exp.default ? exp.default : exp});
			}
		});
		return exporteds;
	}
	protected configHandlers: Array<{file: string, handler: ConfigHandler}>;

	constructor(files: string[]) {
		this.configHandlers = ConfigHandlerMgr.initConfigHandlers(files);
	}

	/**
	 * 
	 * @param func parameters: (filePath, last returned result, handler function),
	 * returns the changed result, keep the last result, if resturns undefined
	 */
	async runEach<H>(func: (file: string, lastResult: any, handler: H) => Promise<any> | any) {
		let lastRes: any;
		for (const {file, handler} of this.configHandlers) {
			console.log(green(Path.basename(__filename, '.js') + ' - ') + ' run', cyan(file));
			const currRes = await func(file, lastRes, handler as any as H);
			if (currRes !== undefined)
				lastRes = currRes;
		}
		return lastRes;
	}
}
