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
  dir?: string[];
  file?: string[];
}
