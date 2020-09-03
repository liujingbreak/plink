import {initConfigAsync} from 'dr-comp-package/wfh/dist/utils/bootstrap-server';

import {tsc as _tsc} from 'dr-comp-package/wfh/dist/ts-cmd';

(async () => {
  await initConfigAsync({
    config: [],
    prop: []
  });
  const {tsc} = await import('dr-comp-package/wfh/dist/ts-cmd');
  const emitted = await tsc({
    package: [process.argv[2]],
    ed: true, jsx: true,
    watch: process.argv.slice(3).indexOf('--watch') >= 0,
    compileOptions: {
      module: 'esnext',
      isolatedModules: true
    }
  });
  // tslint:disable-next-line: no-console
  console.log('[drcp-tsc] declaration files emitted:');
  // tslint:disable-next-line: no-console
  emitted.forEach(info => console.log(`[drcp-tsc] emitted: ${info[0]} ${info[1]}Kb`));

})()
.catch(err => {
  console.error('[child-process tsc] Typescript compilation contains errors');
  console.error(err);
});

