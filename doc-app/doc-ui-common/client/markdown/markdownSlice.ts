import {ReactorComposite2, SingleActionFactory} from '@wfh/reactivizer';
import * as rx from 'rxjs';
import {LoaderRecivedData} from '@wfh/markdown-base/isom/types';

type FileRegister = {[key: string]: () => Promise<LoaderRecivedData> | LoaderRecivedData};

type Actions = {
  registerFiles(payload: FileRegister): SingleActionFactory;
  getHtml(key: string): SingleActionFactory;
};

const inputTableFor = ['registerFiles'] as const;

type Events = {
  filesRegistered(loader: {[key: string]: () => Promise<LoaderRecivedData> | LoaderRecivedData}): SingleActionFactory;
  htmlDone(key: string, data: LoaderRecivedData): SingleActionFactory;
  htmlByKey(byKey: Map<string, LoaderRecivedData>): SingleActionFactory;
};

const outputTableFor = ['filesRegistered', 'htmlByKey'] as const;

const composite = new ReactorComposite2<Actions, Events, typeof inputTableFor, typeof outputTableFor>({
  name: 'MarkdownSlice',
  outputTableFor,
  inputTableFor,
  debug: process.env.NODE_ENV === 'development'
});

const {i, o, r, outputTable} = composite;

r('registerFiles -> filesRegistered', i.pt.registerFiles.pipe(
  rx.scan((acc, [m, value]) => {
    acc[0] = m;
    Object.assign(acc[1], value);
    return acc;
  }),
  rx.tap(([m, files]) => {
    o.ft.filesRegistered(files).dp(m);
  })
));

r('getHtml -> htmlDone, htmlByKey', i.pt.getHtml.pipe(
  rx.mergeMap(([m, key]) => outputTable.l.filesRegistered.pipe(
    rx.take(1),
    rx.mergeMap(async ([, files]) => {
      const res = files[key]();
      return await Promise.resolve(res);
    }),
    rx.tap(data => {
      o.ft.htmlDone(key, data).dp(m);
      const map = outputTable.getData().htmlByKey[0]!;
      map.set(key, data);
      o.ft.htmlByKey(map).dp(m);
    })
  ))
));

o.ft.htmlByKey(new Map()).dp();

export {composite as markdownsControl};

if (module.hot) {
  module.hot.dispose(_data => {
    composite.dispose();
  });
}
