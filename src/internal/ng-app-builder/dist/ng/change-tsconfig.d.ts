import { AngularBuilderOptions } from './common';
export declare type ParialBrowserOptions = Pick<AngularBuilderOptions, 'preserveSymlinks' | 'main' | 'fileReplacements'>;
export declare function createTsConfig(file: string, browserOptions: ParialBrowserOptions, reportDir: string): string;
