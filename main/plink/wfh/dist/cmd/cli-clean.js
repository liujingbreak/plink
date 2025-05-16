"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cliExt = (program) => {
    program.command('upgrade [package...]')
        .description('Hellow command description')
        .option('-f, --file <spec>', 'run single file')
        .action(async (packages) => {
        // TODO
    });
};
exports.default = cliExt;
//# sourceMappingURL=cli-clean.js.map