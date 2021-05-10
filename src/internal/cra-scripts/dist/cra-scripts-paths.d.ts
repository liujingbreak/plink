import { CraScriptsPaths } from './types';
export declare const PKG_LIB_ENTRY_PROP = "cra-lib-entry";
export declare const PKG_LIB_ENTRY_DEFAULT = "public_api.ts";
export declare const PKG_APP_ENTRY_PROP = "cra-app-entry";
export declare const PKG_APP_ENTRY_DEFAULT = "start.tsx";
export declare function getConfigFileInPackage(): string | null | undefined;
export default function paths(): CraScriptsPaths;
