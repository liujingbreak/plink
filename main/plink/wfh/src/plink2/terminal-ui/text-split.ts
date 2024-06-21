import * as rx from 'rxjs';
import {InferMapParam, InferPayload, SingleActionFactory, SimplexReactor, actionRelatedToAction} from '@wfh/reactivizer';
import {isCodePointFullWidth} from '../process-common';
type CodePointStateType = [codepoint: number, index: number, type: 'a' | 's' | 't' | 'n' | 'f' | '-' | 'o' | 'eof']; // 'a' -> [a-zA-z], 's' -> white space, 't' -> tab, 'n' -> end of line, 'f' -> full width character, 'o' -> other

interface WordSplitterActions {
  setTextToSplit(text: string): SingleActionFactory;
  /** 'a' as half width character, 's' as white space, 'f' as full width character, '-' as -1 which is placeholder of previous fullwidth character */
  codePointState(state: CodePointStateType[2], codePoint: number): SingleActionFactory;
  requestToken(...fallBackTokens: InferMapParam<WordSplitterActions['onLexerToken']>[]): SingleActionFactory;
  onLexerToken(type: CodePointStateType[2], codePoints: number[], startIdx: number): SingleActionFactory;
  onWord(wordCodePoints: number[], type: CodePointStateType[2], displayLength: number): SingleActionFactory;
  onWordRecorded(replay$: rx.Observable<InferPayload<WordSplitterActions['onWord']>>): SingleActionFactory;
}
const tableForWordSplitter = ['requestToken', 'onWordRecorded'] as const;

const WHITE_SPACE_CODE_POINT = new Set<number>((function* () {
  for (const chr of ' \r')
    yield chr.codePointAt(0)!;
})());

const EOL_CODE_POINT = '\n'.codePointAt(0)!;
const TAB_CODE_POINT = '\t'.codePointAt(0)!;
const LETTERS_CODE_POINT = new Set<number>((function* () {
  for (const chr of 'QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm1234567890')
    yield chr.codePointAt(0)!;
})());
export function createWordSplitter() {
  const service = new SimplexReactor<WordSplitterActions, typeof tableForWordSplitter>({
    debug: false,
    debugExcludeTypes: ['codePointState'],
    tableFor: tableForWordSplitter
  });
  const {r, s, table} = service;
  r('setTextToSplit, codePointState -> onWordRecorded, onLexerToken, codePointState, requestToken, onWord', s.pt.setTextToSplit.pipe(
    rx.switchMap(([m, text]) => {
      let lastState: CodePointStateType[2];
      let lexTokenStart = 0;
      let lexTokenBuf = [] as number[];
      const fallbackableLexToken$ = s.pt.onLexerToken.pipe(
        actionRelatedToAction(m),
        rx.takeWhile(([, type]) => type !== 'eof', true),
        rx.concatMap((tk) => rx.concat(
          rx.of(tk),
          table.l.requestToken.pipe(
            actionRelatedToAction(tk[0]),
            rx.take(1),
            rx.mergeMap(([, ...payloads]) => payloads)
          )
        )),
        rx.observeOn(rx.queueScheduler),
        rx.share()
      );
      const wordRecord$ = new rx.ReplaySubject<[wordCodePoints: number[], type: CodePointStateType[2], displayLength: number]>();
      s.ft.onWordRecorded(wordRecord$).dp(m);
      return rx.merge(
        // 3. word to wordRecord$
        s.pt.onWord.pipe(
          rx.map(([, ...payloads]) => payloads),
          rx.tap(wordRecord$)
        ),
        // 2. lexer token -> onWord
        fallbackableLexToken$.pipe(
          rx.exhaustMap(tk1 => {
            const [m1, type, codePoints] = tk1;
            if (type === 'f') {
              s.ft.requestToken().dp(m1);
              return fallbackableLexToken$.pipe(
                rx.take(1),
                rx.map(tk2 => {
                  const [m2, type2] = tk2;
                  if (type2 !== '-') {
                    // fallback current token
                    s.ft.requestToken(tk2).dp(m1, m2);
                  } else {
                    s.ft.requestToken().dp(m2);
                  }
                  // Each full width character is considered as single "word"
                  for (const cp of codePoints)
                    s.ft.onWord([cp], type, 2).dp(m);
                })
              );
            } else if (type === 't') {
              s.ft.onWord(codePoints, type, 2).dp(m1);
              s.ft.requestToken().dp(m1);
              return rx.EMPTY;
            } else if (type === 'o') {
              for (const cp of codePoints)
                s.ft.onWord([cp], type, 1).dp(m);
              s.ft.requestToken().dp(m1);
              return rx.EMPTY;
            } else if (type === 'eof') {
              wordRecord$.complete();
              return rx.EMPTY;
            } else {
              s.ft.onWord(codePoints, type, codePoints.length).dp(m1);
              s.ft.requestToken().dp(m1);
              return rx.EMPTY;
            }
          }),
          service.catchErrorFor(m)
        ),
        // 1. code point -> lexerToken
        rx.from((function* () {
          for (const c of text)
            yield c.codePointAt(0)!;
        })()).pipe(
          rx.map((codePoint, idx) => {
            let state: CodePointStateType[2];
            if (LETTERS_CODE_POINT.has(codePoint)) {
              state = 'a';
            } else if (WHITE_SPACE_CODE_POINT.has(codePoint)) {
              state = 's';
            } else if (codePoint === -1) {
              state = '-';
            } else if (isCodePointFullWidth(codePoint)) {
              state = 'f';
            } else if (EOL_CODE_POINT === codePoint) {
              state = 'n';
            } else if (TAB_CODE_POINT === codePoint) {
              state = 't';
            } else {
              state = 'o';
            }
            if (state === lastState) {
              lexTokenBuf.push(codePoint);
            } else if (lastState) {
              // If state is distinct from previous one, dispatch "onLexerToken"
              s.ft.onLexerToken(lastState, lexTokenBuf, lexTokenStart).dp(m);
              lastState = state;
              lexTokenStart = idx;
              lexTokenBuf = [codePoint];
            } else {
              // If lastState is null
              lexTokenStart = idx;
              lexTokenBuf = [codePoint];
              lastState = state;
            }
          }),
          rx.finalize(() => {
            if (lastState) {
              s.ft.onLexerToken(lastState, lexTokenBuf, lexTokenStart).dp(m);
            }
            s.ft.onLexerToken('eof', [], -1).dp(m);
          })
        )
      );
    })
  ));
  return service;
}
