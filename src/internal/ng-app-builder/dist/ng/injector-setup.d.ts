import { walkPackages } from '@wfh/plink/wfh/dist/package-mgr/package-info-gathering';
import { AngularBuilderOptions } from './common';
export default function walkPackagesAndSetupInjector(browserOptions: AngularBuilderOptions, ssr?: boolean): ReturnType<typeof walkPackages>;
export declare function injectorSetup(packageInfo: ReturnType<typeof walkPackages>, drcpArgs: AngularBuilderOptions['drcpArgs'], deployUrl: AngularBuilderOptions['deployUrl'], baseHref: AngularBuilderOptions['baseHref'], ssr?: boolean): void;
