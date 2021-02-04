import commander from 'commander';
export type CliExtension = (program: commander.Command) => void;

export interface GlobalOptions {
  config: string[];
  prop: string[];
  production?: boolean;
  verbose?: boolean;
}

export interface InitCmdOptions extends GlobalOptions {
  force: boolean;
  production: boolean;
  lintHook: boolean;
}

export interface LintOptions extends GlobalOptions {
  pj: string[];
  fix: boolean;
}

export interface BumpOptions extends GlobalOptions {
  project: string[];
  increVersion: string;
}

export interface PackOptions extends GlobalOptions {
  dir: string[];
  project: string[];
  packages: string[];
  workspace: string[];
}

export interface PublishOptions extends PackOptions {
  public: boolean;
}

export interface AnalyzeOptions extends GlobalOptions {
  dir?: string;
  file?: string[];
  j: boolean;
}

export interface OurCommandMetadata {
  pkgName: string;
  nameAndArgs: string;
  alias?: string;
  desc: string;
  usage: string;
  options: OurCommandOption[];
}

export interface OurCommandOption<T = string> {
  flags: string;
  desc: string;
  defaultValue: string | boolean | T[] | T;
  // isArray: boolean;
  isRequired: boolean;
}

export interface OurAugmentedCommander extends commander.Command {
  _origOption: commander.Command['option'];
}

