import {createActionStreamByType} from '@wfh/redux-toolkit-observable/rx-utils';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import {LoaderRecivedData} from '@wfh/doc-ui-common/isom/md-types';

export interface MarkdownState {
  /** value is markdown url */
  fileLoader: {[key: string]: () => Promise<LoaderRecivedData> | LoaderRecivedData};
  contents: {[key: string]: LoaderRecivedData};
  computed: {
    reactHtml: {[key: string]: {__html: string}};
  };
}

type Actions = {
  registerFiles(payload: MarkdownState['fileLoader']): void;
  getHtml(key: string): void;
  getHtmlDone(data: {key: string; data: LoaderRecivedData}): void;
};

const store = new rx.BehaviorSubject<MarkdownState>({
  fileLoader: {},
  contents: {},
  computed: {reactHtml: {}}
});
const control = createActionStreamByType<Actions>();
const sub = rx.merge(
  control.actionOfType('registerFiles').pipe(
    op.map(({payload}) => {
      const state = store.getValue();
      store.next({...state, fileLoader: {...state.fileLoader, ...payload}});
    })
  ),
  control.actionOfType('getHtml').pipe(
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
  ),
  control.actionOfType('getHtmlDone').pipe(
    op.map(({payload: {key, data}}) => {
      const state = {...store.getValue()};
      state.contents[key] = data;
      state.computed.reactHtml[key] = {__html: data.html};
      store.next(state);
    })
  )
).pipe(
  op.catchError((ex, src) => {
    // tslint:disable-next-line: no-console
    console.error(ex);
    // gService.toastAction('网络错误\n' + ex.message);
    return src;
  })
).subscribe();

export const dispatcher = control.dispatcher;
export function getState() {
  return store.getValue();
}

export function getStore() {
  return store;
}

if (module.hot) {
  module.hot.dispose(_data => {
    sub.unsubscribe();
    // stateFactory.removeSlice(markdownSlice);
    // releaseEpic();
  });
}
