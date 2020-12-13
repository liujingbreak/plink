import { WorkspaceState } from '../package-mgr';
import * as options from './types';
export default function (opt: options.InitCmdOptions, workspace?: string): Promise<void>;
export declare function printWorkspaces(): void;
export declare function printWorkspaceHoistedDeps(workspace: WorkspaceState): void;
