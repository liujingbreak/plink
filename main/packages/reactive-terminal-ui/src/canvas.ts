/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {EpicFactory, Slice, ofPayloadAction, createSlice, PayloadAction, Action,
  castByActionType, Actions} from '@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit-hook';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

type TerminalCanvas = {
  lines: string[];
  width: number;
  height: number;
  error?: Error;
};

const reducers = {
  resize(s: TerminalCanvas, width: number, height: number) {
    s.width = width;
    s.height = height;
  },
  autoFit(_s: TerminalCanvas) { }
};

const initialState: TerminalCanvas = {
  lines: [],
  width: 0,
  height: 0
};

const slice = createSlice({
  name: 'TerminalCanvas',
  initialState,
  reducers
});

slice.addEpic(slice => {
  const dispatcher = slice.actionDispatcher;
  return action$ => {
    const actionByType = castByActionType(slice.actions, action$);
    return rx.merge(
      actionByType.autoFit.pipe(
        op.tap(() => {
          dispatcher.resize(process.stdout.columns, process.stdout.rows);
        })
      )
    ).pipe(
      op.ignoreElements()
    );
  };
});

export {slice as canvasSlice};

