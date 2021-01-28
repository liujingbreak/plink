import * as ts from 'typescript';
import { ReplacementInf } from './patch-text';
import ImportClauseTranspile from './default-import-ts-transpiler';
export { ReplacementInf };
export declare type TsHandler = (ast: ts.SourceFile) => ReplacementInf[];
export default class ApiAotCompiler {
    protected file: string;
    protected src: string;
    ast: ts.SourceFile;
    replacements: ReplacementInf[];
    importTranspiler: ImportClauseTranspile;
    constructor(file: string, src: string);
    parse(transpileExp: (source: string) => string): string;
    protected _callTsHandlers(tsHandlers: Array<[string, TsHandler]>): void;
    protected traverseTsAst(ast: ts.Node, level?: number): void;
    /**
       * keep looking up for parents until it is not CallExpression, ElementAccessExpression or PropertyAccessExpression
       */
    protected goUpToParentExpress(target: ts.Node): ts.Node;
}
