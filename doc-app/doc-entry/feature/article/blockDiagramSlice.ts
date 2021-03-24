import { PayloadAction } from '@reduxjs/toolkit';
import { stateFactory } from '@wfh/redux-toolkit-observable/es/state-factory-browser';
import * as op from 'rxjs/operators';
import {merge} from 'rxjs';

export interface BlockDiagramState {
  [key: string]: Block[];
}

export interface Block {
  title: string;
  type?: 'layer' | 'cell';
  style?: string;
  children?: (Block | string)[];
  content?: string;
  grow?: number;
  /** children in horitontal layout */
  chrInHorizontal?: boolean;
}

const initialState: BlockDiagramState = {
};

const blockDiagramSlice = stateFactory.newSlice({
  name: 'blockDiagram',
  initialState,
  reducers: {
    /** key shoud be value of attribute "data-key" in Markdown file */
    create(s, {payload}: PayloadAction<[key: string, blocks: Block[]]>) {
      // modify state draft
      s[payload[0]] = payload[1];
    }
  }
});

export const dispatcher = stateFactory.bindActionCreators(blockDiagramSlice);

const releaseEpic = stateFactory.addEpic<{BlockDiagram: BlockDiagramState}>((action$, state$) => {

  return merge(
    // action$.pipe(ofPayloadAction(blockDiagramSlice.actions.exampleAction),
    //   op.switchMap(({payload}) => {
    //     return rx.from(Promise.resolve('mock async HTTP request call'));
    //   })
    // ),
    // getStore().pipe(
    //   op.map(s => s.foo),
    //   op.distinctUntilChanged(),
    //   op.map(changedFoo => {
    //     dispatcher._change(s => {
    //       s._computed.bar = 'changed ' + changedFoo;
    //     });
    //   })
    // )
  ).pipe(
    op.catchError((ex, src) => {
      // tslint:disable-next-line: no-console
      console.error(ex);
      // gService.toastAction('网络错误\n' + ex.message);
      return src;
    }),
    op.ignoreElements()
  );
});

export function getState() {
  return stateFactory.sliceState(blockDiagramSlice);
}

export function getStore() {
  return stateFactory.sliceStore(blockDiagramSlice);
}

if (module.hot) {
  module.hot.dispose(data => {
    stateFactory.removeSlice(blockDiagramSlice);
    releaseEpic();
  });
}
