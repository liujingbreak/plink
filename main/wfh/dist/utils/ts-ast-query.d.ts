import ts from 'typescript';
export { ts as typescript };
export declare let astSchemaCache: {
    [kind: string]: string[];
};
export declare function saveAstPropertyCache(file: string): void;
export declare function setAstPropertyCache(cache: typeof astSchemaCache): void;
export declare type AstHandler<T> = (ast: ts.Node, path: string[], parents: ts.Node[], isLeaf: boolean) => T;
/**
 * @returns true - make iteration stops, `SKIP` - to skip interating child nodes (move on to next sibling node)
 */
export declare type traverseCbType = (ast: ts.Node, path: string[], parents: ts.Node[], isLeaf: boolean, comment?: string) => 'SKIP' | boolean | void;
export declare function printFile(file: string, query?: string | null, withType?: boolean): void;
export interface WalkCallback {
    query: string;
    callback: (ast: ts.Node, path: string[], parents?: ts.Node[]) => true | void;
}
export default class Selector {
    src: ts.SourceFile;
    constructor(src: string, file: string);
    constructor(src: ts.SourceFile);
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
     * @param cb return true to skip rest nodes
     */
    some(ast?: ts.Node | null, query?: string | null, cb?: traverseCbType | null): boolean;
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
     * Begining with "^" meaning strictly matching starts with root node
       * @param callback
       */
    findMapTo<T>(query: string, callback: AstHandler<T>): T | null;
    findMapTo<T>(ast: ts.Node, query: string, callback: AstHandler<T>): T | null;
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
       * @param cb return true to skip traversing child node and remaining sibling nodes
       * @param level default 0
     * @returns true - stop traverse remaining nodes
       */
    traverse(ast: ts.Node, cb: traverseCbType, propName?: string, parents?: ts.Node[], pathEls?: string[]): boolean;
    pathForAst(ast: ts.Node, withType?: boolean): string;
    protected propNameForAst(ast: ts.Node): string | null;
    protected traverseArray(nodes: ts.NodeArray<ts.Node> | ts.Node[], cb: traverseCbType, propName?: string, parents?: ts.Node[], pathEls?: string[]): boolean;
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
