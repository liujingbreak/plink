import * as ts from 'typescript';
import * as textPatcher from './patch-text';
import ImportClauseTranspile from './default-import-ts-transpiler';
export default class ApiAotCompiler {
    protected file: string;
    protected src: string;
    ast: ts.SourceFile;
    replacements: textPatcher.ReplacementInf[];
    importTranspiler: ImportClauseTranspile;
    constructor(file: string, src: string);
    parse(transpileExp: (source: string) => string): string;
    getApiForFile(file: string): void;
    protected traverseTsAst(ast: ts.Node, level?: number): void;
    /**
     * keep looking up for parents until it is not CallExpression, ElementAccessExpression or PropertyAccessExpression
     */
    protected goUpToParentExpress(target: ts.Node): ts.Node;
}
