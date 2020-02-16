import {tsc as _tsc} from 'dr-comp-package/wfh/dist/ts-cmd';
const drcpConfig = require('dr-comp-package/wfh/lib/config');

(drcpConfig.init({}) as Promise<any>)
.then(() => {
  const tsc: typeof _tsc = require('dr-comp-package/wfh/dist/ts-cmd').tsc;
  return tsc({package: [process.argv[2]], ed: true, jsx: true});
})
.then(emitted => {
  // tslint:disable-next-line: no-console
  console.log('[drcp-tsc] declaration files emitted:');
  // tslint:disable-next-line: no-console
  emitted.forEach(info => console.log(`[drcp-tsc] emitted: ${info[0]} ${info[1]}Kb`));
});
// // tslint:disable-next-line: no-console
// console.log(`pid:${process.pid} [fork run "drcp tsc"]`, process.argv.slice(2));
// require('dr-comp-package/bin/drcp');

