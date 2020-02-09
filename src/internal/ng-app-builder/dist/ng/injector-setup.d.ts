import { walkPackages } from 'dr-comp-package/wfh/dist/build-util/ts/main';
import { AngularBuilderOptions } from './common';
import { DrcpConfig } from 'dr-comp-package/wfh/dist/config-handler';
export default function (config: DrcpConfig, browserOptions: AngularBuilderOptions, ssr?: boolean): Promise<ReturnType<typeof walkPackages>>;
export declare function injectorSetup(packageInfo: ReturnType<typeof walkPackages>, drcpArgs: AngularBuilderOptions['drcpArgs'], deployUrl: AngularBuilderOptions['deployUrl'], baseHref: AngularBuilderOptions['baseHref'], ssr?: boolean): Promise<void>;
