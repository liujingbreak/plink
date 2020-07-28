import { PayloadAction } from '@reduxjs/toolkit';
import { PackageJsonInterf } from '../dependency-installer';
import * as cmdOpt from '../cmd/types';
export interface PackageInfo {
    name: string;
    scope: string;
    shortName: string;
    json: any;
    path: string;
    realPath: string;
}
export interface PackagesState {
    seq: number;
    srcPackages?: {
        [name: string]: PackageInfo;
    };
    workspaces: {
        [dir: string]: WorkspaceState;
    };
    project2Packages: {
        [prj: string]: string[];
    };
}
interface WorkspaceState {
    dir: string;
    originInstallJson: PackageJsonInterf;
    originInstallJsonStr: string;
    installJson: PackageJsonInterf;
    installJsonStr: string;
    /** names of those symlink packages */
    linkedDependencies: [string, string][];
    linkedDevDependencies: [string, string][];
}
export declare const slice: import("@reduxjs/toolkit").Slice<PackagesState, {
    initRootDir(d: {
        seq: number;
        srcPackages?: {
            [x: string]: {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
            };
        } | undefined;
        workspaces: {
            [x: string]: {
                dir: string;
                originInstallJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                originInstallJsonStr: string;
                installJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                installJsonStr: string;
                linkedDependencies: [string, string][];
                linkedDevDependencies: [string, string][];
            };
        };
        project2Packages: {
            [x: string]: string[];
        };
    }, action: PayloadAction<{
        hoistedDir: string;
    } | undefined | null>): void;
    initWorkspace(d: {
        seq: number;
        srcPackages?: {
            [x: string]: {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
            };
        } | undefined;
        workspaces: {
            [x: string]: {
                dir: string;
                originInstallJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                originInstallJsonStr: string;
                installJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                installJsonStr: string;
                linkedDependencies: [string, string][];
                linkedDevDependencies: [string, string][];
            };
        };
        project2Packages: {
            [x: string]: string[];
        };
    }, action: PayloadAction<{
        dir: string;
        opt: cmdOpt.InitCmdOptions;
    }>): void;
    _syncPackagesState(d: {
        seq: number;
        srcPackages?: {
            [x: string]: {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
            };
        } | undefined;
        workspaces: {
            [x: string]: {
                dir: string;
                originInstallJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                originInstallJsonStr: string;
                installJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                installJsonStr: string;
                linkedDependencies: [string, string][];
                linkedDevDependencies: [string, string][];
            };
        };
        project2Packages: {
            [x: string]: string[];
        };
    }, { payload }: PayloadAction<{
        packageJsonFiles: string[];
    }>): void;
    _checkPackages(): void;
    _updatePackageState(d: {
        seq: number;
        srcPackages?: {
            [x: string]: {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
            };
        } | undefined;
        workspaces: {
            [x: string]: {
                dir: string;
                originInstallJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                originInstallJsonStr: string;
                installJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                installJsonStr: string;
                linkedDependencies: [string, string][];
                linkedDevDependencies: [string, string][];
            };
        };
        project2Packages: {
            [x: string]: string[];
        };
    }, { payload }: PayloadAction<any[]>): void;
    addProject(d: {
        seq: number;
        srcPackages?: {
            [x: string]: {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
            };
        } | undefined;
        workspaces: {
            [x: string]: {
                dir: string;
                originInstallJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                originInstallJsonStr: string;
                installJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                installJsonStr: string;
                linkedDependencies: [string, string][];
                linkedDevDependencies: [string, string][];
            };
        };
        project2Packages: {
            [x: string]: string[];
        };
    }, action: PayloadAction<string[]>): void;
    deleteProject(d: {
        seq: number;
        srcPackages?: {
            [x: string]: {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
            };
        } | undefined;
        workspaces: {
            [x: string]: {
                dir: string;
                originInstallJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                originInstallJsonStr: string;
                installJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                installJsonStr: string;
                linkedDependencies: [string, string][];
                linkedDevDependencies: [string, string][];
            };
        };
        project2Packages: {
            [x: string]: string[];
        };
    }, action: PayloadAction<string[]>): void;
    _hoistWorkspaceDeps(state: {
        seq: number;
        srcPackages?: {
            [x: string]: {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
            };
        } | undefined;
        workspaces: {
            [x: string]: {
                dir: string;
                originInstallJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                originInstallJsonStr: string;
                installJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                installJsonStr: string;
                linkedDependencies: [string, string][];
                linkedDevDependencies: [string, string][];
            };
        };
        project2Packages: {
            [x: string]: string[];
        };
    }, { payload: { dir } }: {
        payload: {
            dir: string;
        };
        type: string;
    }): void;
    _installWorkspace(state: {
        seq: number;
        srcPackages?: {
            [x: string]: {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
            };
        } | undefined;
        workspaces: {
            [x: string]: {
                dir: string;
                originInstallJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                originInstallJsonStr: string;
                installJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                installJsonStr: string;
                linkedDependencies: [string, string][];
                linkedDevDependencies: [string, string][];
            };
        };
        project2Packages: {
            [x: string]: string[];
        };
    }, { payload: { dir } }: {
        payload: {
            dir: string;
        };
        type: string;
    }): void;
} & import("../utils/redux-store").ExtraSliceReducers<PackagesState>, "packages">;
export declare const actionDispatcher: import("@reduxjs/toolkit").CaseReducerActions<{
    initRootDir(d: {
        seq: number;
        srcPackages?: {
            [x: string]: {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
            };
        } | undefined;
        workspaces: {
            [x: string]: {
                dir: string;
                originInstallJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                originInstallJsonStr: string;
                installJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                installJsonStr: string;
                linkedDependencies: [string, string][];
                linkedDevDependencies: [string, string][];
            };
        };
        project2Packages: {
            [x: string]: string[];
        };
    }, action: PayloadAction<{
        hoistedDir: string;
    } | undefined | null>): void;
    initWorkspace(d: {
        seq: number;
        srcPackages?: {
            [x: string]: {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
            };
        } | undefined;
        workspaces: {
            [x: string]: {
                dir: string;
                originInstallJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                originInstallJsonStr: string;
                installJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                installJsonStr: string;
                linkedDependencies: [string, string][];
                linkedDevDependencies: [string, string][];
            };
        };
        project2Packages: {
            [x: string]: string[];
        };
    }, action: PayloadAction<{
        dir: string;
        opt: cmdOpt.InitCmdOptions;
    }>): void;
    _syncPackagesState(d: {
        seq: number;
        srcPackages?: {
            [x: string]: {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
            };
        } | undefined;
        workspaces: {
            [x: string]: {
                dir: string;
                originInstallJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                originInstallJsonStr: string;
                installJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                installJsonStr: string;
                linkedDependencies: [string, string][];
                linkedDevDependencies: [string, string][];
            };
        };
        project2Packages: {
            [x: string]: string[];
        };
    }, { payload }: PayloadAction<{
        packageJsonFiles: string[];
    }>): void;
    _checkPackages(): void;
    _updatePackageState(d: {
        seq: number;
        srcPackages?: {
            [x: string]: {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
            };
        } | undefined;
        workspaces: {
            [x: string]: {
                dir: string;
                originInstallJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                originInstallJsonStr: string;
                installJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                installJsonStr: string;
                linkedDependencies: [string, string][];
                linkedDevDependencies: [string, string][];
            };
        };
        project2Packages: {
            [x: string]: string[];
        };
    }, { payload }: PayloadAction<any[]>): void;
    addProject(d: {
        seq: number;
        srcPackages?: {
            [x: string]: {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
            };
        } | undefined;
        workspaces: {
            [x: string]: {
                dir: string;
                originInstallJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                originInstallJsonStr: string;
                installJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                installJsonStr: string;
                linkedDependencies: [string, string][];
                linkedDevDependencies: [string, string][];
            };
        };
        project2Packages: {
            [x: string]: string[];
        };
    }, action: PayloadAction<string[]>): void;
    deleteProject(d: {
        seq: number;
        srcPackages?: {
            [x: string]: {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
            };
        } | undefined;
        workspaces: {
            [x: string]: {
                dir: string;
                originInstallJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                originInstallJsonStr: string;
                installJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                installJsonStr: string;
                linkedDependencies: [string, string][];
                linkedDevDependencies: [string, string][];
            };
        };
        project2Packages: {
            [x: string]: string[];
        };
    }, action: PayloadAction<string[]>): void;
    _hoistWorkspaceDeps(state: {
        seq: number;
        srcPackages?: {
            [x: string]: {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
            };
        } | undefined;
        workspaces: {
            [x: string]: {
                dir: string;
                originInstallJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                originInstallJsonStr: string;
                installJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                installJsonStr: string;
                linkedDependencies: [string, string][];
                linkedDevDependencies: [string, string][];
            };
        };
        project2Packages: {
            [x: string]: string[];
        };
    }, { payload: { dir } }: {
        payload: {
            dir: string;
        };
        type: string;
    }): void;
    _installWorkspace(state: {
        seq: number;
        srcPackages?: {
            [x: string]: {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
            };
        } | undefined;
        workspaces: {
            [x: string]: {
                dir: string;
                originInstallJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                originInstallJsonStr: string;
                installJson: {
                    version: string;
                    name: string;
                    devDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    peerDependencies?: {
                        [x: string]: string;
                    } | undefined;
                    dependencies?: {
                        [x: string]: string;
                    } | undefined;
                };
                installJsonStr: string;
                linkedDependencies: [string, string][];
                linkedDevDependencies: [string, string][];
            };
        };
        project2Packages: {
            [x: string]: string[];
        };
    }, { payload: { dir } }: {
        payload: {
            dir: string;
        };
        type: string;
    }): void;
} & import("../utils/redux-store").ExtraSliceReducers<PackagesState>>;
export declare function getState(): PackagesState;
export declare function getStore(): import("rxjs").Observable<PackagesState>;
export declare function listPackages(): string;
export declare function getProjectList(): string[];
export declare function listPackagesByProjects(): string;
export {};
