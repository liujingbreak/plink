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
export interface ValueAst extends Ast {
    value: Token;
}
export default function parse(content: string): ObjectAst;
export {};
