import * as rx from 'rxjs';
import {ExtensionContext, log4File} from '@wfh/plink';
import {arrayBuffer2str, ReactorCompositeMergeType} from '@wfh/reactivizer';
import {MarkdownProcessor} from '../isom/markdown-process-common';
import {markdownProcessor, setupBroker} from './markdown-processor-main';

type LocalMarkdownActions = {
  loadFile(filePath: string): void;
};

type LocalMarkdownEvents = {
  fileLoaded(content: string): void;
};

const log = log4File(__filename);
const broker = setupBroker(false);
const {i, o, r} = markdownProcessor as unknown as ReactorCompositeMergeType<MarkdownProcessor, LocalMarkdownActions, LocalMarkdownEvents>;

export function activate(ctx: ExtensionContext) {
  const router = ctx.router();
  router.get('/markdown-local', (req, res) => {
    log.info('load local markdown file', req.query.file);

    i.do.loadFile(o.at.fileLoaded, req.query.file as string).pipe(
      rx.mergeMap(([, content]) => {
        return i.do.forkProcessFile(o.at.processFileDone, content, req.query.file as string);
      }),
      rx.tap(([, {resultHtml, toc, mermaid}]) => {
        res.json({
          html: resultHtml,
          toc,
          mermaid: JSON.stringify(mermaid.map(item => arrayBuffer2str(item)))
        });
      }),
      rx.take(1),
      rx.catchError((err) => {
        res.status(400).json(err);
        return rx.EMPTY;
      })
    ).subscribe();
  });
}

r('newWorkerReady(imageToBeResolved, linkToBeResolved) -> imageResolved', broker.outputTable.l.newWorkerReady.pipe(
  rx.mergeMap(([, _workerNo, workerOutput, workerInput]) => rx.merge(
    workerOutput.pt.imageToBeResolved.pipe(
      rx.tap(([m, imgSrc, _file]) => {
        try {
          const url = imgSrc.startsWith('.') ? imgSrc : './' + imgSrc;
          // TODO
          workerInput.dpf.imageResolved(m, 'TODO');
        } catch (e) {
          markdownProcessor.dispatchErrorFor(e, m);
        }
      })
    ),
    workerOutput.pt.linkToBeResolved.pipe(
      rx.tap(([m, href, _file]) => {
        const matched = /([^/]+)\.md$/.exec(href);
        if (matched?.[1]) {
          workerInput.dpf.linkResolved(m, JSON.stringify(matched[1]));
          return;
        }
        workerInput.dpf.linkResolved(m, JSON.stringify(href));
      })
    )
  ))
));

