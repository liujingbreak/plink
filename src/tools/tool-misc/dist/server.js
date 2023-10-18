"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const plink_1 = require("@wfh/plink");
// import * as op from 'rxjs/operators';
const log = (0, plink_1.log4File)(__filename);
function activate(api) {
    const router = api.router();
    log.info('Plink command server is up and running');
    router.post('/plink-cli/:cmdName', (req, res) => {
        log.info('Recieve command', req.params.cmdName);
    });
    router.post('/plink-cli-stoi', (req, res) => {
        // exit$.pipe(
        //   op.filter(action => action === 'done'),
        //   op.tap(() => {
        //     process.exit(0);
        //   })
        // ).subscribe();
        // exit$.next('start');
    });
}
exports.activate = activate;
//# sourceMappingURL=server.js.map