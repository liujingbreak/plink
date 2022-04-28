/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {createSlice, castByActionType} from '@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit-hook';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

export const FULLWIDTH_CHARCODE_BEGIN = 0x3400;

type PrintSetting = {
  x: number;
  y: number;
  color?: string;
};

const SETTING_PROPS: Array<keyof PrintSetting> = [
  'color', 'x', 'y'];

type TerminalCanvas = {
  lines: Uint16Array[];
  width: number;
  height: number;

  settings: PrintSetting[];
  error?: Error;
} & PrintSetting;

const reducers = {
  resize(s: TerminalCanvas, width: number, height: number) {
    s.width = width;
    s.height = height;
    s.lines = new Array<Uint16Array>(s.height);

    for (let i = 0, l = s.height; i < l; i++) {
      const line = s.lines[i] = new Uint16Array(width);
      line.fill(0);
    }
  },
  changeSetting(s: TerminalCanvas, setting: Partial<PrintSetting>) {
    Object.assign(s, setting);
  },
  autoFit(_s: TerminalCanvas) { },
  print(s: TerminalCanvas, _text: string, _relativeX: number, _relativeY: number) {
  },
  _lineUpdated(_s: TerminalCanvas, lineIdx: number) {},
  save(s: TerminalCanvas) {
    const setting = {} as Record<keyof PrintSetting, PrintSetting[keyof PrintSetting]>;
    for (const p of SETTING_PROPS) {
      setting[p] = s[p];
    }
    s.settings.push(setting as PrintSetting);
  },
  reload(s: TerminalCanvas) {
    const setting = s.settings.pop();
    if (setting) {
      return Object.assign({}, s, setting);
    }
  }
};

const initialState: TerminalCanvas = {
  x: 0, y: 0,
  lines: [],
  width: 0,
  height: 0,
  settings: []
};

const slice = createSlice({
  name: 'TerminalCanvas',
  initialState,
  reducers
});

if (process.stdout.isTTY) {
  process.stdout.on('resize', () => {
    slice.actionDispatcher.resize(process.stdout.columns, process.stdout.rows);
  });
}

slice.addEpic(slice => {
  const dispatcher = slice.actionDispatcher;
  const stdout = process.stdout;
  return action$ => {
    const actionByType = castByActionType(slice.actions, action$);
    return rx.merge(
      actionByType.autoFit.pipe(
        op.tap(() => {
          dispatcher.resize(process.stdout.columns, process.stdout.rows);
        })
      ),
      actionByType.print.pipe(
        op.tap(({payload: [text, x, y]}) => {
          const state = slice.getState();
          stdout.cursorTo(
            state.x + (x == null ? 0 : x),
            state.y + (y == null ? 0 : y)
          );
          stdout.write(text);
        })
      ),
      actionByType._lineUpdated.pipe(
        op.map(({payload: line}) => line),
        op.distinctUntilChanged(),
        op.bufferTime(250),
        op.filter(lines => lines.length > 0),
        op.map(lines => {
          for (const line of lines) {
            stdout.cursorTo(0, line);
            stdout.clearLine(0);
            // stdout.write(text);
          }
        })
      )
    ).pipe(
      op.ignoreElements()
    );
  };
});

/**
Block                                   Range       Comment
CJK Unified Ideographs                  4E00-9FFF   Common
CJK Unified Ideographs Extension A      3400-4DBF   Rare
CJK Unified Ideographs Extension B      20000-2A6DF Rare, historic
CJK Unified Ideographs Extension C      2A700–2B73F Rare, historic
CJK Unified Ideographs Extension D      2B740–2B81F Uncommon, some in current use
CJK Unified Ideographs Extension E      2B820–2CEAF Rare, historic
CJK Compatibility Ideographs            F900-FAFF   Duplicates, unifiable variants, corporate characters
CJK Compatibility Ideographs Supplement 2F800-2FA1F Unifiable variants
*/
const CJK_CODE_RANGE = [
  [0x4E00, 0x9FFF],
  [0x3400, 0x4DBF],
  [0x20000, 0x2A6DF]
];

/**
 * Simply guessing any code point that is greater than 16-bit (might be Surrogate pairs) is full-width character,
 * and code point within CJK range is also full-width
 */
function isCodePointFullWidth(codePoint: number) {
  return codePoint > 0xffff || CJK_CODE_RANGE.some(([low, high]) => codePoint >= low && codePoint <= high);
}

export {slice as canvasSlice};

