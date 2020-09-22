import { PayloadAction } from '@reduxjs/toolkit';
import { Observable } from 'rxjs';
import { PackageJsonInterf } from '../dependency-hoister';
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
    project2Packages: Map<string, string[]>;
    linkedDrcp: PackageInfo | null;
    gitIgnores: {
        [file: string]: string;
    };
    isInChina?: boolean;
}
interface WorkspaceState {
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
}
export declare const slice: import("@reduxjs/toolkit").Slice<PackagesState, {
    /** Do this action after any linked package is removed or added  */
    initRootDir(d: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, action: PayloadAction<{
        hoistedDir: string;
    } | undefined | null>): void;
    /** Check and install dependency, if there is linked package used in more than one workspace,
     * to switch between different workspace */
    initWorkspace(d: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, action: PayloadAction<{
        dir: string;
        isForce: boolean;
        logHasConfiged: boolean;
    }>): void;
    _syncPackagesState(d: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, { payload }: PayloadAction<PackageInfo[]>): void;
    addProject(d: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, action: PayloadAction<string[]>): void;
    deleteProject(d: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, action: PayloadAction<string[]>): void;
    _hoistWorkspaceDeps(state: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, { payload: { dir } }: {
        payload: {
            dir: string;
        };
        type: string;
    }): void;
    _installWorkspace(state: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, { payload: { workspaceKey } }: {
        payload: {
            workspaceKey: string;
        };
        type: string;
    }): void;
    _associatePackageToPrj(d: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, { payload: { prj, pkgs } }: {
        payload: {
            prj: string;
            pkgs: PackageInfo[];
        };
        type: string;
    }): void;
    _updateGitIgnores(d: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, { payload }: PayloadAction<{
        file: string;
        content: string;
    }>): void;
    setInChina(d: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, { payload }: PayloadAction<boolean>): void;
} & import("../../../redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<PackagesState>, "packages">;
export declare const actionDispatcher: import("@reduxjs/toolkit").CaseReducerActions<{
    /** Do this action after any linked package is removed or added  */
    initRootDir(d: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, action: PayloadAction<{
        hoistedDir: string;
    } | undefined | null>): void;
    /** Check and install dependency, if there is linked package used in more than one workspace,
     * to switch between different workspace */
    initWorkspace(d: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, action: PayloadAction<{
        dir: string;
        isForce: boolean;
        logHasConfiged: boolean;
    }>): void;
    _syncPackagesState(d: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, { payload }: PayloadAction<PackageInfo[]>): void;
    addProject(d: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, action: PayloadAction<string[]>): void;
    deleteProject(d: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, action: PayloadAction<string[]>): void;
    _hoistWorkspaceDeps(state: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, { payload: { dir } }: {
        payload: {
            dir: string;
        };
        type: string;
    }): void;
    _installWorkspace(state: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, { payload: { workspaceKey } }: {
        payload: {
            workspaceKey: string;
        };
        type: string;
    }): void;
    _associatePackageToPrj(d: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, { payload: { prj, pkgs } }: {
        payload: {
            prj: string;
            pkgs: PackageInfo[];
        };
        type: string;
    }): void;
    _updateGitIgnores(d: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, { payload }: PayloadAction<{
        file: string;
        content: string;
    }>): void;
    setInChina(d: {
        inited: boolean;
        srcPackages: Map<string, {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        }>;
        workspaces: Map<string, {
            id: string;
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
            installedComponents?: Map<string, {
                name: string;
                scope: string;
                shortName: string;
                json: any;
                path: string;
                realPath: string;
                isInstalled: boolean;
            }> | undefined;
        }>;
        project2Packages: Map<string, string[]>;
        linkedDrcp: {
            name: string;
            scope: string;
            shortName: string;
            json: any;
            path: string;
            realPath: string;
            isInstalled: boolean;
        } | null;
        gitIgnores: {
            [x: string]: string;
        };
        isInChina?: boolean | undefined;
    }, { payload }: PayloadAction<boolean>): void;
} & import("../../../redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<PackagesState>>;
export declare function getState(): PackagesState;
export declare function getStore(): Observable<PackagesState>;
export declare function pathToProjKey(path: string): string;
export declare function workspaceKey(path: string): string;
export declare function pathToWorkspace(path: string): string;
export declare function getPackagesOfProjects(projects: string[]): Generator<PackageInfo, void, unknown>;
export declare function listPackages(): string;
export declare function getProjectList(): string[];
export declare function listPackagesByProjects(): string;
/**
 *
 * @param pkJsonFile package.json file path
 * @param isInstalled
 * @param symLink symlink path of package
 * @param realPath real path of package
 */
export declare function createPackageInfo(pkJsonFile: string, isInstalled?: boolean, symLinkParentDir?: string): PackageInfo;
export {};
