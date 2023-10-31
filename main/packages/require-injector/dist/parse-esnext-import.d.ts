export declare function toAssignment(parsedInfo: ParseInfo, valueStr: string): string;
export declare class ParseInfo {
    vars: {
        [k: string]: string;
    };
    defaultVar: string;
    namespaceVar: string;
    from: string;
}
export declare class ParseExportInfo {
    exported: {
        [name: string]: string;
    };
    from: string;
}
export declare function parse(ast: any): ParseInfo;
export declare function parseExport(ast: any): ParseExportInfo;
