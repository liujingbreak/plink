import { WorkspaceState } from '../package-mgr';
import '../editor-helper';
import * as options from './types';
export default function (opt: options.InitCmdOptions & options.NpmCliOption, workspace?: string): void;
export declare function printWorkspaces(): void;
export declare function printWorkspaceHoistedDeps(workspace: WorkspaceState): void;
