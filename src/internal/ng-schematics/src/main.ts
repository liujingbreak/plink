// tslint:disable:no-console
import {fixViewChild} from './ng-schematics';
import api from '__api';

export function toNg8() {
  if (api.argv.dir == null) {
    console.log('You need provide parameter "--dir <directory>"');
  }
  return fixViewChild(api.argv.dir);
}
// process.on('uncaughtException', (err) => {
//   console.error('uncaughtException', err);
// });
// process.on('unhandledRejection', (rej) => {
//   console.error('unhandledRejection', rej);
// });
