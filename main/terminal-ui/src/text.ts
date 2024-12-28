import * as rx from 'rxjs';
import {vec2} from 'gl-matrix';
import {CreateOptsOfFac, SimplexReactorOfFac, SingleActionFactory, CreateOptsInDef} from '@wfh/reactivizer';
import {getTextDisplayUnits, TextStyle} from './canvas';
import {baseComponentFac} from './base';
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
export const textWidgetFac = baseComponentFac.forExtend<MultiLineTextActions, typeof tableForMultiLineText>({
  name: 'text',
  tableFor: tableForMultiLineText
}).interceptorByType(ad => rx.merge(
  ad.at.setContent.pipe(
    rx.distinctUntilChanged(({p: [a]}, {p: [b]}) => a === b)
  ),
  ad.ofOtherTypes()
)).defineReactor((init, initialText: string, opts?: CreateOptsInDef<MultiLineTextActions, typeof baseComponentFac>) => {
  const service = init(opts);
  const spliter = createWordSplitter({debug: false, log: opts?.log});
  const {r, s, ft, pt, table} = service;
  r('onRender', pt.onRender.pipe(
    rx.filter(([, , , needRerender]) => needRerender),
    rx.withLatestFrom(table.l.onDisplayLines, table.l.onStyleWithParentBg, table.l.onSize, table.l.overflow, table.l.onBgChangeWithParent),
    rx.map(([[m, canvas, trans], [, lines], [, style], [, width, height], [, overflow], [, bg]]) => {
      const leftop = [0, 0] as vec2;
      const [x, y0] = vec2.transformMat4(leftop, leftop, trans);
      const lineCnt = Math.min(height, lines.length);
      for (let i = 0, l = lineCnt; i < l; i++) {
        // canvas.log('>>>', String.fromCodePoint(...lines[i]));
        const line = lines[i];
        if (line.length < width) {
          if (bg)
            canvas.ft.addString(x + line.length, y0 + i, ' '.repeat(width - line.length), [bg]).dp(m);
          else
            canvas.ft.clearRect(x + line.length, y0 + i, width - line.length, 1).dp(m);
        }
        canvas.ft.addDisplayUnits(x, y0 + i, lines[i], style).dp(m);
      }
      if (overflow)
        canvas.ft.addString(x + width - 3, y0 + lineCnt - 1, '...').dp(m);
    })
  ));
  r('querySizeOf, preferredSize -> prefHeightFor, prefWidthFor, onDisplayLinesForWidth', pt.querySizeOf.pipe(
    rx.withLatestFrom(table.l.preferredSize, table.l.setContent),
    rx.mergeMap(([[m, width, height], [, prefWidth, _prefHeight], [, content]]) => {
      if (height != null) {
        if (height < 0)
          throw new Error('querySizeOf can not accept negative parameter');
        ft.prefWidthFor(prefWidth, height).dp(m);
        return rx.EMPTY;
      } else if (width != null) {
        if (width < 0) {
          throw new Error('querySizeOf can not accept negative parameter');
        }
        const [prevWidth, prevLines] = table.getData().onDisplayLinesForWidth;
        if (prevWidth === width && prevLines) {
          ft.prefHeightFor(width, prevLines.length).dp(m);
          return rx.EMPTY;
        } else {
          return textInConstrainedWidth(width, content).pipe(
            rx.mergeMap(([countLines, lines$]) => {
              ft.prefHeightFor(width, countLines).dp(m);
              return lines$;
            }),
            rx.reduce((lines, it) => {
              lines.push(it);
              return lines;
            }, [] as number[][]),
            rx.map(lines => {
              ft.onDisplayLinesForWidth(width, lines).dp(m);
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
    table.l.onSize,
    table.l.setContent.pipe(
      rx.map(([m, content]) => {
        const [lines, maxWidth] = preferLayoutText(content);
        ft.onDisplayLinesForWidth().dp(m);
        ft.onContentSizeChange(maxWidth, lines.length).dp(m);
        const linesForPrefSize = lines.map(line => [...getTextDisplayUnits(line)]);
        ft.onDisplayLinesForPrefSize(linesForPrefSize).dp(m);
        return [m, maxWidth, lines.length, linesForPrefSize] as const;
      })
    )
  ]).pipe(
    rx.mergeMap(([[m, width, height], [, prefWidth, prefHeight, linesOfPrefSize]]) => {
      if (width == null || height == null)
        throw new Error(`Error: ${width} or ${height} is not valid value of "onSize [i: ${m.i}, r: ${JSON.stringify(m.r)}]" of ${s.logPrefix}`);
      // service.log('======', width, height, prefWidth, prefHeight, linesOfPrefSize);
      if (width === 0) {
        ft.onDisplayLines([]).dp(m);
        ft.overflow(false).dp(m);
        return rx.EMPTY;
      }
      const [cachedWidth, cachedLines] = table.getData().onDisplayLinesForWidth;
      if (cachedWidth === width && cachedLines) {
        ft.onDisplayLines(cachedLines).dp(m);
        ft.overflow(cachedLines.length > height).dp(m);
        return rx.EMPTY;
      } else if (width > prefWidth) {
        ft.onDisplayLines(linesOfPrefSize).dp(m);
        ft.overflow(prefHeight > height).dp(m);
        return rx.EMPTY;
      } else {
        return ft.querySizeOf(width, null).re(m).od(pt.onDisplayLinesForWidth).pipe(
          rx.map(([, , lines]) => {
            ft.overflow(lines!.length > height).dp(m);
            ft.onDisplayLines(lines!).dp(m);
          })
        );
      }
    })
  ));
  r('setParent, setStyle, parent.setBackground -> onStyleWithParentBg', rx.combineLatest([
    table.l.onBgChangeWithParent,
    table.l.setStyle
  ]).pipe(
    rx.map(([[m, pBg], [m2, style]]) => {
      if (m && pBg)
        ft.onStyleWithParentBg([...style, pBg]).dp(m, m2);
      else
        ft.onStyleWithParentBg(style).dp(m2);
    })
  ));
  const renderData = [
    table.l.setDisplay,
    table.l.onSize.pipe(
      rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2)
    ),
    table.l.setBackground,
    table.l.setContent, table.l.setStyle
  ];
  r('init', new rx.Observable<never>(() => {
    ft.onContentSizeChange(0, 0).dp();
    ft.onSize(0, 0).dp();
    ft.setParent(null).dp();
    ft.overflow(false).dp();
    ft.setStyle([]).dp();
    ft.setContent(initialText).dp();
    ft.setRenderChanges(renderData).dp();
    ft.setFlexShrink(0).dp();
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

    return spliter.ft.setTextToSplit(content).od(spliter.pt.onWordRecorded).pipe(
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
});
export type MultiLineTextWidget = SimplexReactorOfFac<typeof textWidgetFac>;
export type MultiLineTextWidgetOpts = CreateOptsOfFac<typeof textWidgetFac>;
export function createTextWidget(initialText = '', opts?: MultiLineTextWidgetOpts) {
  const service = textWidgetFac.create(initialText, opts);
  return service;
}

