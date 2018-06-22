import * as ts from 'typescript';
import { ReplacementInf } from './patch-text';
export default class ApiAotCompiler {
    protected file: string;
    protected src: string;
    static idText(node: any): any;
    ast: ts.SourceFile;
    replacements: ReplacementInf[];
    constructor(file: string, src: string);
    parse(): string;
    getApiForFile(file: string): void;
    private traverseTsAst(ast, level?);
    private nodeText(ast);
}
