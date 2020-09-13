"use strict";
// import {initConfigAsync} from 'dr-comp-package/wfh/dist/utils/bootstrap-server';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import {tsc as _tsc} from 'dr-comp-package/wfh/dist/ts-cmd';
// (async () => {
//   await initConfigAsync({
//     config: [],
//     prop: []
//   });
//   const {tsc} = await import('dr-comp-package/wfh/dist/ts-cmd');
//   const emitted = await tsc({
//     package: [process.argv[2]],
//     ed: true, jsx: true,
//     watch: process.argv.slice(3).indexOf('--watch') >= 0,
//     compileOptions: {
//       module: 'esnext',
//       isolatedModules: true
//     }
//   });
//   // tslint:disable-next-line: no-console
//   console.log('[drcp-tsc] declaration files emitted:');
//   // tslint:disable-next-line: no-console
//   emitted.forEach(info => console.log(`[drcp-tsc] emitted: ${info[0]} ${info[1]}Kb`));
// })()
// .catch(err => {
//   console.error('[child-process tsc] Typescript compilation contains errors');
//   console.error(err);
// });
const path_1 = __importDefault(require("path"));
const child_process_1 = __importDefault(require("child_process"));
const plinkDir = path_1.default.dirname(require.resolve('dr-comp-package/package.json'));
const cp = child_process_1.default.spawn('node', [path_1.default.resolve(plinkDir, 'wfh/dist/cmd-bootstrap.js')], 
// const cp = childProc.fork(Path.resolve(plinkDir, 'wfh/dist/cmd-bootstrap.js'), [], 
{
    detached: true,
    // env: {
    // NODE_OPTIONS: '-r dr-comp-package/register'
    // NODE_PATH: nodePath.join(Path.delimiter)
    // },
    cwd: process.cwd()
    // execArgv: [], // Not working, don't know why
    // silent: true
    // stdio: [0, 1, 2, 'ipc']
});
new Promise((resolve, rej) => {
    // cp.stdout!.on('end', () => resolve());
    if (cp.stdout) {
        cp.stdout.on('data', (data) => console.log(data.toString()));
        cp.stdout.resume();
        cp.stdout.on('close', () => console.log('closed'));
        // cp.stdout.on('readable', () => cp.stdout!.resume());
    }
    if (cp.stderr)
        cp.stderr.resume();
    cp.on('exit', (code, signal) => {
        if (code !== 0) {
            rej(new Error(`Failed to generate tsd files, due to process exit with code: ${code} ${signal}`));
        }
        else {
            // tslint:disable-next-line: no-console
            console.log('[webpack-lib] tsc done');
            resolve();
        }
    });
    cp.on('error', err => {
        console.error(err);
        resolve();
    });
});

//# sourceMappingURL=drcp-tsc.js.map
