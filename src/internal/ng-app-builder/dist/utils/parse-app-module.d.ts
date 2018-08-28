import * as ts from 'typescript';
import { ReplacementInf } from './patch-text';
export declare class EsImportStatement {
    from: string;
    start: number;
    end: number;
    defaultName?: string;
    namespace?: string;
    nameBinding?: {
        [as: string]: string;
    };
    isDynamic: boolean;
    constructor(from: string, start: number, end: number);
    asNameToRealName(asName: string): string;
}
export declare function findAppModuleFileFromMain(mainFile: string): string;
export default class AppModuleParser {
    file: string;
    esImportsMap: Map<string, EsImportStatement>;
    dynamicModuleSet: Set<string>;
    modulesToAdd: Array<{
        moduleName: string;
        exportName: string;
    }>;
    replacements: ReplacementInf[];
    lastEsImportEndPos: number;
    fileContent: string;
    sourceFile: ts.SourceFile;
    /**
     *
     * @param file file path
     * @param fileContent file content
     * @param removableModules array of <ES module path>#<export name>, e.g. @foo/bar/src/module#DocRoute
     * @param modulesToAdd array of <ES module path>#<export name>, e.g. @foo/bar/src/module#DocRoute
     * @param importAppComponent e.g. @foo/bar/src/module#AppComponent
     */
    patchFile(file: string, fileContent: string, removableModules: string[], modulesToAdd: string[]): string;
    protected findEsImportByName(name: string): EsImportStatement;
    /**
     * 1. Remember those NgModule imports which are not removable
     *   (neither removable nor Typescript Identifier/CallExpression)
     * 2. Remove ES import statement which are removable
     * 3. Add new ES import statement
     * 4. Replace whole NgModule imports arrary with those not removables and newly added
     * @param ngImportArrayExp
     */
    protected checkAndPatch(ngImportArrayExp: ts.ArrayLiteralExpression): void;
    protected traverseTsAst(ast: ts.Node, level?: number): void;
    protected appendNgImports(): void;
    protected moduleInfoFromStr(desc: string): {
        moduleName: string;
        exportName: string;
    };
}
