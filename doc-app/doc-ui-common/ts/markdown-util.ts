import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {Pool} from '@wfh/thread-promise-pool';
import {TOC} from '../isom/md-types';
import path from 'path';
import cheerio from 'cheerio';
import {log4File} from '@wfh/plink';
import util from 'util';


const log = log4File(__filename);

let threadPool: Pool;

/**
 * Use Thread pool to parse Markdown file simultaneously
 * @param source 
 * @param resolveImage 
 */
export async function markdownToHtml(source: string, resolveImage?: (imgSrc: string) => Promise<string> | rx.Observable<string>) {
  if (threadPool == null) {
    threadPool = new Pool();
  }
  const html = await threadPool.submit<string>({
    file: path.resolve(__dirname, 'markdown-loader-worker.js'), exportFn: 'parseToHtml', args: [source]
  });
  const toc: TOC[] = [];
  const $ = cheerio.load(html);
  log.debug(html);
  const done: (rx.Observable<string>|Promise<string>)[] = [];

  if (resolveImage) {
    const imgs = $('img');
    imgs.each((idx, img) => {
      const imgQ = $(img);
      const imgSrc = imgQ.attr('src');
      log.info('found img src=' + imgQ.attr('src'));
      if (imgSrc) {
        done.push(rx.from(resolveImage(imgSrc))
          .pipe(
            op.tap(resolved => {
              imgQ.attr('src', resolved);
              log.info(`resolve ${imgSrc} to ${util.inspect(resolved)}`);
            })
          ));
      }
    });
  }
  const headings = $('h1, h2, h3, h5, h5, h6');
  headings.each((idx, heading) => {
      const headingQ = $(heading);
      if (headingQ) {
          const headingText = headingQ.text();
          const id = Buffer.from(idx + headingText).toString('base64');
          // log.info(`set heading <${heading.name}> id=${id}`);
          headingQ.attr('id', id);
          toc.push({ tag: heading.tagName, text: headingText, id });
      }
  });
  // console.log('toc: ', toc);
  await rx.merge(...done).pipe(
    op.catchError(err => {
      log.error(err);
      // cb(err, JSON.stringify({ toc, content: source }), sourceMap);
      return rx.of(JSON.stringify({ toc, content: source }));
    }),
    op.finalize(() => {
      // cb(null, JSON.stringify({ toc, content: $.html() }), sourceMap);
    })
  ).toPromise();
  return {toc, content: $.html()};
}
