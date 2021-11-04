import { PayloadAction } from '@reduxjs/toolkit';
import { stateFactory, ofPayloadAction } from '@wfh/redux-toolkit-observable/es/state-factory-browser';
import {action$Of} from '@wfh/redux-toolkit-observable/es/helper';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import axiosObs from 'axios-observable';
import { LoaderRecivedData } from '@wfh/doc-ui-common/isom/md-types';

export interface MarkdownState {
  /** value is markdown url */
  markdowns: {[key: string]: string};
  contents: {[key: string]: LoaderRecivedData};
  computed: {
    reactHtml: {[key: string]: {__html: string}};
  };
}

const initialState: MarkdownState = {
  markdowns: {},
  contents: {},
  computed: {reactHtml: {}}
};

const markdownSlice = stateFactory.newSlice({
  name: 'markdown',
  initialState,
  reducers: {
    registerFiles(s, {payload}: PayloadAction<MarkdownState['markdowns']>) {
      Object.assign(s.markdowns, payload);
    },
    getHtml(s, action: PayloadAction<string>) {},
    getHtmlDone(s, {payload}: PayloadAction<{key: string; data: LoaderRecivedData}>) {
      s.contents[payload.key] = payload.data;
      s.computed.reactHtml[payload.key] = {__html: payload.data.content};
    }
  }
});

export const dispatcher = stateFactory.bindActionCreators(markdownSlice);

const releaseEpic = stateFactory.addEpic<{Markdown: MarkdownState}>((action$, state$) => {
  return rx.merge(
    action$.pipe(ofPayloadAction(markdownSlice.actions.getHtml),
      op.mergeMap(({payload: key}) => {
        const url = getState().markdowns[key];
        return rx.from(axiosObs.get<LoaderRecivedData>(url))
        .pipe(
          op.map(res => {
            dispatcher.getHtmlDone({key, data: res.data});
          })
        );
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
  module.hot.dispose(data => {
    stateFactory.removeSlice(markdownSlice);
    releaseEpic();
  });
}
