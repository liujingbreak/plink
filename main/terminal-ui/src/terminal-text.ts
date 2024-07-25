import * as rx from 'rxjs';
import {vec2} from 'gl-matrix';
import {SimplexReactorExtendType, SingleActionFactory, CoreOptsOfExtSmplxRctr} from '@wfh/reactivizer';
import {conciseNocolorConsoleLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {getTextDisplayUnits, TextStyle} from './terminal-canvas';
import {createBase, BaseWidget} from './terminal-widget';
import {isCodePointFullWidth, createWordSplitter} from './text-split';

export interface MultiLineTextActions {
  setContent(text: string): SingleActionFactory;
  setStyle(style: TextStyle): SingleActionFactory;
  // events

  onDisplayLines(lines: number[][]): SingleActionFactory;
  /** display cache for specific width */
  onDisplayLinesForWidth(width?: number | null, lines?: number[][]): SingleActionFactory;
  onDisplayLinesForPrefSize(lines: number[][]): SingleActionFactory;
  onStyleWithParentBg(style: TextStyle): SingleActionFactory;
  // line number is most likely over 5000
}
const tableForMultiLineText = ['setContent', 'setStyle', 'onDisplayLines', 'onDisplayLinesForWidth', 'onDisplayLinesForPrefSize', 'onStyleWithParentBg'] as const;
export type MultiLineTextWidget = SimplexReactorExtendType<
BaseWidget, MultiLineTextActions, typeof tableForMultiLineText
>;

export function createTextWidget(initialText = '', opts?: CoreOptsOfExtSmplxRctr<BaseWidget, MultiLineTextActions>) {
  const service = createBase().config<MultiLineTextActions, typeof tableForMultiLineText>({
    name: 'text', tableFor: tableForMultiLineText,
    log: conciseNocolorConsoleLogger,
    ...opts
  });
  const spliter = createWordSplitter({debug: false, log: opts?.log});
  const {r, s, table} = service;
  r('onRender', s.pt.onRender.pipe(
    rx.filter(([, , , needRerender]) => needRerender),
    rx.withLatestFrom(table.l.onDisplayLines, table.l.onStyleWithParentBg, table.l.onSize, table.l.overflow),
    rx.map(([[m, canvas, trans], [, lines], [, style], [, width, height], [, overflow]]) => {
      const leftop = [0, 0] as vec2;
      const [x, y0] = vec2.transformMat4(leftop, leftop, trans);
      const lineCnt = Math.min(height, lines.length);
      for (let i = 0, l = lineCnt; i < l; i++) {
        // canvas.log('>>>', String.fromCodePoint(...lines[i]));
        canvas.s.ft.addDisplayUnits(x, y0 + i, lines[i], style).dp(m);
      }
      if (overflow)
        canvas.s.ft.addString(x + width - 3, lineCnt - 1, '...').dp(m);
    })
  ));
  r('querySizeOf, preferredSize -> prefHeightFor, prefWidthFor, onDisplayLinesForWidth', s.pt.querySizeOf.pipe(
    rx.withLatestFrom(table.l.preferredSize, table.l.setContent),
    rx.mergeMap(([[m, width, height], [, prefWidth, _prefHeight], [, content]]) => {
      if (height != null) {
        if (height < 0)
          throw new Error('querySizeOf can not accept negative parameter');
        s.ft.prefWidthFor(prefWidth, height).dp(m);
        return rx.EMPTY;
      } else if (width != null) {
        if (width < 0) {
          throw new Error('querySizeOf can not accept negative parameter');
        }
        const [prevWidth, prevLines] = table.getData().onDisplayLinesForWidth;
        if (prevWidth === width && prevLines) {
          s.ft.prefHeightFor(width, prevLines.length).dp(m);
          return rx.EMPTY;
        } else {
          return textInConstrainedWidth(width, content).pipe(
            rx.mergeMap(([countLines, lines$]) => {
              s.ft.prefHeightFor(width, countLines).dp(m);
              return lines$;
            }),
            rx.reduce((lines, it) => {
              lines.push(it);
              return lines;
            }, [] as number[][]),
            rx.map(lines => {
              s.ft.onDisplayLinesForWidth(width, lines).dp(m);
              return null;
            })
          );
        }
      } else {
        return rx.EMPTY;
      }
    })
  ));
  r('onSize, setContent -> preferredSize, onDisplayLines, overflow, onDisplayLinesForWidth', rx.combineLatest([
    table.l.onSize.pipe(
      rx.distinctUntilChanged(([, aw, ah], [, bw, bh]) => aw === bw && ah === bh)
    ),
    table.l.setContent.pipe(
      rx.map(([m, content]) => {
        const [lines, maxWidth] = preferLayoutText(content);
        s.ft.onDisplayLinesForWidth().dp(m);
        s.ft.preferredSize(maxWidth, lines.length).dp(m);
        const linesForPrefSize = lines.map(line => [...getTextDisplayUnits(line)]);
        s.ft.onDisplayLinesForPrefSize(linesForPrefSize).dp(m);
        return [m, maxWidth, lines.length, linesForPrefSize] as const;
      })
    )
  ]).pipe(
    rx.mergeMap(([[m, width, height], [, prefWidth, prefHeight, linesOfPrefSize]]) => {
      // service.log('======', width, height, prefWidth, prefHeight, linesOfPrefSize);
      if (width === 0) {
        s.ft.onDisplayLines([]).dp(m);
        s.ft.overflow(false).dp(m);
        return rx.EMPTY;
      }
      const [cachedWidth, cachedLines] = table.getData().onDisplayLinesForWidth;
      if (cachedWidth === width && cachedLines) {
        s.ft.onDisplayLines(cachedLines).dp(m);
        s.ft.overflow(cachedLines.length > height).dp(m);
        return rx.EMPTY;
      } else if (width > prefWidth) {
        s.ft.onDisplayLines(linesOfPrefSize).dp(m);
        s.ft.overflow(prefHeight > height).dp(m);
        return rx.EMPTY;
      } else {
        return s.ft.querySizeOf(width, null).re(m).od(s.pt.onDisplayLinesForWidth).pipe(
          rx.map(([, , lines]) => {
            s.ft.overflow(lines!.length > height).dp(m);
            s.ft.onDisplayLines(lines!).dp(m);
          })
        );
      }
    })
  ));
  r('setParent, setStyle, parent.setBackground -> onStyleWithParentBg', rx.combineLatest([
    table.l.setParent.pipe(
      rx.switchMap(([, parent]) => parent ? parent.table.l.onBgChangeWithParent : rx.of([null, null] as const))
    ),
    table.l.setStyle
  ]).pipe(
    rx.map(([[m, pBg], [m2, style]]) => {
      if (m && pBg)
        s.ft.onStyleWithParentBg([...style, pBg]).dp(m, m2);
      else
        s.ft.onStyleWithParentBg(style).dp(m2);
    })
  ));
  r('init', new rx.Observable<never>(() => {
    s.ft.addRerenderAction(s.pt.setContent).dp();
    s.ft.addRerenderAction(s.pt.setStyle).dp();
    s.ft.preferredSize(0, 0).dp();
    s.ft.onSize(0, 0).dp();
    s.ft.setParent(null).dp();
    s.ft.overflow(false).dp();
    s.ft.setStyle([]).dp();
    s.ft.setContent(initialText).dp();
  }));

  function preferLayoutText(content: string) {
    const lines = content.split(/\r?\n/, 5000);
    let maxWidth = 0;
    let lineIdx = 0;
    for (const line of lines) {
      if (lineIdx > 5000)
        break;
      let width = 0;
      for (const char of line) {
        const codePoint = char.codePointAt(0);
        width += codePoint ? (isCodePointFullWidth(codePoint) ? 2 : 1) : 0;
      }
      if (width > maxWidth)
        maxWidth = width;
      lineIdx++;
    }
    return [lines, maxWidth] as const;
  }

  function textInConstrainedWidth(width: number, content: string): rx.Observable<readonly [number, rx.Observable<number[]>]> {
    const lines$ = new rx.ReplaySubject<number[]>();
    let columnOffset = 0;
    let currLine = [] as number [];

    return spliter.s.ft.setTextToSplit(content).od(spliter.s.pt.onWordRecorded).pipe(
      rx.take(1),
      rx.mergeMap(([, word$]) => word$),
      // in case length of single word is bigger than constrained width
      rx.concatMap(word => {
        const [text, type, displayLength] = word;
        if (type === 'a' && displayLength > width) {
          if (width <= 1)
            return rx.from(word[0].map(code => [[code], word[1], word[2]] as const));
          else
            return new rx.Observable<typeof word>(sub => {
              let offset = 0;
              const remainingLen = displayLength - width;
              while (offset < remainingLen) {
                const chopped = text.slice(offset, offset + width - 1);
                chopped.push('-'.codePointAt(0)!);
                offset += width - 1;
                sub.next([chopped, type, width] as const);
              }
              if (offset < (text.length - 1)) {
                sub.next([text.slice(offset), type, text.length - offset] as const);
              }
              sub.complete();
            });
        } else {
          return rx.of(word);
        }
      }),
      rx.reduce((countLines, [word, type, displayLength]) => {
        if (type === 'n') {
          countLines++;
          lines$.next(currLine);
          currLine = [];
          columnOffset = 0;
        } else if (columnOffset + displayLength > width) {
          countLines++;
          lines$.next(currLine);
          if (type === 's') {
            currLine = [];
            columnOffset = 0;
          } else {
            currLine = word as number[];
            columnOffset = displayLength;
          }
        } else {
          currLine.push(...word);
          columnOffset += displayLength;
        }
        return countLines;
      }, 1),
      rx.map(countLines => {
        if (currLine)
          lines$.next(currLine);
        lines$.complete();
        return [countLines, lines$.asObservable()] as const;
      })
    );
  }
  return service;
}

