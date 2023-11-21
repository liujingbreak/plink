import {LoaderDefinitionFunction} from 'webpack';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import _ from 'lodash';
import {arrayBuffer2str} from '@wfh/reactivizer';
// import {markdownToHtml} from './markdown-util';
import {markdownProcessor, setupBroker} from './markdown-processor-main';
// require('node:inspector').open(9222, 'localhost', true);

const markdownLoader: LoaderDefinitionFunction = function(source, sourceMap) {
  const cb = this.async();
  const importCode = [] as string[];
  let imgIdx = 0;
  const broker = setupBroker(false);
  // const logger = this.getLogger('markdown-loader');
  // debugger;

  const {i, o, r} = markdownProcessor;
  r('resolve images', broker.outputTable.l.newWorkerReady.pipe(
    rx.mergeMap(([, _workerNo, workerOutput, workerInput]) => workerOutput.pt.imageToBeResolved.pipe(
      rx.tap(([m, imgSrc, _file]) => {
        const url = imgSrc.startsWith('.') ? imgSrc : './' + imgSrc;
        importCode.push(`import imgSrc${imgIdx} from '${url}';`);
        workerInput.dpf.imageResolved(m, 'imgSrc' + (imgIdx++));
      })
    ))
  ));

  r('resolve links', broker.outputTable.l.newWorkerReady.pipe(
    rx.mergeMap(([, _workerNo, workerOutput, workerInput]) => workerOutput.pt.linkToBeResolved.pipe(
      rx.tap(([m, href, _file]) => {
        // const url = imgSrc.startsWith('.') ? imgSrc : './' + imgSrc;
        // importCode.push(`import imgSrc${imgIdx} from '${url}';`);
        workerInput.dpf.linkResolved(m, href);
      })
    ))
  ));

  r('processFileDone -> ...', i.do.forkProcessFile(o.at.processFileDone, source, this.resourcePath).pipe(
    rx.take(1),
    rx.tap(([, {resultHtml, toc, mermaid}]) => {
      cb(null, importCode.join('\n') + '\nconst html = ' + arrayBuffer2str(resultHtml) +
        ';\nlet toc = ' + JSON.stringify(toc) +
        ';\nlet mermaids = ' + JSON.stringify(mermaid.map(item => arrayBuffer2str(item))) + ';' +
        ';\nlet m = {html, toc, mermaids};\nexport default m;\n',
      sourceMap
      );
    }),
    op.catchError(err => {
      cb(err, JSON.stringify(err), sourceMap);
      return rx.EMPTY;
    })
  ));
  // markdownToHtml(source, this.resourcePath,
  //   imgSrc => {
  //     const url = imgSrc.startsWith('.') ? imgSrc : './' + imgSrc;
  //     importCode.push(`import imgSrc${imgIdx} from '${url}';`);
  //     return Promise.resolve('imgSrc' + (imgIdx++));
  //   })
  //   .pipe(
  //     op.take(1),
  //     op.map(result => {
  //       cb(null,
  //         importCode.join('\n') + '\nconst html = ' + result.content + ';\nlet toc = ' + JSON.stringify(result.toc) + ';\nlet m = {html, toc};\nexport default m;\n', sourceMap);
  //     }),
  //     op.catchError(err => {
  //       cb(err, JSON.stringify(err), sourceMap);
  //       return rx.EMPTY;
  //     })
  //   )
  //   .subscribe();
};

export default markdownLoader;

