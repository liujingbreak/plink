import { Application } from 'express';
import { ExtensionContext } from '@wfh/plink';
export declare function createPackageDefinedRouters(app: Application): void;
export declare function applyPackageDefinedAppSetting(app: Application): void;
export declare function setupApi(api: ExtensionContext, app: Application): void;
