import { walkPackages } from 'dr-comp-package/wfh/dist/build-util/ts/main';
import { AngularBuilderOptions } from './common';
export default function walkPackagesAndSetupInjector(browserOptions: AngularBuilderOptions, ssr?: boolean): Promise<ReturnType<typeof walkPackages>>;
export declare function injectorSetup(packageInfo: ReturnType<typeof walkPackages>, drcpArgs: AngularBuilderOptions['drcpArgs'], deployUrl: AngularBuilderOptions['deployUrl'], baseHref: AngularBuilderOptions['baseHref'], ssr?: boolean): Promise<void>;
