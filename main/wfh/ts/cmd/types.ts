

export interface GlobalOptions {
  config: string[];
  prop: string[];
  logStat?: boolean;
  production?: boolean;
}

export interface InitCmdOptions extends GlobalOptions {
  force: boolean;
  production: boolean;
  // yarn: boolean;
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
  project: string[];
}
