import { PayloadAction } from '@reduxjs/toolkit';
import { Observable } from 'rxjs';
import { PackageJsonInterf, DependentInfo } from '../transitive-dep-hoister';
export interface PackageInfo {
    name: string;
    scope: string;
    shortName: string;
    json: any;
    path: string;
    realPath: string;
    isInstalled: boolean;
}
export interface PackagesState {
    inited: boolean;
    srcPackages: Map<string, PackageInfo>;
    /** Key is relative path to root workspace */
    workspaces: Map<string, WorkspaceState>;
    /** key of current "workspaces" */
    currWorkspace?: string | null;
    project2Packages: Map<string, string[]>;
    linkedDrcp: PackageInfo | null;
    gitIgnores: {
        [file: string]: string[];
    };
    isInChina?: boolean;
    /** Everytime a hoist workspace state calculation is basically done, it is increased by 1 */
    workspaceUpdateChecksum: number;
    packagesUpdateChecksum: number;
    /** workspace key */
    lastCreatedWorkspace?: string;
}
export interface WorkspaceState {
    id: string;
    originInstallJson: PackageJsonInterf;
    originInstallJsonStr: string;
    installJson: PackageJsonInterf;
    installJsonStr: string;
    /** names of those symlink packages */
    linkedDependencies: [string, string][];
    linkedDevDependencies: [string, string][];
    /** installed DR component packages [name, version]*/
    installedComponents?: Map<string, PackageInfo>;
    hoistInfo: Map<string, DependentInfo>;
    hoistPeerDepInfo: Map<string, DependentInfo>;
    hoistDevInfo: Map<string, DependentInfo>;
    hoistDevPeerDepInfo: Map<string, DependentInfo>;
}
export declare const slice: import("@reduxjs/toolkit").Slice<PackagesState, {
    /** Do this action after any linked package is removed or added  */
    initRootDir(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<{
        isForce: boolean;
        createHook: boolean;
    }>): void;
    /** Check and install dependency, if there is linked package used in more than one workspace,
     * to switch between different workspace */
    updateWorkspace(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<{
        dir: string;
        isForce: boolean;
        createHook: boolean;
    }>): void;
    updateDir(): void;
    _syncLinkedPackages(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload }: PayloadAction<PackageInfo[]>): void;
    onLinkedPackageAdded(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    addProject(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    deleteProject(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    /** payload: workspace keys  */
    createSymlinksForWorkspace(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    updateGitIgnores(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload }: PayloadAction<{
        file: string;
        lines: string[];
    }>): void;
    packagesUpdated(d: import("immer/dist/internal").WritableDraft<PackagesState>): void;
    setInChina(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload }: PayloadAction<boolean>): void;
    setCurrentWorkspace(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload: dir }: PayloadAction<string | null>): void;
    workspaceStateUpdated(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload }: PayloadAction<void>): void;
    _hoistWorkspaceDeps(state: import("immer/dist/internal").WritableDraft<PackagesState>, { payload: { dir } }: {
        payload: {
            dir: string;
        };
        type: string;
    }): void;
    _installWorkspace(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload: { workspaceKey } }: {
        payload: {
            workspaceKey: string;
        };
        type: string;
    }): void;
    _associatePackageToPrj(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload: { prj, pkgs } }: {
        payload: {
            prj: string;
            pkgs: PackageInfo[];
        };
        type: string;
    }): void;
    _onRelatedPackageUpdated(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload: workspaceKey }: PayloadAction<string>): void;
} & import("../../../redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<PackagesState>, "packages">;
export declare const actionDispatcher: import("@reduxjs/toolkit").CaseReducerActions<{
    /** Do this action after any linked package is removed or added  */
    initRootDir(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<{
        isForce: boolean;
        createHook: boolean;
    }>): void;
    /** Check and install dependency, if there is linked package used in more than one workspace,
     * to switch between different workspace */
    updateWorkspace(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<{
        dir: string;
        isForce: boolean;
        createHook: boolean;
    }>): void;
    updateDir(): void;
    _syncLinkedPackages(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload }: PayloadAction<PackageInfo[]>): void;
    onLinkedPackageAdded(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    addProject(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    deleteProject(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    /** payload: workspace keys  */
    createSymlinksForWorkspace(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    updateGitIgnores(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload }: PayloadAction<{
        file: string;
        lines: string[];
    }>): void;
    packagesUpdated(d: import("immer/dist/internal").WritableDraft<PackagesState>): void;
    setInChina(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload }: PayloadAction<boolean>): void;
    setCurrentWorkspace(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload: dir }: PayloadAction<string | null>): void;
    workspaceStateUpdated(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload }: PayloadAction<void>): void;
    _hoistWorkspaceDeps(state: import("immer/dist/internal").WritableDraft<PackagesState>, { payload: { dir } }: {
        payload: {
            dir: string;
        };
        type: string;
    }): void;
    _installWorkspace(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload: { workspaceKey } }: {
        payload: {
            workspaceKey: string;
        };
        type: string;
    }): void;
    _associatePackageToPrj(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload: { prj, pkgs } }: {
        payload: {
            prj: string;
            pkgs: PackageInfo[];
        };
        type: string;
    }): void;
    _onRelatedPackageUpdated(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload: workspaceKey }: PayloadAction<string>): void;
} & import("../../../redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<PackagesState>>;
export declare const updateGitIgnores: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    file: string;
    lines: string[];
}, string>, onLinkedPackageAdded: import("@reduxjs/toolkit").ActionCreatorWithPayload<string[], string>;
export declare function getState(): PackagesState;
export declare function getStore(): Observable<PackagesState>;
export declare function pathToProjKey(path: string): string;
export declare function workspaceKey(path: string): string;
export declare function getPackagesOfProjects(projects: string[]): Generator<PackageInfo, void, unknown>;
/**
 * List linked packages
 */
export declare function listPackages(): string;
export declare function getProjectList(): string[];
export declare function isCwdWorkspace(): boolean;
export declare function installInDir(dir: string, originPkgJsonStr: string, toInstallPkgJsonStr: string): Promise<void>;
/**
 *
 * @param pkJsonFile package.json file path
 * @param isInstalled
 * @param symLink symlink path of package
 * @param realPath real path of package
 */
export declare function createPackageInfo(pkJsonFile: string, isInstalled?: boolean): PackageInfo;
