import {SingleActionFactory, ActionMeta} from '@wfh/reactivizer';
import {defineCommander} from '../cmd/cli';

export interface ChildProcessCmdMsg {
  type: 'plink2:cmd' | 'rx:message';
  id: ActionMeta['i'];
  cols: number;
  rows: number;
  cwd: string;
  args: string[];
}

export interface CmdEntryChildProcessInput {
  doCommand(cols: number, rows: number, cwd: string, cmd: string[]): SingleActionFactory;
}

export interface CmdEntryChildProcessEvents {
  onCommanderInited(commander: ReturnType<typeof defineCommander> extends Promise<infer T> ? T : unknown): SingleActionFactory;
  onCommandDone(): SingleActionFactory;
  onCommandError(error: string): SingleActionFactory;
  onShutdown(): SingleActionFactory;
  onReady(): SingleActionFactory;
}

export const outputTableForCmdEntryProcEvents = ['onCommanderInited'] as const;
