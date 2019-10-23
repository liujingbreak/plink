import { ExtendedApi } from 'dr-comp-package/wfh/dist/assets-url';
import NodeApi from 'dr-comp-package/wfh/dist/package-mgr/node-package-api';
export declare function createNgRouterPath(baseHrefPath?: string): (this: ExtendedApi & NodeApi, packageName: string, subPath?: string | undefined) => string;
