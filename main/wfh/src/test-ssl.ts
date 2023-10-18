/* eslint-disable no-console */
import https from 'https';
import fs from 'fs';

function testSSL(endPoint: string, caFile?: string) {
  let ca: Buffer | undefined;
  if (caFile && fs.existsSync(caFile)) {
    ca = fs.readFileSync(caFile);
  }

  return new Promise<void>((resolve, rej) => {
    https.get('https://' + endPoint, {ca}, res => {
      res.setEncoding('utf8');
      res.on('data', data => {
        console.log(data);
      });
      res.on('end', () => resolve());
    }).on('error', err => {
      console.error(`Failed to connect ${endPoint},\n` + err);
      rej(err);
      // process.exit(1);
    }).end();
  });
}

void Promise.all([
  testSSL('www.baidu.com', process.argv[2]).catch(() => {}),
  testSSL('www.bing.com', process.argv[2]).catch((() => {}))
]);
