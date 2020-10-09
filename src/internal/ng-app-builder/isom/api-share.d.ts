import { ExtendedApi } from '@wfh/plink/wfh/dist/assets-url';
import NodeApi from '@wfh/plink/wfh/dist/package-mgr/node-package-api';
export declare function createNgRouterPath(baseHrefPath?: string): (this: ExtendedApi & NodeApi, packageName: string, subPath?: string | undefined) => string;
