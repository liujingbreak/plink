import * as rx from 'rxjs';
import { InferMapParam, InferPayload, SingleActionFactory, SimplexReactor } from '@wfh/reactivizer';
type CodePointStateType = [codepoint: number, index: number, type: 'a' | 's' | 't' | 'n' | 'f' | '-' | 'o' | 'eof'];
interface WordSplitterActions {
    setTextToSplit(text: string): SingleActionFactory;
    /** 'a' as half width character, 's' as white space, 'f' as full width character, '-' as -1 which is placeholder of previous fullwidth character */
    codePointState(state: CodePointStateType[2], codePoint: number): SingleActionFactory;
    requestToken(...fallBackTokens: InferMapParam<WordSplitterActions['onLexerToken']>[]): SingleActionFactory;
    onLexerToken(type: CodePointStateType[2], codePoints: number[], startIdx: number): SingleActionFactory;
    onWord(wordCodePoints: number[], type: CodePointStateType[2], displayLength: number): SingleActionFactory;
    onWordRecorded(replay$: rx.Observable<InferPayload<WordSplitterActions['onWord']>>): SingleActionFactory;
}
export declare function createWordSplitter(): SimplexReactor<WordSplitterActions, readonly ["requestToken", "onWordRecorded"]>;
export {};
