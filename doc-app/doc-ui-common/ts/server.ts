import * as rx from 'rxjs';
import {ExtensionContext, log4File} from '@wfh/plink';
import {arrayBuffer2str, ReactorCompositeMergeType2, SingleActionFactory} from '@wfh/reactivizer';
import {MarkdownProcessor} from '../isom/markdown-process-common';
import {markdownProcessor, setupBroker} from './markdown-processor-main';

type LocalMarkdownActions = {
  loadFile(filePath: string): SingleActionFactory;
};

type LocalMarkdownEvents = {
  fileLoaded(content: string): SingleActionFactory;
};

const log = log4File(__filename);
const broker = setupBroker(false);
const {i, o, r} = markdownProcessor as unknown as ReactorCompositeMergeType2<MarkdownProcessor, LocalMarkdownActions, LocalMarkdownEvents>;

export function activate(ctx: ExtensionContext) {
  const router = ctx.router();
  router.get('/markdown-local', (req, res) => {
    log.info('load local markdown file', req.query.file);

    i.ft.loadFile(req.query.file as string).do(o.at.fileLoaded).pipe(
      rx.mergeMap(([, content]) => {
        return i.ft.forkProcessFile(content, req.query.file as string).do(o.at.processFileDone);
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
          log.info('image url', url);
          workerInput.ft.imageResolved('TODO').dp(m);
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
  ))
));

