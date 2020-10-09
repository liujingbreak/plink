import * as ts from 'typescript';
import { ReplacementInf } from '@wfh/plink/wfh/dist/utils/patch-text';
export interface ImportClauseTranspileOptions {
    modules: Array<RegExp | string>;
}
export default class ImportClauseTranspile {
    options: ImportClauseTranspileOptions;
    moduleSet: Set<string>;
    moduleRegs: RegExp[];
    constructor(opts?: ImportClauseTranspileOptions);
    parse(ast: ts.SourceFile, replacements: ReplacementInf[]): void;
}
