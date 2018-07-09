import * as ts from 'typescript';
import { ReplacementInf } from './patch-text';
import ImportClauseTranspile from './default-import-ts-transpiler';
export default class ApiAotCompiler {
    protected file: string;
    protected src: string;
    static idText(node: any): any;
    ast: ts.SourceFile;
    replacements: ReplacementInf[];
    importTranspiler: ImportClauseTranspile;
    constructor(file: string, src: string);
    parse(transpileExp: (source: string) => string): string;
    getApiForFile(file: string): void;
    protected traverseTsAst(ast: ts.Node, level?: number): void;
    /**
     * keep looking up for parents until it is not CallExpression, ElementAccessExpression or PropertyAccessExpression
     */
    protected goUpToParentExpress(currNode: ts.Node): ts.Node;
    protected nodeText(ast: ts.Node): string;
}
