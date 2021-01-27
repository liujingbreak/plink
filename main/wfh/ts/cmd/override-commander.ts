import commander from 'commander';
import {WorkspaceState, PackageInfo} from '../package-mgr';
import chalk from 'chalk';

export function overrideCommand(program: commander.Command, ws: WorkspaceState | undefined) {
  const loadedCmdMap = new Map<string, string>();
  const origPgmCommand = program.command;
  let filePath: string | null = null;

  let pk: PackageInfo;
  let originDescFn: ReturnType<commander.Command['command']>['description'];

  function command(this: typeof program, nameAndArgs: string, ...restArgs: any[]) {
    const cmdName = /^\S+/.exec(nameAndArgs)![0];
    if (loadedCmdMap.has(cmdName)) {
      throw new Error(`Conflict command name ${cmdName} from extensions "${filePath}" and "${loadedCmdMap.get(cmdName)}"`);
    }
    loadedCmdMap.set(cmdName, filePath!);
    const subCmd: ReturnType<typeof origPgmCommand> = origPgmCommand.call(this, nameAndArgs, ...restArgs);
    originDescFn = subCmd.description;

    subCmd.description = description as any;
    return subCmd;
  }

  function description(this: ReturnType<typeof origPgmCommand>, str: string, ...remainder: any[]) {
    str = chalk.blue(`[${pk.name}]`) + ' ' + str;
    return originDescFn.call(this, str, ...remainder);
  }

  program.command = command as any;

  return {
    forPackage(pkg: PackageInfo, cmdExecutionFile: string) {
      pk = pkg;
      filePath = cmdExecutionFile;
    }
  };
}


