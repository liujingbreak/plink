import { Application } from 'express';
import ExpressAppApi from './api-types';
import { DrcpApi } from '@wfh/ng-app-builder/globals';
export { ExpressAppApi };
export declare function createPackageDefinedRouters(app: Application): void;
export declare function applyPackageDefinedAppSetting(app: Application): void;
export declare function setupApi(api: ExpressAppApi & DrcpApi, app: Application): void;
