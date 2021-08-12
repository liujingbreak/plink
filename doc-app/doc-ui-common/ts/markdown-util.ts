import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {Pool} from '@wfh/thread-promise-pool';
import {TOC} from '../isom/md-types';
import path from 'path';
import cheerio from 'cheerio';
import {log4File} from '@wfh/plink';
import util from 'util';
import _ from 'lodash';
import os from 'os';
const log = log4File(__filename);

let threadPool: Pool;

/**
 * Use Thread pool to parse Markdown file simultaneously
 * @param source 
 * @param resolveImage 
 */
export function markdownToHtml(source: string, resolveImage?: (imgSrc: string) => Promise<string> | rx.Observable<string>):
  rx.Observable<{toc: TOC[]; content: string}> {
  if (threadPool == null) {
    threadPool = new Pool();
  }

  return rx.from(threadPool.submit<string>({
    file: path.resolve(__dirname, 'markdown-loader-worker.js'), exportFn: 'parseToHtml', args: [source]
  })).pipe(
    op.mergeMap(html => {
      let toc: TOC[] = [];
      const $ = cheerio.load(html);
      log.debug(html);
      const done: (rx.Observable<string> | Promise<string>)[] = [];
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
      const headings = $('h1, h2, h3, h4, h5, h6');
      headings.each((idx, heading) => {
          const headingQ = $(heading);
          if (headingQ) {
              const headingText = headingQ.text();
              const id = Buffer.from(idx + headingText).toString('base64');
              // log.info(`set heading <${heading.name}> id=${id}`);
              headingQ.attr('id', id);
              toc.push({level: 0, tag: heading.tagName.toLowerCase(), text: headingText, id });
          }
      });
      toc = createTocTree(toc);
      return rx.merge(...done).pipe(
        op.count(),
        op.mapTo({ toc, content: source }),
        op.catchError(err => {
          log.error(err);
          // cb(err, JSON.stringify({ toc, content: source }), sourceMap);
          return rx.of({ toc, content: source });
        })
      );
    })
  );
}

function createTocTree(input: TOC[]) {
  const root: TOC = {level: -1, tag: 'h0', text: '', id: '', children: []};
  let byLevel: TOC[] = [root]; // a stack of previous TOC items ordered by level
  let prevHeaderSize = Number(root.tag.charAt(1));
  for (const item of input) {
    const headerSize = Number(item.tag.charAt(1));
    if (headerSize < prevHeaderSize) {
      const pIdx = _.findLastIndex(byLevel, toc => Number(toc.tag.charAt(1)) < headerSize);
      byLevel.splice(pIdx + 1);
      addAsChild(byLevel[pIdx], item);
    } else if (headerSize === prevHeaderSize) {
      byLevel.pop();
      const parent = byLevel[byLevel.length - 1];
      addAsChild(parent, item);
    } else {
      const parent = byLevel[byLevel.length - 1];
      addAsChild(parent, item);
    }
    prevHeaderSize = headerSize;
  }

  function addAsChild(parent: TOC, child: TOC) {
    if (parent.children == null)
      parent.children = [child];
    else
      parent.children.push(child);
    child.level = byLevel.length;
    byLevel.push(child);
  }
  return root.children!;
}

export function* traverseTocTree(tocs: TOC[]): Generator<TOC> {
  for (const item of tocs) {
    yield item;
    if (item.children)
      yield* traverseTocTree(item.children);
  }
}

export function tocToString(tocs: TOC[]) {
  let str = '';
  for (const item of traverseTocTree(tocs)) {
    str += ' |'.repeat(item.level);
    // str += '- ';
    str += `- ${item.text}`;
    str += os.EOL;
  }
  return str;
}
