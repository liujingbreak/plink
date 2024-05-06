import ts from 'typescript';
export declare function printFile(fileName: string): void;
export interface WalkCallback {
    query: string;
    callback: (ast: ts.Node, path: string[], parents?: ts.Node[]) => true | void;
}
export default class Selector {
    src: ts.SourceFile;
    constructor(src: string, file: string);
    constructor(src: ts.SourceFile);
    walkAst(handlers: WalkCallback[]): void;
    walkAst(ast: ts.Node, handlers: WalkCallback[]): void;
    /**
     *
     * @param query Like CSS select := ["^"] <selector element> (" " | ">") <selector element>
     *   where <selector element> := "." <property name> <index>? | ":" <Typescript Syntax kind name> | *
     *   where <index> := "[" "0"-"9" "]"
     *
     * e.g.
     *  - .elements:ImportSpecifier > .name
     *  - .elements[2] > .name
     *  - ^.statements[0] :ImportSpecifier > :Identifier
     * Begining with "^" means strictly comparing from first queried AST node
     * @param callback
     */
    findWith<T>(query: string, callback: (ast: ts.Node, path: string[], parents: ts.Node[]) => T): T | null;
    findWith<T>(ast: ts.Node, query: string, callback: (ast: ts.Node, path: string[], parents: ts.Node[]) => T): T | null;
    /**
     *
     * @param ast root AST node
     * @param query Like CSS select := ["^"] <selector element> (" " | ">") <selector element>
     *   where <selector element> := "." <property name> <index>? | ":" <Typescript Syntax kind name> | *
     *   where <index> := "[" "0"-"9" "]"
     * e.g.
     *  - .elements:ImportSpecifier > .name
     *  - .elements[2] > .name
     *  - .statements[0] :ImportSpecifier > :Identifier
     */
    findAll(query: string): ts.Node[];
    findAll(ast: ts.Node, query: string): ts.Node[];
    /**
     *
     * @param ast root AST node
     * @param query Like CSS select := ["^"] <selector element> (" " | ">") <selector element>
     *   where <selector element> := "." <property name> <index>? | ":" <Typescript Syntax kind name> | *
     *   where <index> := "[" "0"-"9" "]"
     * e.g.
     *  - .elements:ImportSpecifier > .name
     *  - .elements[2] > .name
     *  - .statements[0] :ImportSpecifier > :Identifier
     */
    findFirst(query: string): ts.Node | undefined;
    findFirst(ast: ts.Node, query: string): ts.Node | undefined;
    list(ast?: ts.Node): string;
    printAll(ast?: ts.Node): void;
    printAllNoType(ast?: ts.Node): void;
    /**
     *
     * @param ast
     * @param cb return true to skip traversing child node
     * @param level default 0
     */
    traverse(ast: ts.Node, cb: (ast: ts.Node, path: string[], parents: ts.Node[], isLeaf: boolean) => true | void, propName?: string, parents?: ts.Node[], pathEls?: string[]): void;
    pathForAst(ast: ts.Node): string;
    protected propNameForAst(ast: ts.Node): string;
    protected traverseArray(nodes: ts.NodeArray<ts.Node>, cb: (ast: ts.Node, path: string[], parents: ts.Node[], isLeaf: boolean) => true | void, propName?: string, parents?: ts.Node[], pathEls?: string[]): void;
}
export interface AstCharacter {
    propertyName?: string;
    propIndex?: number;
    kind?: string;
}
export interface AstQuery extends AstCharacter {
    text?: RegExp;
}
export declare class Query {
    queryPaths: AstCharacter[][];
    private fromRoot;
    constructor(query: string);
    matches(path: string[]): boolean;
    protected _parseDesc(singleAstDesc: string): AstQuery;
    private matchesAst;
    /**
     * predicte if it matches ">" connected path expression
     * @param queryNodes all items in reversed order
     * @param path
     * @param testPos starts with path.length - 1
     */
    private matchesConsecutiveNodes;
}
