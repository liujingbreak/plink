import { Application } from 'express';
import { DrcpApi } from '__api';
export declare function createPackageDefinedRouters(app: Application): void;
export declare function applyPackageDefinedAppSetting(app: Application): void;
export declare function setupApi(api: DrcpApi, app: Application): void;
