import * as ts from 'typescript';
export declare function printFile(fileName: string): void;
export default class Selector {
    src: ts.SourceFile;
    constructor(src: ts.SourceFile | string, file?: string);
    /**
     *
     * @param ast root AST node
     * @param query Like CSS select := <selector element> (" " | ">") <selector element>
     *   where <selector element> := "." <property name> <index>? | ":" <Typescript Syntax kind name> | *
     *   where <index> := "[" "0"-"9" "]"
     * e.g.
     *  - .elements:ImportSpecifier > .name
     *  - .elements[2] > .name
     *  - .statements[0] :ImportSpecifier > :Identifier
     */
    findAll(query: string, ast?: ts.Node): ts.Node[];
    findFirst(query: string, ast?: ts.Node): ts.Node;
    printAll(): void;
    printAllNoType(): void;
    /**
     *
     * @param ast
     * @param cb return true to skip traversing child node
     * @param level default 0
     */
    traverse(ast: ts.Node, cb: (ast: ts.Node, path: string[], parents: ts.Node[], isLeaf: boolean) => boolean | void, propName?: string, parents?: ts.Node[], pathEls?: string[]): void;
    pathForAst(ast: ts.Node): string;
    protected propNameForAst(ast: ts.Node): string;
    protected traverseArray(nodes: ts.NodeArray<ts.Node>, cb: (ast: ts.Node, path: string[], parents: ts.Node[], isLeaf: boolean) => boolean | void, propName?: string, parents?: ts.Node[], pathEls?: string[]): void;
}
export interface AstCharacter {
    propertyName?: string;
    propIndex?: number;
    kind?: string;
    text?: string;
}
export declare class Query {
    queryPaths: AstCharacter[][];
    constructor(query: string);
    matches(path: string[]): boolean;
    protected _parseDesc(singleAstDesc: string): AstCharacter;
    private matchesAst;
    private matchesConsecutiveNodes;
}
