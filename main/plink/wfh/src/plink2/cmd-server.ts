import * as http from 'node:http';
import * as util from 'node:util';
import * as tty from 'node:tty';
import * as stream from 'node:stream';
import {isMainThread, threadId} from 'worker_threads';
import fs from 'fs';
import * as rx from 'rxjs';
import chalk from 'chalk';
import {SingleActionFactory, ReactorComposite2} from '@wfh/reactivizer';
import {initProcess} from '../utils/bootstrap-process';
import {createProcessManager} from './server-process';

const startTime = new Date().getTime();
process.env.__plinkLogMainPid = process.pid + '';
initProcess('save');
process.on('exit', (code) => {
  // eslint-disable-next-line no-console
  console.log((process.send || !isMainThread ? `[P${process.pid}.T${threadId}] ` : '') +
    chalk.green(`${code !== 0 ? 'Failed' : 'Done'} in ${new Date().getTime() - startTime} ms`));
});

interface ServerInput {
  start(port?: number): SingleActionFactory;
  // stop(): SingleActionFactory;
  setTTYSize(col: number, rows: number): SingleActionFactory;
}

const fout = fs.createWriteStream('plink-daemon.log', {
  flags: 'a',
  encoding: 'binary'
});

interface ServerEvents {
  started(port: number): SingleActionFactory;
  isStarted(yes: boolean): SingleActionFactory;

  onReqError(err: Error): SingleActionFactory;
  onReqClose(): SingleActionFactory;

  onRequestLine(req: http.IncomingMessage, res: http.ServerResponse, line: string): SingleActionFactory;
}

const inputTableFor = ['setTTYSize'] as const;

const outputTableFor = ['isStarted'] as const;

process.stdout.on('data', chunk => fout.write(chunk));

function reatorLog(msg: string, ...args: any[]) {
  fout.write(new Date().toLocaleTimeString());
  fout.write(' ');
  fout.write(msg);
  for (const arg of args) {
    fout.write(' ');
    fout.write(util.inspect(arg, false, 0));
  }
  fout.write('\n');
}

const service = new ReactorComposite2<ServerInput, ServerEvents, typeof inputTableFor, typeof outputTableFor>({
  name: 'PlinkCliServer',
  inputTableFor,
  outputTableFor,
  log: reatorLog,
  debug: true
});

const processManager = createProcessManager(reatorLog);

const {i, o, r, inputTable} = service;
let server: http.Server | undefined;

r('start', i.pt.start.pipe(
  rx.exhaustMap(([m, port]) => {
    return rx.merge(
      // Ignore until "isStarted: false"
      o.pt.isStarted.pipe(
        rx.filter(([, yes]) => !yes),
        rx.distinctUntilChanged(),
        rx.take(1)
      ),
      new rx.Observable(sub => {
        const actPort = port ?? 14329;
        server = http.createServer((req, res) => {
          let buf = [] as string[];
          // cmdBufferByReq.set(req, buf);
          req.on('data', chunk => {
            const str = (chunk as Buffer).toString();
            const eol = str.indexOf('\n');
            if (eol >= 0) {
              buf.push(str.slice(0, eol));
              o.ft.onRequestLine(req, res, buf.join('')).dp();
              buf = [str.slice(eol)];
            } else {
              buf.push(str);
            }
          });
          req.on('end', () => {
            o.ft.onRequestLine(req, res, buf.join('')).dp();
            // res.end('ok');
          });
          req.on('error', err => o.ft.onReqError(err).dp());
          req.on('close', () => o.ft.onReqClose().dp());
        });
        server.on('listening', () => {
          sub.complete();
          o.ft.started(actPort).dp(m);
          o.ft.isStarted(true).dp(m);
        });
        server.on('error', (err) => console.error(err));
        server.listen(actPort);
      })
    );
  })
));

r('processManager.onChildProcessExit', processManager.destory$.pipe(
  rx.exhaustMap(() => service.outputTable.l.isStarted.pipe(
    rx.filter(([, yes]) => yes),
    rx.take(1),
    rx.concatMap(() => rx.timer(500)),
    rx.map(() => {
      service.dispose();
      server?.close();
    })
  ))
));

r('onRequestLine', o.pt.onRequestLine.pipe(
  rx.mergeMap(([m, , res, line]) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const json = JSON.parse(line);
    const [cmd] = json as [string];
    if (cmd === 'setSize') {
      const [, cols, rows] = json as [string, number, number];
      i.ft.setTTYSize(cols - 2, rows).dp();
      fout.write(`screen size: ${cols}, ${rows}\n`);
      return rx.EMPTY;
    }
    const [dir, args] = json as [string, string[]];
    if (args[0] === 'SIGINT') {
      processManager.i.ft.interrupt(dir).dp(m);
      res.end();
      return rx.EMPTY;
    }
    const out = new stream.Writable({
      write(chunk, _enc, cb) {
        res.write(chunk);
        fout.write(chunk);
        cb();
      },
      final(cb) {
      // res.end();
        cb();
      }
    }) as tty.WriteStream;

    return processManager.i.ft.sendCommand(inputTable.getData().setTTYSize as [number, number], dir, args, out).ddo(
      processManager.o.pt.onCommandDoneAnyway
    ).pipe(
      rx.take(1),
      rx.finalize(() => {
        void Promise.resolve().then(() => res.end());
      })
    );
  })
));

i.ft.setTTYSize(150, 50).dp();
i.ft.start().dp();

