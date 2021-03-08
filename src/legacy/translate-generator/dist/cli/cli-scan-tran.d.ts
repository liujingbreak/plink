export interface Translatable {
    key: string;
    text: string | null;
    start: number;
    end: number;
    desc: string;
}
export declare type StringInfo = [
    start: number,
    end: number,
    text: string,
    /** 1 based */
    line: number,
    /** 1 based */
    col: number,
    type: string
];
export declare function scanTran(locale: string, pkgName: string | undefined, rootDir?: string, jsDir?: string, metaDir?: string, excludeJs?: boolean): Promise<void>;
