import {ReactorComposite} from '@wfh/reactivizer';
import * as rx from 'rxjs';
import {LoaderRecivedData} from '@wfh/doc-ui-common/isom/md-types';

type FileRegister = {[key: string]: () => Promise<LoaderRecivedData> | LoaderRecivedData};

type RegisterActions = {
  registerFiles(payload: FileRegister): void;
};
type RegisterEvents = {
  filesRegistered(loader: {[key: string]: () => Promise<LoaderRecivedData> | LoaderRecivedData}): void;
};
const regInputTableFor = ['registerFiles'] as const;
const regOutputTableFor = ['filesRegistered'] as const;

export const register = new ReactorComposite<RegisterActions, RegisterEvents, typeof regInputTableFor, typeof regOutputTableFor>({
  name: 'markdown register',
  inputTableFor: regInputTableFor,
  outputTableFor: regOutputTableFor,
  debug: process.env.NODE_ENV === 'development'
});

register.r('registerFiles -> filesRegistered', register.i.pt.registerFiles.pipe(
  rx.scan((acc, [m, value]) => {
    acc[0] = m;
    Object.assign(acc[1], value);
    return acc;
  }),
  rx.tap(([m, files]) => {
    register.o.dpf.filesRegistered(m, files);
  })
));

type Actions = {
  setMarkdownBodyRef(key: string, div: HTMLDivElement | null): void;
  getHtml(key: string): void;
};

const inputTableFor = ['setMarkdownBodyRef'] as const;

type Events = {
  getHtmlDone(key: string, data: LoaderRecivedData): void;
};

const outputTableFor = [] as const;

const composite = new ReactorComposite<Actions, Events, typeof inputTableFor, typeof outputTableFor>({
  name: 'Markdown',
  outputTableFor,
  inputTableFor,
  debug: process.env.NODE_ENV === 'development'
});

const {i, o, r} = composite;

r('group markdown by key', i.groupControllerBy(action => action.p[0]).pipe(
  rx.mergeMap(([ctl]) => {
    return rx.merge(
      ctl.pt.getHtml.pipe(
        rx.mergeMap(([m, key]) => register.outputTable.l.filesRegistered.pipe(
          rx.take(1),
          rx.mergeMap(async ([, files]) => {
            const res = files[key]();
            return await Promise.resolve(res);
          }),
          rx.tap(data => {
            o.dpf.getHtmlDone(m, key, data);
          }),
          composite.labelError(`For key: ${key} getHtml -> getHtmlDone`)
        ))
      )
    );
  })
));

export {composite as markdownsControl};

if (module.hot) {
  module.hot.dispose(_data => {
    composite.destory();
  });
}
