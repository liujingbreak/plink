"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const fs_extra_1 = require("fs-extra");
const path_1 = tslib_1.__importDefault(require("path"));
// import util from 'util';
const cliExt = (program) => {
    const mdCli = program.command('markdown <file>')
        .description('Show markdown topics', { file: 'source markdown file' })
        .option('-i, --insert', 'Insert or update table of content in markdown file')
        .option('-o,--out <output html>', 'Output to html file')
        .action(async (file) => {
        const { markdownToHtml, tocToString, insertOrUpdateMarkdownToc } = require('../markdown-util');
        const input = fs_1.default.readFileSync(path_1.default.resolve(file), 'utf8');
        if (mdCli.opts().insert) {
            const { changedMd, toc, html } = await insertOrUpdateMarkdownToc(input);
            // eslint-disable-next-line no-console
            console.log('Table of content:\n' + toc);
            fs_1.default.writeFileSync(file, changedMd);
            if (mdCli.opts().out) {
                const target = path_1.default.resolve(mdCli.opts().out);
                (0, fs_extra_1.mkdirpSync)(path_1.default.dirname(target));
                fs_1.default.writeFileSync(target, html);
                // eslint-disable-next-line no-console
                console.log('Output HTML to file:', target);
            }
        }
        else {
            const { toc, content } = await markdownToHtml(input).toPromise();
            // eslint-disable-next-line no-console
            console.log('Table of content:\n' + tocToString(toc));
            if (mdCli.opts().out) {
                const target = path_1.default.resolve(mdCli.opts().out);
                (0, fs_extra_1.mkdirpSync)(path_1.default.dirname(target));
                fs_1.default.writeFileSync(target, content);
                // eslint-disable-next-line no-console
                console.log('Output HTML to file:', target);
            }
        }
    });
    program.command('color-info <color-string...>')
        .description('Show color information', { 'color-string': 'In form of CSS color string' })
        .action(async function (colors) {
        for (const info of (await Promise.resolve().then(() => tslib_1.__importStar(require('../color')))).colorInfo(colors)) {
            // eslint-disable-next-line no-console
            console.log(info);
        }
    });
    program.command('color-contrast <color-string1> <color-string2>')
        .description('Show color contrast information', { 'color-string1': 'In form of CSS color string' })
        .action(async function (...colors) {
        (await Promise.resolve().then(() => tslib_1.__importStar(require('../color')))).colorContrast(...colors);
    });
    program.command('color-mix <color1> <color2> [weight-interval]')
        .description('compare 2 colors', {
        color1: 'In form of CSS color string',
        color2: 'In form of CSS color string',
        'weight-interval': 'weight of color to be mixed, should be number between 0 - 1'
    })
        .action(async (color1, color2, weightInterval) => {
        if (weightInterval == null) {
            weightInterval = '0.1';
        }
        (await Promise.resolve().then(() => tslib_1.__importStar(require('../color')))).mixColor(color1, color2, Number(weightInterval));
    });
    // TODO: Add more sub command here
};
exports.default = cliExt;
//# sourceMappingURL=cli.js.map