import Path from 'node:path';
import fs from 'fs';
import * as rx from 'rxjs';
import {ExtensionContext, log4File} from '@wfh/plink';
import md5 from 'md5';
import {arrayBuffer2str, ReactorCompositeMergeType2, SingleActionFactory} from '@wfh/reactivizer';
import {MarkdownProcessor} from '../isom/markdown-process-common';
import {markdownProcessor, setupBroker} from './markdown-processor-main';

type LocalMarkdownActions = {
  loadFile(filePath: string, host: string): SingleActionFactory;
};

type LocalMarkdownEvents = {
  fileLoaded(content: string): SingleActionFactory;
};

const log = log4File(__filename);

export function activate(ctx: ExtensionContext) {
  const router = ctx.router();
  const imgUrl2File = new Map<string, string>();
  const broker = setupBroker(false);
  const {i, o, r} = markdownProcessor as unknown as ReactorCompositeMergeType2<MarkdownProcessor, LocalMarkdownActions, LocalMarkdownEvents>;

  router.get('/markdown-local/md', (req, res) => {
    log.info('load local markdown file', req.query.file, 'context:', ctx.contextPath);

    i.ft.loadFile(req.query.file as string, req.hostname).ddo(o.at.fileLoaded).pipe(
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
    )
      .subscribe();
  });

  router.get('/markdown-local/image/:imgHash', (req, res) => {
    const hash = req.params.imgHash;
    const file = imgUrl2File.get(hash);
    res.contentType('image/' + Path.extname(file!));
    fs.createReadStream(file!).pipe(res);
  });

  r('newWorkerReady(imageToBeResolved, linkToBeResolved) -> imageResolved', broker.outputTable.l.newWorkerReady.pipe(
    rx.mergeMap(([, _workerNo, workerOutput, workerInput]) => rx.merge(
      workerOutput.pt.imageToBeResolved.pipe(
        rx.tap(([m, imgSrc, file]) => {
          try {
            if (!/^\w+:\/\//.test(imgSrc)) {
              const imgFile = Path.resolve(file, imgSrc);
              const hash = btoa(md5(imgFile, {asString: true}));
              const url = '/markdown-local/image/' + hash;
              imgUrl2File.set(hash, imgFile);

              workerInput.ft.imageResolved(url).dp(m);
            } else
              workerInput.ft.imageResolved(imgSrc).dp(m);
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

  r('loadFile', i.pt.loadFile.pipe(
    rx.mergeMap(([m, file]) => fs.promises.readFile(file, 'utf8').then(data => {
      o.ft.fileLoaded(data).dp(m);
    }).catch(err => markdownProcessor.dispatchErrorFor(err, m)))
  ));
}


