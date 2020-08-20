import {tsc as _tsc} from 'dr-comp-package/wfh/dist/ts-cmd';
const drcpConfig = require('dr-comp-package/wfh/lib/config');

(drcpConfig.init({}) as Promise<any>)
.then(() => {
  const tsc: typeof _tsc = require('dr-comp-package/wfh/dist/ts-cmd').tsc;
  return tsc({
    package: [process.argv[2]],
    ed: true, jsx: true,
    watch: process.argv.slice(3).indexOf('--watch') >= 0,
    compileOptions: {
      module: 'esnext',
      isolatedModules: true
    }
  });
})
.then(emitted => {
  // tslint:disable-next-line: no-console
  console.log('[drcp-tsc] declaration files emitted:');
  // tslint:disable-next-line: no-console
  emitted.forEach(info => console.log(`[drcp-tsc] emitted: ${info[0]} ${info[1]}Kb`));
})
.catch(err => {
  console.error('[child-process tsc] Typescript compilation contains errors');
  console.error(err);
});

