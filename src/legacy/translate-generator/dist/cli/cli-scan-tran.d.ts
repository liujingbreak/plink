export interface Translatables {
    start: number;
    end: number;
    desc: string;
    default: string;
    text: string | null;
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
export declare function scanTran(dir: string, output?: string): Promise<void>;
