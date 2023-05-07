import { PayloadAction } from '@reduxjs/toolkit';
import { stateFactory, ofPayloadAction } from '@wfh/redux-toolkit-observable/es/state-factory-browser';
import {action$Of} from '@wfh/redux-toolkit-observable/es/helper';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import { LoaderRecivedData } from '@wfh/doc-ui-common/isom/md-types';

export interface MarkdownState {
  /** value is markdown url */
  fileLoader: {[key: string]: () => Promise<LoaderRecivedData> | LoaderRecivedData};
  contents: {[key: string]: LoaderRecivedData};
  computed: {
    reactHtml: {[key: string]: {__html: string}};
  };
}

const initialState: MarkdownState = {
  fileLoader: {},
  contents: {},
  computed: {reactHtml: {}}
};

const markdownSlice = stateFactory.newSlice({
  name: 'markdown',
  initialState,
  reducers: {
    registerFiles(s, {payload}: PayloadAction<MarkdownState['fileLoader']>) {
      Object.assign(s.fileLoader, payload);
    },
    getHtml(_s, _action: PayloadAction<string>) {},
    getHtmlDone(s, {payload}: PayloadAction<{key: string; data: LoaderRecivedData}>) {
      s.contents[payload.key] = payload.data;
      s.computed.reactHtml[payload.key] = {__html: payload.data.html};
    }
  }
});

export const dispatcher = stateFactory.bindActionCreators(markdownSlice);

const releaseEpic = stateFactory.addEpic<{Markdown: MarkdownState}>((action$, _state$) => {
  return rx.merge(
    action$.pipe(ofPayloadAction(markdownSlice.actions.getHtml),
      op.mergeMap(({payload: key}) => {
        const loadFn = getState().fileLoader[key];
        const res = loadFn();
        return typeof (res as LoaderRecivedData)?.html === 'string' ?
          rx.of([key, res as LoaderRecivedData] as const) :
          (res as Promise<LoaderRecivedData>)
            .then(res => ([key, res] as const));
      }),
      op.map(([key, data]) => {
        dispatcher.getHtmlDone({key, data});
      })
    )
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
  return stateFactory.sliceState(markdownSlice);
}

export function getStore() {
  return stateFactory.sliceStore(markdownSlice);
}

export const getHtmlDone = action$Of(stateFactory, markdownSlice.actions.getHtmlDone);

if (module.hot) {
  module.hot.dispose(_data => {
    stateFactory.removeSlice(markdownSlice);
    releaseEpic();
  });
}
