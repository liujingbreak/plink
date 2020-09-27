import commander from 'commander';
export declare type CliExtension = (program: commander.Command, withGlobalCliOptions: (subCommand: commander.Command) => void) => void;
export interface GlobalOptions {
    config: string[];
    prop: string[];
    logStat?: boolean;
    production?: boolean;
}
export interface InitCmdOptions extends GlobalOptions {
    force: boolean;
    production: boolean;
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
    packageDirs: string[];
}
export interface PublishOptions extends GlobalOptions {
    project: string[];
    packageDirs: string[];
    public: boolean;
}
