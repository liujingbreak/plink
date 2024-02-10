import {LoaderDefinitionFunction} from 'webpack';
import * as rx from 'rxjs';
import _ from 'lodash';
import {arrayBuffer2str} from '@wfh/reactivizer';
// import {markdownToHtml} from './markdown-util';
import {markdownProcessor, setupBroker} from './markdown-processor-main';
// require('node:inspector').open(9222, 'localhost', true);

const broker = setupBroker(false);
const {i, o} = markdownProcessor;

const markdownLoader: LoaderDefinitionFunction = function(source, sourceMap) {
  const cb = this.async();
  const importCode = [] as string[];
  let imgIdx = 0;

  broker.outputTable.l.newWorkerReady.pipe(
    rx.mergeMap(([, _workerNo, workerOutput, workerInput]) => rx.merge(
      workerOutput.pt.imageToBeResolved.pipe(
        rx.tap(([m, imgSrc, _file]) => {
          try {
            const url = imgSrc.startsWith('.') ? imgSrc : './' + imgSrc;
            importCode.push(`import imgSrc${imgIdx} from '${url}';`);
            workerInput.ft.imageResolved('imgSrc' + (imgIdx++)).dp(m);
          } catch (e) {
            markdownProcessor.dispatchErrorFor(e, m);
          }
        })
      ),
      workerOutput.pt.linkToBeResolved.pipe(
        rx.tap(([m, href, _file]) => {
          const matched = /([^/]+)\.md$/.exec(href);
          if (matched?.[1]) {
            workerInput.ft.linkResolved(JSON.stringify(matched[1])).dp(m);
            return;
          }
          workerInput.ft.linkResolved(JSON.stringify(href)).dp(m);
        })
      )
    )),
    rx.takeUntil(i.ft.forkProcessFile(source, this.resourcePath).do(o.at.processFileDone).pipe(
      rx.take(1),
      rx.tap(([, {resultHtml, toc, mermaid}]) => {
        cb(null, importCode.join('\n') + '\nconst html = ' + arrayBuffer2str(resultHtml) +
          ';\nlet toc = ' + JSON.stringify(toc) +
          ';\nlet mermaids = ' + JSON.stringify(mermaid.map(item => arrayBuffer2str(item))) + ';' +
          ';\nlet m = {html, toc, mermaids};\nexport default m;\n',
        sourceMap
        );
      }),
      rx.catchError(err => {
        cb(err, JSON.stringify(err), sourceMap);
        return rx.EMPTY;
      })
    ))
  ).subscribe();
};

export default markdownLoader;

