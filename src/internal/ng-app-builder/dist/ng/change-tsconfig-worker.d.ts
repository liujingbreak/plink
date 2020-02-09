import { ParialBrowserOptions } from './change-tsconfig';
import { DrcpBuilderOptions } from './common';
import { DrcpSetting } from '../configurable';
import { PackageInfo } from 'dr-comp-package/wfh/dist/build-util/ts/main';
export interface Data {
    tsconfigFile: string;
    reportDir: string;
    config: DrcpSetting;
    ngOptions: ParialBrowserOptions;
    packageInfo: PackageInfo;
    deployUrl: string | undefined;
    baseHref?: string;
    drcpBuilderOptions: DrcpBuilderOptions;
}
