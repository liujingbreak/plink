import {ReactorComposite} from '@wfh/reactivizer';
import * as rx from 'rxjs';
import {LoaderRecivedData} from '@wfh/doc-ui-common/isom/md-types';

type FileRegister = {[key: string]: () => Promise<LoaderRecivedData> | LoaderRecivedData};

type Actions = {
  registerFiles(payload: FileRegister): void;
  getHtml(key: string): void;
};

const inputTableFor = ['registerFiles'] as const;

type Events = {
  filesRegistered(loader: {[key: string]: () => Promise<LoaderRecivedData> | LoaderRecivedData}): void;
  htmlDone(key: string, data: LoaderRecivedData): void;
  htmlByKey(byKey: Map<string, LoaderRecivedData>): void;
};

const outputTableFor = ['filesRegistered', 'htmlByKey'] as const;

const composite = new ReactorComposite<Actions, Events, typeof inputTableFor, typeof outputTableFor>({
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
    o.dpf.filesRegistered(m, files);
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
      o.dpf.htmlDone(m, key, data);
      const map = outputTable.getData().htmlByKey[0]!;
      map.set(key, data);
      o.dpf.htmlByKey(m, map);
    })
  ))
));

o.dp.htmlByKey(new Map());

export {composite as markdownsControl};

if (module.hot) {
  module.hot.dispose(_data => {
    composite.destory();
  });
}
