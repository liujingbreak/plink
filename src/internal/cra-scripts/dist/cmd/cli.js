#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require('source-map-support/register');
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
    .action((dir) => tslib_1.__awaiter(this, void 0, void 0, function* () {
    (yield Promise.resolve().then(() => tslib_1.__importStar(require('../cmd')))).genPackage(dir, genCmd.opts().dryRun);
    // fs.mkdirpSync(dir);
    // fs.copyFileSync(Path.resolve(__dirname, 'tmpl-.npmrc'), Path.resolve(dir, '.npmrc'));
    // (await import('./cli-init')).default();
}));
const buildCmd = exports.program.command('build <type> <package-name>')
    .description('Based on react-scripts build command')
    .option('--dev', 'development mod', false)
    .action((type, packageName) => tslib_1.__awaiter(this, void 0, void 0, function* () {
    // TODO
    // tslint:disable-next-line: no-console
    console.log(buildCmd.opts().dev);
}));
exports.program.parseAsync(process.argv)
    .catch(e => {
    console.error(e);
    process.exit(1);
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQ0EsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7QUFDdkMseUNBQWtDO0FBQ2xDLDhFQUFvQztBQUNwQywwREFBMEI7QUFDMUIsZ0VBQWdFO0FBQ2hFLDZCQUE2QjtBQUM3QiwyQkFBMkI7QUFFZCxRQUFBLE9BQU8sR0FBRyxJQUFJLG1CQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFbEQsZUFBTyxDQUFDLE9BQU8sQ0FBQyxzQkFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzVCLGVBQU8sQ0FBQyxXQUFXLENBQUMsZUFBSyxDQUFDLFVBQVUsQ0FDbEMsNEdBQTRHLENBQUMsQ0FBQyxDQUFDO0FBRWpILE1BQU0sTUFBTSxHQUFHLGVBQU8sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO0tBQzFDLFdBQVcsQ0FBQyxpREFBaUQsQ0FBQztLQUM5RCxNQUFNLENBQUMsZUFBZSxFQUFFLGlEQUFpRCxFQUFFLEtBQUssQ0FBQztLQUNqRixNQUFNLENBQUMsQ0FBTyxHQUFXLEVBQUUsRUFBRTtJQUM1QixDQUFDLGdFQUFhLFFBQVEsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDL0Qsc0JBQXNCO0lBQ3RCLHdGQUF3RjtJQUN4RiwwQ0FBMEM7QUFDNUMsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUVILE1BQU0sUUFBUSxHQUFHLGVBQU8sQ0FBQyxPQUFPLENBQUMsNkJBQTZCLENBQUM7S0FDOUQsV0FBVyxDQUFDLHNDQUFzQyxDQUFDO0tBQ25ELE1BQU0sQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxDQUFDO0tBQ3pDLE1BQU0sQ0FBQyxDQUFPLElBQVksRUFBRSxXQUFtQixFQUFFLEVBQUU7SUFDbEQsT0FBTztJQUNQLHVDQUF1QztJQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNuQyxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBRUgsZUFBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0tBQy9CLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtJQUNULE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL2NyYS1zY3JpcHRzL2Rpc3QvY21kL2NsaS5qcyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbnJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcicpO1xuaW1wb3J0IHtDb21tYW5kfSBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IHBrIGZyb20gJy4uLy4uL3BhY2thZ2UuanNvbic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuLy8gaW1wb3J0IHtzcGF3bn0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3Byb2Nlc3MtdXRpbHMnO1xuLy8gaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbi8vIGltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgY29uc3QgcHJvZ3JhbSA9IG5ldyBDb21tYW5kKCkubmFtZSgnY3JhZScpO1xuXG5wcm9ncmFtLnZlcnNpb24ocGsudmVyc2lvbik7XG5wcm9ncmFtLmRlc2NyaXB0aW9uKGNoYWxrLmN5YW5CcmlnaHQoXG4gICdFbmhhbmNlIGNyZWF0ZS1yZWFjdC1hcHAgZm9yIG1vbm9yZXBvIHByb2plY3Qgc3RydWN0dXJlIGFuZCBwcm92aWRlIG90aGVyIG9waW5pb25hdGVkIHByb2plY3QgYXJjaGl0ZWN0dXJlJykpO1xuXG5jb25zdCBnZW5DbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2dlbiA8ZGlyPicpXG4uZGVzY3JpcHRpb24oJ0dlbmVyYXRlIGEgc2FtcGxlIHBhY2thZ2UgaW4gc3BlY2lmaWMgZGlyZWN0b3J5Jylcbi5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRG8gbm90IGdlbmVyYXRlIGZpbGVzLCBqdXN0IGxpc3QgbmV3IGZpbGUgbmFtZXMnLCBmYWxzZSlcbi5hY3Rpb24oYXN5bmMgKGRpcjogc3RyaW5nKSA9PiB7XG4gIChhd2FpdCBpbXBvcnQoJy4uL2NtZCcpKS5nZW5QYWNrYWdlKGRpciwgZ2VuQ21kLm9wdHMoKS5kcnlSdW4pO1xuICAvLyBmcy5ta2RpcnBTeW5jKGRpcik7XG4gIC8vIGZzLmNvcHlGaWxlU3luYyhQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAndG1wbC0ubnBtcmMnKSwgUGF0aC5yZXNvbHZlKGRpciwgJy5ucG1yYycpKTtcbiAgLy8gKGF3YWl0IGltcG9ydCgnLi9jbGktaW5pdCcpKS5kZWZhdWx0KCk7XG59KTtcblxuY29uc3QgYnVpbGRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2J1aWxkIDx0eXBlPiA8cGFja2FnZS1uYW1lPicpXG4uZGVzY3JpcHRpb24oJ0Jhc2VkIG9uIHJlYWN0LXNjcmlwdHMgYnVpbGQgY29tbWFuZCcpXG4ub3B0aW9uKCctLWRldicsICdkZXZlbG9wbWVudCBtb2QnLCBmYWxzZSlcbi5hY3Rpb24oYXN5bmMgKHR5cGU6IHN0cmluZywgcGFja2FnZU5hbWU6IHN0cmluZykgPT4ge1xuICAvLyBUT0RPXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhidWlsZENtZC5vcHRzKCkuZGV2KTtcbn0pO1xuXG5wcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2KVxuLmNhdGNoKGUgPT4ge1xuICBjb25zb2xlLmVycm9yKGUpO1xuICBwcm9jZXNzLmV4aXQoMSk7XG59KTtcbiJdfQ==
