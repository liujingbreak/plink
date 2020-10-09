"use strict";
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
const dist_1 = require("@wfh/plink/wfh/dist");
const cliExt = (program, withGlobalOptions) => {
    const cmd = program.command('jasmine [package...]')
        .description('run jasmine test spec from specific packages')
        .option('-f, --file <spec>', 'run single file')
        .action((packages) => __awaiter(void 0, void 0, void 0, function* () {
        yield dist_1.initConfigAsync(cmd.opts());
        // TODO
    }));
};
exports.default = cliExt;

//# sourceMappingURL=jasmine-cli.js.map
