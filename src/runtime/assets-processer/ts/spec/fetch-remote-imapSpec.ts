// tslint:disable no-console
/**
 * drcp test -f ../web-fun-house/src/runtime/assets-processer/ts/spec/fetch-remote-imapSpec.ts -c dist/config.local.yaml conf/remote-deploy-test.yaml
 */
import * as fetchImap from '../fetch-remote-imap';
import Path from 'path';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 5 * 60 * 1000;

describe('fetch-remote-imap', () => {

  it('can connect to server', async () => {
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

  xit('can recieve mail', async () => {
    const appName = 'bcl';
    await fetchImap.connectImap(async context => {
      const foundIdx = await context.findMail(context.lastIndex, `build artifact: ${appName}:`);
      if (foundIdx == null)
        throw new Error(`Can not find mail for "${appName}"`);
      const targetMail = await context.waitForFetch(foundIdx, false);
      console.log(targetMail);
    });
  });

  xit('can recieve mail only with text body', async () => {
    const appName = 'Hellow world';
    await fetchImap.connectImap(async context => {
      const foundIdx = await context.findMail(context.lastIndex, `build artifact: ${appName}:`);
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
    let mgr = new fetchImap.ImapManager('dev');
    await mgr.sendFileAndUpdatedChecksum('testApp1', Path.resolve(__dirname, '../../ts/spec/fetch-remote-attachment.zip'));

    // mgr = new fetchImap.ImapManager('dev');
    // await mgr.sendFileAndUpdatedChecksum(Path.resolve(__dirname, '../../ts/spec/fetch-remote-attachment.zip'));
  });
});
