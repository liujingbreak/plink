#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.program = void 0;
const tslib_1 = require("tslib");
require("dr-comp-package/register");
const commander_1 = require("commander");
const package_json_1 = tslib_1.__importDefault(require("../../package.json"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
// import {spawn} from 'dr-comp-package/wfh/dist/process-utils';
// import fs from 'fs-extra';
// import Path from 'path';
exports.program = new commander_1.Command().name('crae');
exports.program.version(package_json_1.default.version);
exports.program.description(chalk_1.default.cyanBright('Enhance create-react-app for monorepo project structure and provide other opinionated project architecture'));
const genCmd = exports.program.command('gen <dir>')
    .description('Generate a sample package in specific directory')
    .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
    .action((dir) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    (yield Promise.resolve().then(() => tslib_1.__importStar(require('../cmd')))).genPackage(dir, genCmd.opts().dryRun);
    // fs.mkdirpSync(dir);
    // fs.copyFileSync(Path.resolve(__dirname, 'tmpl-.npmrc'), Path.resolve(dir, '.npmrc'));
    // (await import('./cli-init')).default();
}));
const buildCmd = exports.program.command('build <type> <package-name>')
    .description('Based on react-scripts build command')
    .option('--dev', 'development mod', false)
    .action((type, packageName) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    // TODO
    // tslint:disable-next-line: no-console
    console.log(buildCmd.opts().dev);
}));
exports.program.parseAsync(process.argv)
    .catch(e => {
    console.error(e);
    process.exit(1);
});

//# sourceMappingURL=cli.js.map
