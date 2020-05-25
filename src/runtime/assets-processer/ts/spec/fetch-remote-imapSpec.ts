// tslint:disable no-console
/**
 * drcp test -f ../web-fun-house/src/runtime/assets-processer/ts/spec/fetch-remote-imapSpec.ts -c dist/config.local.yaml conf/remote-deploy-test.yaml
 */
import * as fetchImap from '../fetch-remote-imap';
import Path from 'path';
const log = require('log4js').getLogger('fetch-remote-imapSpec');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 5 * 60 * 1000;

describe('fetch-remote-imap', () => {

  xit('can connect to server', async () => {
    fetchImap.connectImap(async () => {
      // await context.waitForReply('');
    });
  });

  xit('can send mail', async () => {
    await fetchImap.retrySendMail(
      'Hellow world: ' + new Date().toLocaleString(),
      Path.resolve(__dirname, '', '../../ts/spec/fetch-remote-attachment.zip')
    );
  });

  xit('can append mail by IMAP', async () => {
    await fetchImap.connectImap(async context => {
      await context.appendMail('hellow world', 'test mail');
    });
  });

  it('can recieve mail', async () => {
    await fetchImap.connectImap(async context => {
      const foundIdx = await context.findMail(context.lastIndex, 'build artifact:pre-build(prod-admin-bcl)');
      if (foundIdx == null)
        throw new Error('Can not find the mail');
      log.info('--- find mail index ---', foundIdx);
      // const foundIdx = 8;
      const targetMail = await context.waitForFetch(foundIdx, false);
      console.log(targetMail);
      log.info('can recieve mail - done');
    });
  });

  xit('can recieve mail only with text body', async () => {
    const appName = 'Hellow world';
    await fetchImap.connectImap(async context => {
      const foundIdx = await context.findMail(context.lastIndex, `build artifact:pre-build(test-${appName})`);
      if (foundIdx == null)
        throw new Error(`Can not find mail for "${appName}"`);
      const text = await context.waitForFetchText(foundIdx);
      console.log('######text: %s#####', text);
      await context.waitForReply(`FETCH ${foundIdx} BODY[2]`);
      // console.log(targetMail);
    });
  });

  xit('can fetch checksum and zips from mail server', async () => {
    const mgr = new fetchImap.ImapManager('dev');
    console.log(await mgr.fetchUpdateCheckSum('testApp'));
    // console.log('---------fetchOtherZips starts ----------');
    await mgr.fetchOtherZips('testApp');
    // console.log('--------fetchOtherZips ends -----------');
  });

  xit('can send build mail with zip file', async ()=> {
    // let mgr = new fetchImap.ImapManager('dev');
    // await mgr.sendFileAndUpdatedChecksum('testApp1', Path.resolve(__dirname, '../../ts/spec/fetch-remote-attachment.zip'));

    // mgr = new fetchImap.ImapManager('dev');
    // await mgr.sendFileAndUpdatedChecksum(Path.resolve(__dirname, '../../ts/spec/fetch-remote-attachment.zip'));
  });
});
