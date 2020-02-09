import { PackageInfo } from 'dr-comp-package/wfh/dist/build-util/ts';
import { DrcpSetting as NgAppBuilderSetting } from '../configurable';
import { AngularBuilderOptions } from './common';
export declare type ParialBrowserOptions = Pick<AngularBuilderOptions, 'preserveSymlinks' | 'main' | 'fileReplacements'>;
export declare function createTsConfig(file: string, browserOptions: ParialBrowserOptions, config: NgAppBuilderSetting, packageInfo: PackageInfo, reportFile: string): string;
