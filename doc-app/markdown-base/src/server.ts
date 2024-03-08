import Path from 'node:path';
import fs from 'fs';
import * as rx from 'rxjs';
import {ExtensionContext, log4File, config} from '@wfh/plink';
import hp from 'http-proxy';
import {arrayBuffer2str, ReactorCompositeMergeType2, SingleActionFactory} from '@wfh/reactivizer';
import {createBufferForHttpProxy} from '@wfh/assets-processer/dist/utils';
import {httpProxyObservable} from '@wfh/assets-processer/dist/http-proxy-observable';
import {compressedIncomingMsgToBuffer, compressResponse} from '@wfh/http-server/dist/utils';
import {MarkdownProcessor} from '../isom/markdown-process-common';
import {elementByTagName} from '../isom/markdown-processor-helper';
import {LoaderRecivedData} from '../isom/types';
import {markdownProcessor, setupBroker} from './markdown-processor-plain/markdown-processor-main';

type LocalMarkdownActions = {
  loadFile(filePath: string, host: string): SingleActionFactory;
};

type LocalMarkdownEvents = {
  fileLoaded(data: LoaderRecivedData): SingleActionFactory;
};

const log = log4File(__filename);

export function activate(ctx: ExtensionContext) {
  const router = ctx.router();
  const linksOfFile = new Map<string, Set<string>>();
  const linkIdToFile = new Map<string, string>();
  const imgUrl2File = new Map<string, string>();
  const broker = setupBroker(false);
  const {i, o, r} = markdownProcessor as unknown as ReactorCompositeMergeType2<MarkdownProcessor, LocalMarkdownActions, LocalMarkdownEvents>;

  router.get('/markdown-local/md', (req, res) => {
    log.info('load local markdown file', req.query.file, 'context:', ctx.contextPath);
    linksOfFile.set(req.query.file as string, new Set<string>());

    i.ft.loadFile(req.query.file as string, req.hostname).ddo(o.at.fileLoaded).pipe(
      rx.tap(([, content]) => {
        res.json(content);
      }),
      rx.take(1),
      rx.catchError((err) => {
        res.status(400).json(err);
        return rx.EMPTY;
      })
    ).subscribe();
  });

  router.get('/markdown-local/linked-md/:hash', (req, res) => {
    log.info('load local markdown file by hash', req.params.hash, 'context:', ctx.contextPath);
    const file = linkIdToFile.get(req.params.hash);
    if (file) {
      linksOfFile.set(file, new Set<string>());
      i.ft.loadFile(file, req.hostname).ddo(o.at.fileLoaded).pipe(
        rx.tap(([, content]) => {
          res.json(content);
        }),
        rx.take(1),
        rx.catchError((err) => {
          res.status(400).json(err);
          return rx.EMPTY;
        })
      ).subscribe();
    } else {
      res.status(400).json(new Error(`file of ID: ${req.params.hash} doesn't exist`));
    }
  });

  router.get('/markdown-local/image/:imgHash', (req, res, next) => {
    const hash = req.params.imgHash;
    log.info('GET image', hash);
    const file = imgUrl2File.get(hash);
    res.contentType('image/' + Path.extname(file!));
    const input = fs.createReadStream(file!);
    input.on('error', err => {
      log.error(err);
      next(err);
    });
    input.pipe(res).on('error', err => {
      log.error(err);
      next(err);
    });
  });

  router.get('/probe', (req, res) => {
    const url = new URL('/plink/markdown/local', req.protocol + '://' + req.headers.host);
    url.searchParams.set('nocache', Math.random() + '');
    url.searchParams.set('file', Path.resolve(__dirname, '../__tests__/sample-markdown.md'));
    log.info('redirect to ', url.toString());
    res.redirect(url.toString());
  });

  const devClientServer = config()['@wfh/markdown-base'].markdownDevServer;
  if (devClientServer) {
    log.warn('Proxy static resource request to dev server', devClientServer);
    const proxyServer = hp.createProxy({
      target: devClientServer + '/plink',
      changeOrigin: true,
      ws: true,
      secure: false
    });

    const proxy$ = httpProxyObservable(proxyServer);
    // http://localhost:8080/plink/markdown/local?file=E%3A%5Cdr%5Cplink%5Cdoc-app%5Cdoc-ui-common%5C__tests__%5Csample-markdown.md
    ctx.expressAppUse(app => {
      app.use('/plink', (req, res, next) => {
        const body = createBufferForHttpProxy(req);
        const selfHandleResponse = !/\.\w+$/.test(new URL(req.originalUrl, 'http://whatever').pathname);
        rx.merge(
          proxy$.error.pipe(
            rx.tap(({payload: [err]}) => {
              log.error(err);
              next(err);
            }),
            rx.take(1)
          ),
          selfHandleResponse ?
            proxy$.proxyRes.pipe(
              rx.mergeMap(async ({payload: [pRes]}) => {
                if (/\bhtml\b/i.test(pRes.headers['content-type'] ?? '')) {
                  const buf = await compressedIncomingMsgToBuffer(pRes);
                  let html = buf.toString('utf8');
                  log.warn('Replace HTML', req.originalUrl);
                  for (const [name, value] of Object.entries(pRes.headers)) {
                    if (Array.isArray(value))
                      value.forEach(v => res.setHeader(name, v));
                    else if (value)
                      res.setHeader(name, value);
                  }
                  if (linkIdToFile.size > 0) {
                    html = addDocHashDefInHtml(html,
                      '<script>\nvar __localMarkdownViewLinks = [' +
                        [...linkIdToFile.keys()].map(id => '"' + id + '"').join(', ') +
                        '];</script>'
                    );
                  }
                  res.removeHeader('Content-Length');
                  await compressResponse(html, res, pRes.headers['content-encoding']);

                  // log.info('Response HTML:\n', );
                } else {
                  log.warn('response of ' + req.originalUrl + ' has unexpected content-type of ' + pRes.headers['content-type']);
                  res.status(pRes.statusCode ?? 200);
                  for (const [name, value] of Object.entries(pRes.headers)) {
                    if (Array.isArray(value))
                      value.forEach(v => res.setHeader(name, v));
                    else if (value)
                      res.setHeader(name, value);
                  }
                  pRes.pipe(res);
                }
              }),
              rx.take(1),
              rx.takeUntil(proxy$.error.pipe(rx.filter(({payload: [, , res0]}) => res0 === res)))
            ) :
            rx.EMPTY
        ).pipe(
          rx.catchError(err => {
            res.status(500).send(err);
            return rx.EMPTY;
          })
        ).subscribe();

        proxyServer.web(req, res, {
          buffer: body?.readable,
          selfHandleResponse,
          headers: {
            ...(body ?
              {'content-length': body.length + ''}
              : {}),
            ...(selfHandleResponse ?
              {'cache-control': 'no-cache'} :
              {})
          }
        });
      });
    });
  } else {
    const indexHtmlFile = config.resolve('staticDir', 'plink/index.html');
    if (!fs.existsSync(indexHtmlFile)) {
      log.error('Can\'t find index HTML file:', indexHtmlFile);
      return;
    }
    const htmlDone = fs.promises.readFile(indexHtmlFile, 'utf8');
    ctx.expressAppUse(app => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      app.use('/plink', async (req, res, next) => {
        const containsNoDot = !/\.\w+$/.test(new URL(req.originalUrl, 'http://whatever').pathname);
        if (containsNoDot) {
          if (linkIdToFile.size > 0) {
            const html = addDocHashDefInHtml(
              await htmlDone,
              '<script>\nvar __localMarkdownViewLinks = [' +
                [...linkIdToFile.keys()].map(id => '"' + id + '"').join(', ') +
                '];</script>'
            );
            res.setHeader('content-type', 'text/html');
            res.send(html);
          } else {
            next();
          }
        } else {
          next();
        }
      });
    });
  }

  r('newWorkerReady(imageToBeResolved, linkToBeResolved) -> imageResolved', broker.outputTable.l.newWorkerReady.pipe(
    rx.mergeMap(([, _workerNo, workerOutput, workerInput]) => rx.merge(
      workerOutput.pt.imageToBeResolved.pipe(
        rx.mergeMap(async ([m, imgSrc, file]) => {
          try {
            if (!/^\w+:\/\//.test(imgSrc)) {
              const imgFile = Path.resolve(Path.dirname(file), imgSrc);
              const hash = await digestSha1(imgFile);
              const url = ctx.contextPath + '/markdown-local/image/' + encodeURIComponent(hash);
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
        rx.mergeMap(async ([m, href, file]) => {
          if (/^(?:\w+:)?\/\/.*?\.md$/.test(href)) {
            workerInput.ft.linkResolved().dp(m);
            return;
          }

          const linkedFile = Path.resolve(Path.dirname(file), href);
          const id = await digestSha1(linkedFile);
          linkIdToFile.set(id, linkedFile);
          linksOfFile.get(file)!.add(id);
          workerInput.ft.linkResolved(id).dp(m);
        })
      )
    ))
  ));

  r('loadFile', i.pt.loadFile.pipe(
    rx.mergeMap(([m, file]) => rx.from(fs.promises.readFile(file, 'utf8')).pipe(
      rx.mergeMap(content => {
        return i.ft.forkProcessFile(content, file).do(o.at.processFileDone);
      }),
      rx.tap(([, {resultHtml, toc, mermaid}]) => {
        o.ft.fileLoaded({
          html: arrayBuffer2str(resultHtml),
          toc,
          mermaids: mermaid.map(item => arrayBuffer2str(item)),
          linkHashes: [...linksOfFile.get(file)!.keys()]
        } as LoaderRecivedData).dp(m);
      }),
      rx.catchError((err) => {
        markdownProcessor.dispatchErrorFor(err, m);
        return rx.EMPTY;
      })
    ))
  ));
}

function addDocHashDefInHtml(html: string, def: string) {
  const foundTitle$ = elementByTagName(html, 'title');
  let changed = html;
  foundTitle$.pipe(
    rx.tap(titleEl => {
      const pos = titleEl.sourceCodeLocation!.endOffset;
      changed = html.slice(0, pos) + def + html.slice(pos);
      log.warn('Change HTML');
    }),
    rx.take(1)
  ).subscribe();
  return changed;
}

const textEncoder = new TextEncoder();
export async function digestSha1(text: string) {
  return btoa(String.fromCodePoint(...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-1', textEncoder.encode(text)))));
}
