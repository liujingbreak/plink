import { Chunk } from '../LLn-parser';
export declare type Token = Chunk<string, string> & {
    text: string;
};
declare enum AstType {
    object = 0,
    array = 1,
    property = 2,
    value = 3
}
export interface Ast {
    type: AstType;
    start: number;
    end: number;
}
export interface ObjectAst extends Ast {
    properties: {
        name: Token;
        value: Ast | Token;
    }[];
}
export interface ArrayAst extends Ast {
    items: Array<Ast | Token>;
}
export declare function isObjectAst(ast: Ast | Token): ast is ObjectAst;
export declare function isArrayAst(ast: Ast | Token): ast is ArrayAst;
export declare function isToken(ast: Ast | Token): ast is Token;
export default function parse(content: string): ObjectAst;
export {};
