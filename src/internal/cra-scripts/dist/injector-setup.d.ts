import NodeApi from 'dr-comp-package/wfh/dist/package-mgr/node-package-api';
import { walkPackages } from 'dr-comp-package/wfh/dist/build-util/ts/main';
export default function walkPackagesAndSetupInjector(ssr?: boolean): NodeApi;
export declare function injectorSetup(packageInfo: ReturnType<typeof walkPackages>, ssr?: boolean): NodeApi;
