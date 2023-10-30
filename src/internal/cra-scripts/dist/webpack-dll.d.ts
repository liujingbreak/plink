import { Configuration } from 'webpack';
import { CommandOption } from './build-options';
export declare function extractDllName(entries: CommandOption['buildTargets']): readonly [string, string];
export declare function setupDllPlugin(entries: CommandOption['buildTargets'], config: Configuration, pluginConstFinder: (moduleName: string) => any): void;
/**
 * Refer to https://github.com/webpack/webpack/blob/main/test/configCases/dll-plugin/2-use-dll-without-scope/webpack.config.js
 */
export declare function setupDllReferencePlugin(manifestFiles: string[], config: Configuration): string[];
