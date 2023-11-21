/* eslint-disable no-console */
import Path from 'path';
import fs from 'fs';
import {initProcess, initConfig, logConfig} from '@wfh/plink';
import {arrayBuffer2str} from '@wfh/reactivizer';
import {describe, it, expect}  from '@jest/globals';
// import {initProcess} from '@wfh/plink';
import * as rx from 'rxjs';
import * as markdownProcessorModule from '../ts/markdown-processor-main';

initProcess('none');
logConfig(initConfig({})());

describe('markdown-processor', () => {
  const {markdownProcessor, setupBroker} = require('../dist/markdown-processor-main') as typeof markdownProcessorModule;
  const broker = setupBroker(true, 1);
  const file = Path.resolve(__dirname, 'sample-markdown.md');
  const raw = fs.readFileSync(file, 'utf8');

  it.skip('long markdown with mermaid', async () => {
    const {i, o, r} = markdownProcessor;

    const imgResolver = jest.fn();
    const linkResolver = jest.fn();
    r('test spec, imageToBeResolved -> imageResolved',
      broker.outputTable.l.newWorkerReady.pipe(
        rx.mergeMap(([, workerNo, workerOutput, workerInput]) => workerOutput.pt.imageToBeResolved.pipe(
          rx.tap(([m, url, file]) => {
            imgResolver(url, file);
            console.log('resolve image for', workerNo, url, file);
            workerInput.dpf.imageResolved(m, url);
          })
        ))
      )
    );
    r('test spec, linkToBeResolved -> linkResolved',
      broker.outputTable.l.newWorkerReady.pipe(
        rx.mergeMap(([, workerNo, workerOutput, workerInput]) => workerOutput.pt.linkToBeResolved.pipe(
          rx.tap(([m, url, file]) => {
            linkResolver(url, file);
            console.log('resolve link for', workerNo, url, file);
            workerInput.dpf.linkResolved(m, url);
          })
        ))
      )
    );
    const [, {resultHtml, toc, mermaid}] = await rx.firstValueFrom(i.do.forkProcessFile(o.at.processFileDone, raw, file));
    console.log(arrayBuffer2str(resultHtml).toString(), toc);
    expect(mermaid.length).toBeGreaterThan(0);
    const mermaidCode = arrayBuffer2str(mermaid[0]);
    console.log('mermaid', mermaidCode);
    expect(mermaidCode.slice(0, 'flowchart LR'.length)).toEqual('flowchart LR');
    expect(imgResolver.mock.calls.length).toBe(1);
    broker.i.dp.letAllWorkerExit();
  }, 20000);

  it('2 markdown files being processed simultaneously in worker thread', async () => {
    const {i, o, r} = markdownProcessor;

    const imgResolver = jest.fn();
    const linkResolver = jest.fn();

    r('test spec, imageToBeResolved -> imageResolved',
      broker.outputTable.l.newWorkerReady.pipe(
        rx.mergeMap(([, workerNo, workerOutput, workerInput]) => workerOutput.pt.imageToBeResolved.pipe(
          rx.tap(([m, url, file]) => {
            imgResolver(url, file);
            console.log('resolve image for', workerNo, url, file);
            workerInput.dpf.imageResolved(m, url);
          })
        ))
      )
    );
    r('test spec, linkToBeResolved -> linkResolved',
      broker.outputTable.l.newWorkerReady.pipe(
        rx.mergeMap(([, workerNo, workerOutput, workerInput]) => workerOutput.pt.linkToBeResolved.pipe(
          rx.tap(([m, url, file]) => {
            linkResolver(url, file);
            console.log('resolve link for', workerNo, url, file);
            workerInput.dpf.linkResolved(m, url);
          })
        ))
      )
    );
    const [[, a], [, b]] = await rx.lastValueFrom(rx.forkJoin([
      i.do.forkProcessFile(o.at.processFileDone, raw, file).pipe(rx.take(1)),
      i.do.forkProcessFile(o.at.processFileDone, raw, file).pipe(rx.take(1))
      // i.do.forkProcessFile(o.at.processFileDone, raw, file).pipe(rx.take(1)),
      // i.do.forkProcessFile(o.at.processFileDone, raw, file).pipe(rx.take(1)),
      // i.do.forkProcessFile(o.at.processFileDone, raw, file).pipe(rx.take(1))
    ]));
    expect(a.mermaid.length > 0).toBe(true);
    expect(b.mermaid.length > 0).toBe(true);
    console.log(arrayBuffer2str(a.mermaid[0]));
    console.log(arrayBuffer2str(b.mermaid[0]));
    expect(imgResolver.mock.calls.length).toBe(2);
    expect(linkResolver.mock.calls.length).toBe(2);
    broker.i.dp.letAllWorkerExit();

  }, 50000);

});
