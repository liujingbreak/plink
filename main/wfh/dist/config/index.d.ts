import { ConfigHandlerMgr, DrcpConfig } from '../config-handler';
import * as rx from 'rxjs';
import * as _pkgList from '../package-mgr/package-list-helper';
export declare const handlers$: rx.BehaviorSubject<ConfigHandlerMgr | undefined>;
declare type PackageInfo = ReturnType<(typeof _pkgList)['packages4Workspace']> extends Generator<infer T> ? T : unknown;
export interface WithPackageSettingProp {
    setting: {
        /** In form of "<path>#<export-name>" */
        type: string;
        /** In form of "<module-path>#<export-name>" */
        value: string;
    };
}
/**
 * @returns [defaultValueFile, exportName, dtsFile]
 */
export declare function getPackageSettingFiles(workspaceKey: string, includePkg?: Set<string>): Generator<[
    /** relative path within package realpath, without ext file name */
    typeFileWithoutExt: string,
    typeExportName: string,
    /** relative path of js file, which exports default value or factory function of default value */
    jsFile: string,
    defaultExportName: string,
    pkg: PackageInfo
]>;
declare const _default: DrcpConfig;
export default _default;
