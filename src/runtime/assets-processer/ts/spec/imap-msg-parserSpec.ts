// tslint:disable:no-console

import {createServerDataHandler, parseLinesOfTokens, ImapTokenType} from '../mail/imap-msg-parser';
import {parse} from '../mail/rfc822-parser';
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

    const done = new Promise((resolve, rej) => {
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
  it('parse()', async () => {
    const buf = fs.readFileSync(Path.resolve(__dirname, '../../ts/spec/rfc822-msg-2.txt'));
    const result = await parse(buf);

    for (const part of result.parts) {
      console.log(part);
    }
  });
});
