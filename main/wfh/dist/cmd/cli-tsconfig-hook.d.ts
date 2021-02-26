export interface CliOptions {
    hook: string[];
    unhook: string[];
    unhookAll: boolean;
}
export declare function doTsconfig(opts: CliOptions): void;
