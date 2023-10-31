import * as _ts from 'typescript';
import { FactoryMap } from './factory-map';
import ReplaceRequire from './replace-require';
export declare function parseTs(file: string): void;
export declare class TypescriptParser {
    esReplacer: ReplaceRequire | null;
    ts: typeof _ts;
    srcfile: _ts.SourceFile;
    private _addPatch;
    private _addPatch4Import;
    constructor(esReplacer?: ReplaceRequire | null, ts?: typeof _ts);
    replace(code: string, factoryMaps: FactoryMap[] | FactoryMap, filePath: string, ast?: _ts.SourceFile): {
        replaced: string | null;
        patches: Array<{
            start: number;
            end: number;
            replacement: string;
        }>;
    };
    parseTsSource(source: string, file: string, ast?: _ts.SourceFile): void;
    private traverseTsAst;
}
