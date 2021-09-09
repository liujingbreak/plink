/**
 * Unfortunately, this file is very long, you need to fold by indention for better view of source code in Editor
 */
import { PayloadAction } from '@reduxjs/toolkit';
import { Observable } from 'rxjs';
import { PackageJsonInterf, DependentInfo } from '../transitive-dep-hoister';
export interface PackageInfo {
    name: string;
    scope: string;
    shortName: string;
    json: {
        plink?: PlinkJsonType;
        dr?: PlinkJsonType;
        [p: string]: any;
    } & PackageJsonInterf;
    /** Be aware: If this property is not same as "realPath",
     * then it is a symlink whose path is relative to workspace directory */
    path: string;
    realPath: string;
    isInstalled: boolean;
}
export declare type PlinkJsonType = {
    typeRoot?: string;
    type?: 'server' | string[] | string;
    serverPriority?: string | number;
    serverEntry?: string;
    setting?: {
        /** In form of "<path>#<export-name>" */
        type: string;
        /** In form of "<module-path>#<export-name>" */
        value: string;
    };
    [p: string]: any;
};
export interface PackagesState {
    npmInstallOpt: NpmOptions;
    inited: boolean;
    srcPackages: Map<string, PackageInfo>;
    /** Key is relative path to root workspace */
    workspaces: Map<string, WorkspaceState>;
    /** key of current "workspaces" */
    currWorkspace?: string | null;
    project2Packages: Map<string, string[]>;
    srcDir2Packages: Map<string, string[]>;
    /** Drcp is the original name of Plink project */
    linkedDrcp?: PackageInfo | null;
    linkedDrcpProject?: string | null;
    installedDrcp?: PackageInfo | null;
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
    /** names of those linked source packages */
    linkedDependencies: [string, string][];
    /** names of those linked source packages */
    linkedDevDependencies: [string, string][];
    /** installed DR component packages [name, version]*/
    installedComponents?: Map<string, PackageInfo>;
    hoistInfo: Map<string, DependentInfo>;
    hoistPeerDepInfo: Map<string, DependentInfo>;
    hoistDevInfo: Map<string, DependentInfo>;
    hoistDevPeerDepInfo: Map<string, DependentInfo>;
    hoistInfoSummary?: {
        /** User should manully add them as dependencies of workspace */
        missingDeps: {
            [name: string]: string;
        };
        /** User should manully add them as devDependencies of workspace */
        missingDevDeps: {
            [name: string]: string;
        };
        /** versions are conflict */
        conflictDeps: string[];
    };
}
export interface NpmOptions {
    cache?: string;
    isForce: boolean;
    useNpmCi?: boolean;
    offline?: boolean;
}
export declare const slice: import("@reduxjs/toolkit").Slice<PackagesState, {
    /** Do this action after any linked package is removed or added  */
    initRootDir(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload }: PayloadAction<NpmOptions>): void;
    /**
     * - Create initial files in root directory
     * - Scan linked packages and install transitive dependency
     * - Switch to different workspace
     * - Delete nonexisting workspace
     * - If "packageJsonFiles" is provided, it should skip step of scanning linked packages
     * - TODO: if there is linked package used in more than one workspace, hoist and install for them all?
     */
    updateWorkspace(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload }: PayloadAction<{
        dir: string;
        packageJsonFiles?: string[];
    } & NpmOptions>): void;
    scanAndSyncPackages(d: PackagesState, action: PayloadAction<{
        packageJsonFiles?: string[];
    }>): void;
    updateDir(): void;
    _updatePlinkPackageInfo(d: import("immer/dist/internal").WritableDraft<PackagesState>): void;
    _syncLinkedPackages(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload }: PayloadAction<[pkgs: PackageInfo[], operator: 'update' | 'clean']>): void;
    onLinkedPackageAdded(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    addProject(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    deleteProject(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    addSrcDirs(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    deleteSrcDirs(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    /** payload: workspace keys, happens as debounced workspace change event */
    _workspaceBatchChanged(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    /** workspaceChanged is safe for external module to watch, it serialize actions like "_installWorkspace" and "_workspaceBatchChanged" */
    workspaceChanged(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    updateGitIgnores(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload: { file, lines } }: {
        payload: {
            file: string;
            lines: string[];
        };
        type: string;
    }): void;
    packagesUpdated(d: import("immer/dist/internal").WritableDraft<PackagesState>): void;
    setInChina(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload }: PayloadAction<boolean>): void;
    _setCurrentWorkspace(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload: dir }: PayloadAction<string | null>): void;
    /** paramter: workspace key */
    workspaceStateUpdated(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload }: PayloadAction<string>): void;
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
            pkgs: {
                name: string;
            }[];
        };
        type: string;
    }): void;
    _associatePackageToSrcDir(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload: { pattern, pkgs } }: {
        payload: {
            pattern: string;
            pkgs: {
                name: string;
            }[];
        };
        type: string;
    }): void;
} & import("../../../packages/redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<PackagesState>, "packages">;
export declare const actionDispatcher: import("@reduxjs/toolkit").CaseReducerActions<{
    /** Do this action after any linked package is removed or added  */
    initRootDir(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload }: PayloadAction<NpmOptions>): void;
    /**
     * - Create initial files in root directory
     * - Scan linked packages and install transitive dependency
     * - Switch to different workspace
     * - Delete nonexisting workspace
     * - If "packageJsonFiles" is provided, it should skip step of scanning linked packages
     * - TODO: if there is linked package used in more than one workspace, hoist and install for them all?
     */
    updateWorkspace(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload }: PayloadAction<{
        dir: string;
        packageJsonFiles?: string[];
    } & NpmOptions>): void;
    scanAndSyncPackages(d: PackagesState, action: PayloadAction<{
        packageJsonFiles?: string[];
    }>): void;
    updateDir(): void;
    _updatePlinkPackageInfo(d: import("immer/dist/internal").WritableDraft<PackagesState>): void;
    _syncLinkedPackages(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload }: PayloadAction<[pkgs: PackageInfo[], operator: 'update' | 'clean']>): void;
    onLinkedPackageAdded(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    addProject(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    deleteProject(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    addSrcDirs(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    deleteSrcDirs(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    /** payload: workspace keys, happens as debounced workspace change event */
    _workspaceBatchChanged(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    /** workspaceChanged is safe for external module to watch, it serialize actions like "_installWorkspace" and "_workspaceBatchChanged" */
    workspaceChanged(d: import("immer/dist/internal").WritableDraft<PackagesState>, action: PayloadAction<string[]>): void;
    updateGitIgnores(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload: { file, lines } }: {
        payload: {
            file: string;
            lines: string[];
        };
        type: string;
    }): void;
    packagesUpdated(d: import("immer/dist/internal").WritableDraft<PackagesState>): void;
    setInChina(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload }: PayloadAction<boolean>): void;
    _setCurrentWorkspace(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload: dir }: PayloadAction<string | null>): void;
    /** paramter: workspace key */
    workspaceStateUpdated(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload }: PayloadAction<string>): void;
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
            pkgs: {
                name: string;
            }[];
        };
        type: string;
    }): void;
    _associatePackageToSrcDir(d: import("immer/dist/internal").WritableDraft<PackagesState>, { payload: { pattern, pkgs } }: {
        payload: {
            pattern: string;
            pkgs: {
                name: string;
            }[];
        };
        type: string;
    }): void;
} & import("../../../packages/redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<PackagesState>>;
export declare const updateGitIgnores: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    file: string;
    lines: string[];
}, string>, onLinkedPackageAdded: import("@reduxjs/toolkit").ActionCreatorWithPayload<string[], string>;
export declare function getState(): PackagesState;
export declare function getStore(): Observable<PackagesState>;
export declare function pathToProjKey(path: string): string;
export declare function projKeyToPath(key: string): string;
export declare function workspaceKey(path: string): string;
export declare function workspaceDir(key: string): string;
export declare function getPackagesOfProjects(projects: string[]): Generator<PackageInfo, void, unknown>;
export declare function getProjectList(): string[];
export declare function isCwdWorkspace(): boolean;
/**
 * This method is meant to trigger editor-helper to update tsconfig files, so
 * editor-helper must be import at first
 * @param dir
 */
export declare function switchCurrentWorkspace(dir: string): void;
export declare function installInDir(dir: string, npmOpt: NpmOptions, originPkgJsonStr: string, toInstallPkgJsonStr: string): Promise<void>;
/**
 *
 * @param pkJsonFile package.json file path
 * @param isInstalled
 * @param symLink symlink path of package
 * @param realPath real path of package
 */
export declare function createPackageInfo(pkJsonFile: string, isInstalled?: boolean): PackageInfo;
