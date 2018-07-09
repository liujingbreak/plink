import * as ts from 'typescript';
import { ReplacementInf } from './patch-text';
export interface ImportClauseTranspileOptions {
    defaultImport2require?: boolean;
    modules: string[];
}
export default class ImportClauseTranspile {
    options: ImportClauseTranspileOptions;
    constructor(opts?: ImportClauseTranspileOptions);
    parse(ast: ts.SourceFile, replacements: ReplacementInf[]): void;
}
