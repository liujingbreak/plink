import { ParialBrowserOptions } from './change-tsconfig';
import { DrcpBuilderOptions } from './common';
import { DrcpSetting } from '../configurable';
import { PackageInfo } from '@wfh/plink/wfh/dist/package-mgr/package-info-gathering';
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
