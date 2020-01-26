import { Token } from '../LLn-parser';
export default function parse(content: string, onToken?: (token: Token<string>) => void): ObjectAst | undefined;
export { Token };
declare enum AstType {
    object = 0,
    array = 1,
    property = 2,
    value = 3
}
export interface Ast {
    type: AstType;
}
export interface ObjectAst extends Ast {
    properties: {
        name: Token<string>;
        value: Ast | Token<string>;
    }[];
}
export interface ArrayAst extends Ast {
    items: Array<Ast | Token<string>>;
}
export interface ValueAst extends Ast {
    value: Token<string>;
}
