// tslint:disable:no-console

import {createServerDataHandler, parseLinesOfTokens, ImapTokenType} from '../mail/imap-msg-parser';
import {parse} from '../mail/rfc822-parser';
import {parse as parseSync} from '../mail/rfc822-sync-parser';
import fs from 'fs';
import Path from 'path';

xdescribe('imap-msg-parser', () => {
  xit('createServerDataHandler() should parse string literal', (done) => {
    const handler = createServerDataHandler();
    handler.output.subscribe(
      tks => console.log('lines:', tks),
      (err) => done.fail(err),
      () => done()
    );

    const buf = Buffer.from('* OK 123\r\n* FETCH {14}abcdefghijklmn', 'utf8');
    handler.input(buf);
    handler.input(null);
  });

  it('parseLinesOfTokens() should work', async () => {
    const handler = createServerDataHandler();

    const done = new Promise<void>((resolve, rej) => {
        handler.output.subscribe(
        tks => {},
        (err) => rej(err),
        () => resolve()
      );
    });

    async function parse() {
      await parseLinesOfTokens(handler.output, async la => {
        console.log('p1 parses line');
        while ((await la.la()) != null) {
          const tk = await la.advance();
          console.log('p1:', tk.text);
          if (tk.type === ImapTokenType.stringLit)
            return true;
        }
      });
      console.log('p1 parsing completes');
      setTimeout(() => {
        handler.input(Buffer.from('* OK 789\r\n* FETCH2 {10}1234567890\r\n', 'utf8'));
        handler.input(null);
      }, 0);
      await parseLinesOfTokens(handler.output, async la => {
        console.log('p2 parses line');
        while ((await la.la()) != null) {
          const tk = await la.advance();
          console.log('p2:', tk.text);
        }
      });
    }
    const parseDone = parse();
    const buf = Buffer.from('* OK 123\r\n* FETCH1 {14}abcdefghijklmn\r\n', 'utf8');
    setTimeout(() => {
      handler.input(buf);
    }, 0);

    await Promise.all([parseDone, done]);
  });
});

describe('rfc822-parser', () => {
  xit('parse()', async () => {
    const buf = fs.readFileSync(Path.resolve(__dirname, '../../ts/spec/rfc822-msg.txt'));
    console.time('async');
    const result = await parse(buf);
    console.timeEnd('async');
    for (const part of result.parts) {
      console.log(part);
    }
  });

  xit('sync parse() case 1', () => {
    const buf = fs.readFileSync(Path.resolve(__dirname, '../../ts/spec/rfc822-msg.txt'));
    console.time('sync');
    const result = parseSync(buf);
    console.timeEnd('sync');
    for (const part of result.parts) {
      console.log(part);
    }
  });

  it('sync parse() case 2', () => {
    const buf = fs.readFileSync(Path.resolve(__dirname, '../../ts/spec/rfc822-msg-2.txt'));
    console.time('sync');
    const result = parseSync(buf);
    console.timeEnd('sync');
    for (const part of result.parts) {
      console.log(part.headers);
      if (part.file)
        console.log(part.file);
      else
        console.log(part.body!.toString('utf8'));
    }
  });

  it('sync parse() message without attachment', () => {
    const buf = fs.readFileSync(Path.resolve(__dirname, '../../ts/spec/plain-msg.txt'));
    console.time('sync');
    const result = parseSync(buf);
    console.timeEnd('sync');
    console.log(result);
    // for (const part of result.parts) {
    //   console.log(part);
    // }
  });
});
