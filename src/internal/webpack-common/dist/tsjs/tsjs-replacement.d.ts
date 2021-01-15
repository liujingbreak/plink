import * as ts from 'typescript';
import { CompilerOptions } from 'typescript';
import ImportClauseTranspile from './default-import-ts-transpiler';
import BrowserPackage from '@wfh/plink/wfh/dist/package-mgr/package-instance';
import { ReplacementInf } from '@wfh/plink/wfh/dist/utils/patch-text';
export { ReplacementInf };
export declare type TsHandler = (ast: ts.SourceFile) => ReplacementInf[];
export default class TsPreCompiler {
    private findPackageByFile;
    tsCo: CompilerOptions;
    importTranspiler: ImportClauseTranspile;
    constructor(tsConfigFile: string, isServerSide: boolean, findPackageByFile: (file: string) => BrowserPackage | null | undefined);
    /**
     * replaceContext can put any Javascript object which contains properties or memember functions
     * @param file
     * @param source
     * @param replaceContext
     * @param compiledSource
     * @param astPositionConvert
     */
    parse(file: string, source: string, replaceContext: {
        [key: string]: any;
    }, compiledSource?: ts.SourceFile, astPositionConvert?: (pos: number) => number): string;
    protected traverseTsAst(ast: ts.Node, replaceContext: {
        [key: string]: any;
    }, replacements: ReplacementInf[], astPositionConvert?: (pos: number) => number, level?: number): ReplacementInf[] | undefined;
    /**
       * keep looking up for parents until it is not CallExpression, ElementAccessExpression or PropertyAccessExpression
       */
    protected goUpToParentExp(target: ts.Node): ts.Node;
}
