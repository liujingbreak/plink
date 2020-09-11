#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
const tslib_1 = require("tslib");
// import pk from '../../package.json';
// import chalk from 'chalk';
// import {spawn} from 'dr-comp-package/wfh/dist/process-utils';
// import fs from 'fs-extra';
// import Path from 'path';
// export const program: commander.Command = new Command().name('crae');
const cli = (program, withGlobalOptions) => {
    // program.version(pk.version);
    // program.description(chalk.cyanBright(
    //   'Enhance create-react-app for monorepo project structure and provide other opinionated project architecture'));
    const genCmd = program.command('cra-gen <dir>')
        .description('Generate a sample package in specific directory')
        .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
        .action((dir) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => tslib_1.__importStar(require('../cmd')))).genPackage(dir, genCmd.opts().dryRun);
        // fs.mkdirpSync(dir);
        // fs.copyFileSync(Path.resolve(__dirname, 'tmpl-.npmrc'), Path.resolve(dir, '.npmrc'));
        // (await import('./cli-init')).default();
    }));
    const buildCmd = program.command('cra-build <type> <package-name>')
        .description('Based on react-scripts build command')
        .option('--dev', 'development mod', false)
        .action((type, packageName) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        // TODO
        // tslint:disable-next-line: no-console
        console.log(buildCmd.opts().dev);
    }));
    // program.parseAsync(process.argv)
    // .catch(e => {
    //   console.error(e);
    //   process.exit(1);
    // });
};
exports.default = cli;

//# sourceMappingURL=cli.js.map
