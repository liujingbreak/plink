import {jest, describe, it} from '@jest/globals';
import {forkAsPreserveSymlink} from '@wfh/plink';

jest.setTimeout(60000);
describe('http cache server', () => {
  // it('"preserve symlinks" should be on', () => {
  //   console.log(process.env);
  //   console.log(process.execArgv);
  // });

  it('multi-process state server and client uses http "keep-alive" connection', () => {
    forkAsPreserveSymlink('@wfh/tool-misc/dist/__tests__/http-cache-server/service-main-process.js', {});
  });
});

