import pm2 from '@growth/pm2';
import * as _ from 'lodash';
import {promisify as pify} from 'util';

const connect = pify(pm2.connect.bind(pm2));
const list = pify(pm2.list.bind(pm2));
const launchBus = pify(pm2.launchBus.bind(pm2));

interface Pm2Pocket {
  raw: {
    topic: string;
  };
  process: {
    name: string;
    pm_id: number;
  };
}

export async function start() {
  // tslint:disable-next-line: no-console
  console.log('start pm2-intercom');
  await connect();
  const apps: pm2.ProcessDescription[] = await list();
  // tslint:disable-next-line: no-console
  console.log(apps.map(pc => pc.name + ': ' + pc.pm_id));
  const bus = await launchBus();

  const targets = new Map<string, number>();

  bus.on('process:msg', (packet: Pm2Pocket) => {
    // console.log(JSON.stringify(packet, null, '  '));
    const topic: string = _.get(packet, 'raw.topic');
    const name: string = _.get(packet, 'process.name');
    if (topic === 'log4js:master') {
      targets.set(name, packet.process.pm_id);
      // tslint:disable-next-line: no-console
      console.log('--- App master process start ---\n', targets);
    }
    if (topic !== 'log4js:message') {
      return;
    }
    const masterProcId = targets.get(name);
    if (masterProcId != null) {
      pm2.sendDataToProcessId(masterProcId, packet.raw, () => {});
    }
  });
}
