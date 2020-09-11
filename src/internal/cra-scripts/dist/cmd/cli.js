#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
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
        .action((dir) => __awaiter(void 0, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('../cmd')))).genPackage(dir, genCmd.opts().dryRun);
        // fs.mkdirpSync(dir);
        // fs.copyFileSync(Path.resolve(__dirname, 'tmpl-.npmrc'), Path.resolve(dir, '.npmrc'));
        // (await import('./cli-init')).default();
    }));
    const buildCmd = program.command('cra-build <type> <package-name>')
        .description('Based on react-scripts build command')
        .option('--dev', 'development mod', false)
        .action((type, packageName) => __awaiter(void 0, void 0, void 0, function* () {
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
