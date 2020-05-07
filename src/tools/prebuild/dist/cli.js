#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const commander_1 = require("commander");
const package_json_1 = tslib_1.__importDefault(require("../package.json"));
const path_1 = tslib_1.__importDefault(require("path"));
const cfg = require('dr-comp-package/wfh/lib/config.js');
const logConfig = require('dr-comp-package/wfh/lib/logConfig.js');
const package_runner_1 = require("dr-comp-package/wfh/dist/package-runner");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const log4js_1 = tslib_1.__importDefault(require("log4js"));
const program = new commander_1.Command().name('prebuild');
program.version(package_json_1.default.version);
program.option('-c, --config <config-file>', 'Read config files, if there are multiple files, the latter one overrides previous one', (curr, prev) => prev.concat(curr), []);
program.option('--prop <property-path=value as JSON | literal>', '<property-path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string\n e.g.\n', (curr, prev) => prev.concat(curr), []);
program.option('--secret <credential code>', 'credential code for deploy to "prod" environment');
// ----------- deploy ----------
const deployCmd = program.command('deploy <app> [ts-scripts#function-or-shell]')
    .option('--static', 'as an static resource build', false)
    .option('--no-push-branch', 'push to release branch', false)
    // .option('--secret <secret>', 'credential word')
    .action((app, scriptsFile) => tslib_1.__awaiter(this, void 0, void 0, function* () {
    const opt = deployCmd.opts();
    yield cfg.init({
        c: program.opts().config.length === 0 ? undefined : program.opts().config,
        prop: program.opts().prop
    });
    logConfig(cfg());
    package_runner_1.prepareLazyNodeInjector({});
    const cliDeploy = require('./cli-deploy').default;
    yield cliDeploy(opt.static, opt.env, app, deployCmd.opts().pushBranch, program.opts().secret || null, scriptsFile);
}));
createEnvOption(deployCmd);
// -------- githash ----------
const githashCmd = createEnvOption(program.command('githash'), false)
    .action(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
    const Artifacts = require('./artifacts');
    if (githashCmd.opts().env) {
        // tslint:disable-next-line: no-console
        console.log(yield Artifacts.stringifyListVersions(githashCmd.opts().env));
    }
    else {
        // tslint:disable-next-line: no-console
        console.log(yield Artifacts.stringifyListAllVersions());
    }
}));
// ------ send --------
const sendCmd = createEnvOption(program.command('send <app-name> <zip-file>'))
    .description('Send static resource to remote server')
    .action((appName, zip) => tslib_1.__awaiter(this, void 0, void 0, function* () {
    yield cfg.init({
        c: program.opts().config.length === 0 ? undefined : program.opts().config,
        prop: program.opts().prop
    });
    logConfig(cfg());
    package_runner_1.prepareLazyNodeInjector({});
    yield require('./_send-patch').send(sendCmd.opts().env, appName, zip, program.opts().secret);
}));
// ------ mockzip --------
const mockzipCmd = program.command('mockzip');
mockzipCmd.option('-d,--dir <dir>', 'create a mock zip file in specific directory');
mockzipCmd.action(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
    yield cfg.init({
        c: program.opts().config.length === 0 ? undefined : program.opts().config,
        prop: program.opts().prop
    });
    logConfig(cfg());
    const Artifacts = require('./artifacts');
    const fileContent = '' + new Date().toUTCString();
    const file = mockzipCmd.opts().dir ? path_1.default.resolve(mockzipCmd.opts().dir, 'prebuild-mock.zip') : cfg.resolve('destDir', 'prebuild-mock.zip');
    fs_extra_1.default.mkdirpSync(path_1.default.dirname(file));
    yield Artifacts.writeMockZip(file, fileContent);
    const log = log4js_1.default.getLogger('prebuild');
    // tslint:disable-next-line: no-console
    log.info('Mock zip:', file);
}));
// ---------- keypair ------------
const keypairCmd = program.command('keypair [file-name]')
    .description('Generate a new asymmetric key pair')
    .action((fileName) => tslib_1.__awaiter(this, void 0, void 0, function* () {
    const genKeypair = require('./cli-keypair').default;
    yield genKeypair(fileName, keypairCmd.opts());
}));
program.usage(program.usage() + chalk_1.default.blueBright('\nPrebuild and deploy static resource to file server and compile node server side TS files'));
program.parseAsync(process.argv);
function createEnvOption(cmd, required = true) {
    const func = required ? cmd.requiredOption : cmd.option;
    return func.call(cmd, '--env <local | dev | test | stage | prod>', 'target environment, e.g. "local", "dev", "test", "stage", "prod", default as all environment');
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFFQSx5Q0FBNkM7QUFDN0MsMkVBQWlDO0FBQ2pDLHdEQUF3QjtBQUV4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsbUNBQW1DLENBQXNCLENBQUM7QUFDOUUsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7QUFDbEUsNEVBQWdGO0FBR2hGLDBEQUEwQjtBQUMxQixnRUFBMEI7QUFJMUIsNERBQTRCO0FBRzVCLE1BQU0sT0FBTyxHQUFHLElBQUksbUJBQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUUvQyxPQUFPLENBQUMsT0FBTyxDQUFDLHNCQUFFLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDNUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyw0QkFBNEIsRUFDekMsdUZBQXVGLEVBQ3ZGLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFjLENBQUMsQ0FBQztBQUNyRCxPQUFPLENBQUMsTUFBTSxDQUFDLGdEQUFnRCxFQUM3RCw4SUFBOEksRUFDOUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQWMsQ0FBQyxDQUFDO0FBQ3JELE9BQU8sQ0FBQyxNQUFNLENBQUMsNEJBQTRCLEVBQUUsa0RBQWtELENBQUMsQ0FBQztBQUVqRyxnQ0FBZ0M7QUFDaEMsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyw2Q0FBNkMsQ0FBQztLQUMvRSxNQUFNLENBQUMsVUFBVSxFQUFFLDZCQUE2QixFQUFFLEtBQUssQ0FBQztLQUN4RCxNQUFNLENBQUMsa0JBQWtCLEVBQUUsd0JBQXdCLEVBQUUsS0FBSyxDQUFDO0lBQzVELGtEQUFr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QUFBLENBQUMsQ0FBQztBQUVILGtDQUFrQztBQUNsQyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDO0tBQ3hELFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQztLQUNqRCxNQUFNLENBQUMsQ0FBTyxRQUFRLEVBQUUsRUFBRTtJQUN6QixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsT0FBNkIsQ0FBQztJQUMxRSxNQUFNLFVBQVUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7QUFDaEQsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUlILE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLGVBQUssQ0FBQyxVQUFVLENBQzlDLDRGQUE0RixDQUFDLENBQUMsQ0FBQztBQUNqRyxPQUFPLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUVqQyxTQUFTLGVBQWUsQ0FBQyxHQUFzQixFQUFFLFFBQVEsR0FBRyxJQUFJO0lBQzlELE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztJQUV4RCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLDJDQUEyQyxFQUFFLDhGQUE4RixDQUFDLENBQUM7QUFDckssQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL3ByZWJ1aWxkL2Rpc3QvY2xpLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuXG5pbXBvcnQgY29tbWFuZGVyLCB7Q29tbWFuZH0gZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCBwayBmcm9tICcuLi9wYWNrYWdlLmpzb24nO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmNvbnN0IGNmZyA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL2NvbmZpZy5qcycpIGFzIHR5cGVvZiBhcGkuY29uZmlnO1xuY29uc3QgbG9nQ29uZmlnID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvbG9nQ29uZmlnLmpzJyk7XG5pbXBvcnQge3ByZXBhcmVMYXp5Tm9kZUluamVjdG9yfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvcGFja2FnZS1ydW5uZXInO1xuaW1wb3J0ICogYXMgX0FydGlmYWN0cyBmcm9tICcuL2FydGlmYWN0cyc7XG5pbXBvcnQgKiBhcyBzcCBmcm9tICcuL19zZW5kLXBhdGNoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgX3ByZWJ1aWxkUG9zdCBmcm9tICcuL3ByZWJ1aWxkLXBvc3QnO1xuLy8gaW1wb3J0IHtzcGF3bn0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IF9jbGlEZXBsb3kgZnJvbSAnLi9jbGktZGVwbG95JztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBfZ2VuS2V5cGFpciBmcm9tICcuL2NsaS1rZXlwYWlyJztcblxuY29uc3QgcHJvZ3JhbSA9IG5ldyBDb21tYW5kKCkubmFtZSgncHJlYnVpbGQnKTtcblxucHJvZ3JhbS52ZXJzaW9uKHBrLnZlcnNpb24pO1xucHJvZ3JhbS5vcHRpb24oJy1jLCAtLWNvbmZpZyA8Y29uZmlnLWZpbGU+JyxcbiAgJ1JlYWQgY29uZmlnIGZpbGVzLCBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgZmlsZXMsIHRoZSBsYXR0ZXIgb25lIG92ZXJyaWRlcyBwcmV2aW91cyBvbmUnLFxuICAoY3VyciwgcHJldikgPT4gcHJldi5jb25jYXQoY3VyciksIFtdIGFzIHN0cmluZ1tdKTtcbnByb2dyYW0ub3B0aW9uKCctLXByb3AgPHByb3BlcnR5LXBhdGg9dmFsdWUgYXMgSlNPTiB8IGxpdGVyYWw+JyxcbiAgJzxwcm9wZXJ0eS1wYXRoPj08dmFsdWUgYXMgSlNPTiB8IGxpdGVyYWw+IC4uLiBkaXJlY3RseSBzZXQgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzLCBwcm9wZXJ0eSBuYW1lIGlzIGxvZGFzaC5zZXQoKSBwYXRoLWxpa2Ugc3RyaW5nXFxuIGUuZy5cXG4nLFxuICAoY3VyciwgcHJldikgPT4gcHJldi5jb25jYXQoY3VyciksIFtdIGFzIHN0cmluZ1tdKTtcbnByb2dyYW0ub3B0aW9uKCctLXNlY3JldCA8Y3JlZGVudGlhbCBjb2RlPicsICdjcmVkZW50aWFsIGNvZGUgZm9yIGRlcGxveSB0byBcInByb2RcIiBlbnZpcm9ubWVudCcpO1xuXG4vLyAtLS0tLS0tLS0tLSBkZXBsb3kgLS0tLS0tLS0tLVxuY29uc3QgZGVwbG95Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdkZXBsb3kgPGFwcD4gW3RzLXNjcmlwdHMjZnVuY3Rpb24tb3Itc2hlbGxdJylcbi5vcHRpb24oJy0tc3RhdGljJywgJ2FzIGFuIHN0YXRpYyByZXNvdXJjZSBidWlsZCcsIGZhbHNlKVxuLm9wdGlvbignLS1uby1wdXNoLWJyYW5jaCcsICdwdXNoIHRvIHJlbGVhc2UgYnJhbmNoJywgZmFsc2UpXG4vLyAub3B0aW9uKCctLXNlY3JldCA8c2VjcmV0PicsICdjcmVkZW50aWFsIHdvcmQnKVxuLmFjdGlvbihhc3luYyAoYXBwOiBzdHJpbmcsIHNjcmlwdHNGaWxlPzogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IG9wdCA9IGRlcGxveUNtZC5vcHRzKCk7XG4gIGF3YWl0IGNmZy5pbml0KHtcbiAgICBjOiAocHJvZ3JhbS5vcHRzKCkuY29uZmlnIGFzIHN0cmluZ1tdKS5sZW5ndGggPT09IDAgPyB1bmRlZmluZWQgOiBwcm9ncmFtLm9wdHMoKS5jb25maWcsXG4gICAgcHJvcDogKHByb2dyYW0ub3B0cygpLnByb3AgYXMgc3RyaW5nW10pXG4gIH0pO1xuICBsb2dDb25maWcoY2ZnKCkpO1xuICBwcmVwYXJlTGF6eU5vZGVJbmplY3Rvcih7fSk7XG5cbiAgY29uc3QgY2xpRGVwbG95ID0gKHJlcXVpcmUoJy4vY2xpLWRlcGxveScpLmRlZmF1bHQgYXMgdHlwZW9mIF9jbGlEZXBsb3kpO1xuICBhd2FpdCBjbGlEZXBsb3kob3B0LnN0YXRpYywgb3B0LmVudiwgYXBwLCBkZXBsb3lDbWQub3B0cygpLnB1c2hCcmFuY2gsIHByb2dyYW0ub3B0cygpLnNlY3JldCB8fCBudWxsLCBzY3JpcHRzRmlsZSk7XG59KTtcbmNyZWF0ZUVudk9wdGlvbihkZXBsb3lDbWQpO1xuXG5cbi8vIC0tLS0tLS0tIGdpdGhhc2ggLS0tLS0tLS0tLVxuY29uc3QgZ2l0aGFzaENtZCA9IGNyZWF0ZUVudk9wdGlvbihwcm9ncmFtLmNvbW1hbmQoJ2dpdGhhc2gnKSwgZmFsc2UpXG4uYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgY29uc3QgQXJ0aWZhY3RzOiB0eXBlb2YgX0FydGlmYWN0cyA9IHJlcXVpcmUoJy4vYXJ0aWZhY3RzJyk7XG4gIGlmIChnaXRoYXNoQ21kLm9wdHMoKS5lbnYpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhhd2FpdCBBcnRpZmFjdHMuc3RyaW5naWZ5TGlzdFZlcnNpb25zKGdpdGhhc2hDbWQub3B0cygpLmVudikpO1xuICB9IGVsc2Uge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGF3YWl0IEFydGlmYWN0cy5zdHJpbmdpZnlMaXN0QWxsVmVyc2lvbnMoKSk7XG4gIH1cbn0pO1xuXG4vLyAtLS0tLS0gc2VuZCAtLS0tLS0tLVxuY29uc3Qgc2VuZENtZCA9IGNyZWF0ZUVudk9wdGlvbihwcm9ncmFtLmNvbW1hbmQoJ3NlbmQgPGFwcC1uYW1lPiA8emlwLWZpbGU+JykpXG4uZGVzY3JpcHRpb24oJ1NlbmQgc3RhdGljIHJlc291cmNlIHRvIHJlbW90ZSBzZXJ2ZXInKVxuLmFjdGlvbihhc3luYyAoYXBwTmFtZSwgemlwKSA9PiB7XG4gIGF3YWl0IGNmZy5pbml0KHtcbiAgICBjOiAocHJvZ3JhbS5vcHRzKCkuY29uZmlnIGFzIHN0cmluZ1tdKS5sZW5ndGggPT09IDAgPyB1bmRlZmluZWQgOiBwcm9ncmFtLm9wdHMoKS5jb25maWcsXG4gICAgcHJvcDogKHByb2dyYW0ub3B0cygpLnByb3AgYXMgc3RyaW5nW10pXG4gIH0pO1xuICBsb2dDb25maWcoY2ZnKCkpO1xuICBwcmVwYXJlTGF6eU5vZGVJbmplY3Rvcih7fSk7XG5cbiAgYXdhaXQgKHJlcXVpcmUoJy4vX3NlbmQtcGF0Y2gnKSBhcyB0eXBlb2Ygc3ApLnNlbmQoc2VuZENtZC5vcHRzKCkuZW52LCBhcHBOYW1lLCB6aXAsIHByb2dyYW0ub3B0cygpLnNlY3JldCk7XG59KTtcblxuXG4vLyAtLS0tLS0gbW9ja3ppcCAtLS0tLS0tLVxuY29uc3QgbW9ja3ppcENtZCA9IHByb2dyYW0uY29tbWFuZCgnbW9ja3ppcCcpO1xubW9ja3ppcENtZC5vcHRpb24oJy1kLC0tZGlyIDxkaXI+JywgJ2NyZWF0ZSBhIG1vY2sgemlwIGZpbGUgaW4gc3BlY2lmaWMgZGlyZWN0b3J5Jyk7XG5tb2NremlwQ21kLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gIGF3YWl0IGNmZy5pbml0KHtcbiAgICBjOiAocHJvZ3JhbS5vcHRzKCkuY29uZmlnIGFzIHN0cmluZ1tdKS5sZW5ndGggPT09IDAgPyB1bmRlZmluZWQgOiBwcm9ncmFtLm9wdHMoKS5jb25maWcsXG4gICAgcHJvcDogKHByb2dyYW0ub3B0cygpLnByb3AgYXMgc3RyaW5nW10pXG4gIH0pO1xuICBsb2dDb25maWcoY2ZnKCkpO1xuXG4gIGNvbnN0IEFydGlmYWN0czogdHlwZW9mIF9BcnRpZmFjdHMgPSByZXF1aXJlKCcuL2FydGlmYWN0cycpO1xuXG4gIGNvbnN0IGZpbGVDb250ZW50ID0gJycgKyBuZXcgRGF0ZSgpLnRvVVRDU3RyaW5nKCk7XG5cbiAgY29uc3QgZmlsZSA9IG1vY2t6aXBDbWQub3B0cygpLmRpciA/IFBhdGgucmVzb2x2ZShtb2NremlwQ21kLm9wdHMoKS5kaXIsICdwcmVidWlsZC1tb2NrLnppcCcpIDogY2ZnLnJlc29sdmUoJ2Rlc3REaXInLCAncHJlYnVpbGQtbW9jay56aXAnKTtcbiAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUoZmlsZSkpO1xuXG4gIGF3YWl0IEFydGlmYWN0cy53cml0ZU1vY2taaXAoZmlsZSwgZmlsZUNvbnRlbnQpO1xuICBjb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwcmVidWlsZCcpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgbG9nLmluZm8oJ01vY2sgemlwOicsIGZpbGUpO1xufSk7XG5cbi8vIC0tLS0tLS0tLS0ga2V5cGFpciAtLS0tLS0tLS0tLS1cbmNvbnN0IGtleXBhaXJDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2tleXBhaXIgW2ZpbGUtbmFtZV0nKVxuLmRlc2NyaXB0aW9uKCdHZW5lcmF0ZSBhIG5ldyBhc3ltbWV0cmljIGtleSBwYWlyJylcbi5hY3Rpb24oYXN5bmMgKGZpbGVOYW1lKSA9PiB7XG4gIGNvbnN0IGdlbktleXBhaXIgPSByZXF1aXJlKCcuL2NsaS1rZXlwYWlyJykuZGVmYXVsdCBhcyB0eXBlb2YgX2dlbktleXBhaXI7XG4gIGF3YWl0IGdlbktleXBhaXIoZmlsZU5hbWUsIGtleXBhaXJDbWQub3B0cygpKTtcbn0pO1xuXG5cblxucHJvZ3JhbS51c2FnZShwcm9ncmFtLnVzYWdlKCkgKyBjaGFsay5ibHVlQnJpZ2h0KFxuICAnXFxuUHJlYnVpbGQgYW5kIGRlcGxveSBzdGF0aWMgcmVzb3VyY2UgdG8gZmlsZSBzZXJ2ZXIgYW5kIGNvbXBpbGUgbm9kZSBzZXJ2ZXIgc2lkZSBUUyBmaWxlcycpKTtcbnByb2dyYW0ucGFyc2VBc3luYyhwcm9jZXNzLmFyZ3YpO1xuXG5mdW5jdGlvbiBjcmVhdGVFbnZPcHRpb24oY21kOiBjb21tYW5kZXIuQ29tbWFuZCwgcmVxdWlyZWQgPSB0cnVlKTogUmV0dXJuVHlwZTxjb21tYW5kZXIuQ29tbWFuZFsncmVxdWlyZWRPcHRpb24nXT4ge1xuICBjb25zdCBmdW5jID0gcmVxdWlyZWQgPyBjbWQucmVxdWlyZWRPcHRpb24gOiBjbWQub3B0aW9uO1xuXG4gIHJldHVybiBmdW5jLmNhbGwoY21kLCAnLS1lbnYgPGxvY2FsIHwgZGV2IHwgdGVzdCB8IHN0YWdlIHwgcHJvZD4nLCAndGFyZ2V0IGVudmlyb25tZW50LCBlLmcuIFwibG9jYWxcIiwgXCJkZXZcIiwgXCJ0ZXN0XCIsIFwic3RhZ2VcIiwgXCJwcm9kXCIsIGRlZmF1bHQgYXMgYWxsIGVudmlyb25tZW50Jyk7XG59XG5cbiJdfQ==
