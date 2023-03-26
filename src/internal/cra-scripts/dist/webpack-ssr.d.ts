import { Configuration } from 'webpack';
/**
 * process.env.INLINE_RUNTIME_CHUNK = 'false' must be set before goes to react-scripts's webpack configure
 *
 * entry file should be replaced with a server version App.tsx, which using staticRoute
 * @param buildPackage
 * @param config
 * @param nodePath
 */
export declare function change(buildPackage: string, config: Configuration, nodePath: string[]): Configuration;
