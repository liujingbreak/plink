import { PackageInfo } from '@wfh/plink/wfh/dist/package-mgr/package-info-gathering';
import { DrcpSetting as NgAppBuilderSetting } from '../configurable';
import { AngularBuilderOptions } from './common';
export declare type ParialBrowserOptions = Pick<AngularBuilderOptions, 'preserveSymlinks' | 'main' | 'fileReplacements'>;
export declare function createTsConfig(file: string, browserOptions: ParialBrowserOptions, config: NgAppBuilderSetting, packageInfo: PackageInfo, reportDir: string): string;
