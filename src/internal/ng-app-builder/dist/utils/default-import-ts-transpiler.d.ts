import * as ts from 'typescript';
import { ReplacementInf } from './patch-text';
export interface ImportClauseTranspileOptions {
    file: string;
    modules: Array<RegExp | string>;
}
export default class ImportClauseTranspile {
    options: ImportClauseTranspileOptions;
    moduleSet: Set<string>;
    moduleRegs: RegExp[];
    constructor(opts?: ImportClauseTranspileOptions);
    parse(ast: ts.SourceFile, replacements: ReplacementInf[]): void;
}
