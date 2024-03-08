"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cliExt = (program) => {
    const cmdStartMarkdown = program.command('start-markdown-server')
        .alias('smds')
        .argument('[port]', 'API server port', '8989')
        .option('--static-dev', 'Whether proxy to dev server of static resource')
        .description('Start Markdown server')
        .action((port) => {
        void require('./cli-startMarkdownServer')
            .startServer(Number(port), cmdStartMarkdown.opts().staticDev);
    });
};
exports.default = cliExt;
//# sourceMappingURL=cli.js.map