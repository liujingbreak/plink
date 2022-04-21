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
  lines: string[];
  width: number;
  height: number;

  settings: PrintSetting[];
  error?: Error;
} & PrintSetting;

const reducers = {
  resize(s: TerminalCanvas, width: number, height: number) {
    s.width = width;
    s.height = height;
  },
  changeSetting(s: TerminalCanvas, setting: Partial<PrintSetting>) {
    Object.assign(s, setting);
  },
  autoFit(_s: TerminalCanvas) { },
  print(s: TerminalCanvas, _text: string, _relativeX: number, _relativeY: number) {
  },
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
      )
    ).pipe(
      op.ignoreElements()
    );
  };
});

export {slice as canvasSlice};

