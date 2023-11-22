import {ReactorComposite} from '@wfh/reactivizer';
import * as rx from 'rxjs';
import {LoaderRecivedData} from '@wfh/doc-ui-common/isom/md-types';

type FileRegister = {[key: string]: () => Promise<LoaderRecivedData> | LoaderRecivedData};

type Actions = {
  registerFiles(payload: FileRegister): void;
  setMermaidClassName(n: string): void;
  setMarkdownBodyRef(key: string, div: HTMLDivElement | null): void;
  getHtml(key: string): void;
};

const inputTableFor = ['registerFiles', 'setMermaidClassName'] as const;

type Events = {
  filesRegistered(loader: {[key: string]: () => Promise<LoaderRecivedData> | LoaderRecivedData}): void;
  htmlDone(key: string, data: LoaderRecivedData): void;
};

const outputTableFor = ['filesRegistered', 'htmlDone'] as const;

const composite = new ReactorComposite<Actions, Events, typeof inputTableFor, typeof outputTableFor>({
  name: 'Markdown',
  outputTableFor,
  inputTableFor,
  debug: process.env.NODE_ENV === 'development'
});

const {i, o, r, outputTable, inputTable} = composite;

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

let mermaidIdSeed = 0;
const inputForHasKey = i.subForTypes(['getHtml', 'setMarkdownBodyRef']);
r('group markdown by key -> htmlDone', inputForHasKey.groupControllerBy(action => action.p[0]).pipe(
  rx.mergeMap(([ctl]) => {
    return rx.merge(
      ctl.pt.getHtml.pipe(
        rx.mergeMap(([m, key]) => outputTable.l.filesRegistered.pipe(
          rx.take(1),
          rx.mergeMap(async ([, files]) => {
            const res = files[key]();
            return await Promise.resolve(res);
          }),
          rx.tap(data => {
            o.dpf.htmlDone(m, key, data);
          }),
          composite.labelError(`For key: ${key} getHtml -> htmlDone`)
        ))
      ),
      rx.combineLatest([
        ctl.pt.setMarkdownBodyRef.pipe( rx.filter(([, , dom]) => dom != null)),
        outputTable.l.htmlDone.pipe(
          rx.filter(([, key]) => ctl.key === key)
        ),
        inputTable.l.setMermaidClassName
      ]).pipe(
        rx.map(([[, _key, containerDom], [, , data], [, mermaidClassName]]) => {
          containerDom!.innerHTML = data.html;
          return [containerDom!, data.mermaids, mermaidClassName] as const;
        }),
        rx.delay(50),
        rx.tap(([containerDom, mermaidTexts, mermaidClassName]) => {
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          containerDom.querySelectorAll('.language-mermaid').forEach(async (el, idx) => {
            el.id = 'mermaid-diagram-' + mermaidIdSeed++;
            const container = document.createElement('div');
            container.className = mermaidClassName;
            el.parentElement!.insertBefore(container, el);
            // Can not be moved to a Worker, mermaid relies on DOM
            const svgStr = await drawMermaidDiagram(el.id, mermaidTexts[idx]);
            container.innerHTML = svgStr;
          });
        }),
        composite.labelError('setMarkdownBodyRef -> render mermaid')
      )
    );
  })
));

const mermaidInited = false;

async function drawMermaidDiagram(id: string, mermaidStr: string | null): Promise<string> {
  const mermaid = (await import('mermaid')).default;
  if (mermaidStr == null)
    return Promise.resolve('');
  if (!mermaidInited) {
    mermaid.initialize({
      securityLevel: 'loose',
      startOnLoad: false
    });
  }

  try {
    const {svg} = await mermaid.render(id, mermaidStr);
    return svg;
  } catch (err) {
    console.error('Failed to draw mermaid diagram', err);
    return '';
  }
}
export {composite as markdownsControl};

if (module.hot) {
  module.hot.dispose(_data => {
    composite.destory();
  });
}
