import Path from 'node:path';
import {LoaderDefinitionFunction} from 'webpack';
import * as rx from 'rxjs';
import _ from 'lodash';
import {arrayBuffer2str} from '@wfh/reactivizer';
import {log4File} from '@wfh/plink';
import {digestSha1} from './markdown-util';
import {markdownProcessor, setupBroker} from './markdown-processor-main';

const log = log4File(__filename);
const broker = setupBroker(false);
const {i, o} = markdownProcessor;

type ProcessStateOfFile = {
  importCode: string[];
  imgIdx: number;
  links: [hash: string, url: string][];
};

const processStateByFile = new Map<string, ProcessStateOfFile>();

broker.r('newWorkerReady, (imageToBeResolved, linkToBeResolved)',
  broker.outputTable.l.newWorkerReady.pipe(
    rx.mergeMap(([, _workerNo, workerOutput, workerInput]) => rx.merge(
      workerOutput.pt.imageToBeResolved.pipe(
        rx.tap(([m, imgSrc, file]) => {
          try {
            const state = processStateByFile.get(file)!;
            const {importCode, imgIdx} = state;
            const url = imgSrc.startsWith('.') ? imgSrc : './' + imgSrc;
            importCode.push(`import imgSrc${imgIdx} from '${url}';`);
            workerInput.ft.imageResolved('imgSrc' + imgIdx).dp(m);
            state.imgIdx++;
          } catch (e) {
            markdownProcessor.dispatchErrorFor(e, m);
          }
        })
      ),
      workerOutput.pt.linkToBeResolved.pipe(
        rx.mergeMap(async ([m, href, file]) => {
          const matched = /^(?:\w+:)?\/\//.exec(href);
          const state = processStateByFile.get(file)!;
          if (matched == null) {
            const mdMatch = /^(.*?)\.md$/.exec(href);
            if (mdMatch) {
              const absFile = Path.resolve(Path.dirname(file), href).replace(/\\/g, '/');
              const hash = await digestSha1(absFile);
              workerInput.ft.linkResolved(hash).dp(m);
              state.links.push([hash, absFile]);
              return;
            }
          }
          workerInput.ft.linkResolved().dp(m);
        })
      )
    ))
  )
);

const markdownLoader: LoaderDefinitionFunction = function(source, sourceMap) {
  const cb = this.async();
  processStateByFile.set(this.resourcePath, {importCode: [], imgIdx: 0, links: []});

  i.ft.forkProcessFile(source, this.resourcePath).ddo(o.at.processFileDone).pipe(
    rx.take(1),
    rx.tap(([, {resultHtml, toc, mermaid}]) => {
      const {importCode, links} = processStateByFile.get(this.resourcePath)!;
      cb(null, importCode.join('\n') + '\nconst html = ' + arrayBuffer2str(resultHtml) +
          ';\nlet toc = ' + JSON.stringify(toc) +
          ';\nlet mermaids = ' + JSON.stringify(mermaid.map(item => arrayBuffer2str(item))) + ';' +
          ';\nlet links = {' +
          links.map(([hash, absFile], i) => {
            let linkPath = Path.relative(this.context, absFile).replace(/\\/g, '/');
            if (!linkPath.startsWith('.'))
              linkPath = './' + linkPath;
            log.info('link:', linkPath);
            return `${i > 0 ? ',' : ''}\n\r'${hash}': () => import('@wfh/reactivizer/whatever.js!=!@wfh/doc-ui-common/dist/markdown-loader!${linkPath}').then(res => res.default)`;
          }).join('') + '\n}' +
          ';\nlet m = {html, toc, mermaids, links};\nexport default m;\n',
      sourceMap
      );
    }),
    rx.catchError(err => {
      cb(err, JSON.stringify(err), sourceMap);
      return rx.EMPTY;
    }),
    rx.finalize(() => {
      processStateByFile.delete(this.resourcePath);
    })
  ).subscribe();
};

export default markdownLoader;

