export interface GlobalOptions {
    config: string[];
    prop: string[];
    /** set log level to "debug" */
    verbose?: boolean;
    /**
     * By turning on this option, Plink setting property "devMode" will automatcially set to `true`,
     * and process.env.NODE_ENV will also
     * being updated to 'developement' or 'production correspondingly.
     * */
    dev?: boolean;
    /** Customized environment value, package setting can return different setting values based on this value */
    env?: string;
}
export interface InitCmdOptions extends GlobalOptions {
    force: boolean;
}
export interface NpmCliOption {
    cache?: string;
    production: boolean;
    useCi: boolean;
    offline: boolean;
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
    j: boolean;
    /** Ignore modules that matches regular expression pattern */
    x?: string;
    tsconfig?: string;
    alias: string[];
}
export interface OurCommandMetadata {
    pkgName: string;
    name: string;
    alias?: string;
    desc: string;
    usage: string;
    options: OurCommandOption[];
    argDesc?: {
        [arg: string]: string;
    };
}
export interface OurCommandOption<T = string> {
    flags: string;
    desc: string;
    defaultValue: string | boolean | T[] | T;
    isRequired: boolean;
}
export interface WatchOption {
    copy?: string;
}
