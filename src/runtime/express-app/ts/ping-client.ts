import http from 'http';
import {log4File} from '@wfh/plink';

const log = log4File(__filename);

export function ping() {
  const req = http.request('http://localhost:14333/takeMeToPing', {
    method: 'POST'
  });
  req.on('response', (res) => {
    const bufs = [] as Buffer[];
    res.on('data', data => bufs.push(data));
    res.on('end', () => {
      log.info('response', Buffer.concat(bufs).toString('utf8'));
    });
  });

  req.end('hellow world');
}

