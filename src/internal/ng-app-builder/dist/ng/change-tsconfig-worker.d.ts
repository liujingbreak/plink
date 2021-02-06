import { ParialBrowserOptions } from './change-tsconfig';
import { DrcpBuilderOptions } from './common';
export interface Data {
    tsconfigFile: string;
    reportDir: string;
    ngOptions: ParialBrowserOptions;
    deployUrl: string | undefined;
    baseHref?: string;
    drcpBuilderOptions: DrcpBuilderOptions;
}
