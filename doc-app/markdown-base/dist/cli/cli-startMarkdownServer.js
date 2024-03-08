"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = void 0;
const plink_1 = require("@wfh/plink");
async function startServer(port, connectToDevServer = false) {
    plink_1.config.set('port', port);
    if (connectToDevServer) {
        plink_1.config.change(setting => {
            setting['@wfh/markdown-base'].markdownDevServer = 'http://localhost:14333';
        });
    }
    const { started, shutdown } = (0, plink_1.runServer)();
    plink_1.exitHooks.push(shutdown);
    await started;
    // eslint-disable-next-line no-console
    console.log('Markdown server is started');
}
exports.startServer = startServer;
//# sourceMappingURL=cli-startMarkdownServer.js.map