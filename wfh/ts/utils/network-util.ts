import os from 'os';
import _ from 'lodash';

export function getLanIPv4(): string {
  const inters = os.networkInterfaces();
  if (inters.en0) {
    const found = _.find(inters.en0, ip => ip.family === 'IPv4' && !ip.internal);
    if (found) {
      return found.address;
    }
  }
  for (const key of Object.keys(inters)) {
    const interf = inters[key];
    const found = _.find(interf, ip => ip.family === 'IPv4' && !ip.internal);
    if (found) {
      return found.address;
    }
  }
  return '127.0.0.1';
}
