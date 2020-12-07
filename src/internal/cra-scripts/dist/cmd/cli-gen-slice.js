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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dist_1 = require("@wfh/plink/wfh/dist");
const template_gen_1 = __importDefault(require("@wfh/plink/wfh/dist/template-gen"));
const path_1 = __importDefault(require("path"));
const cliExt = (program, withGlobalOptions) => {
    const cmd = program.command('redux-slice-gen <filePath>')
        .description('Generate a Redux-toolkit slice (with Redux-observable epic) file skeleton')
        .option('-d', 'dryrun', false)
        .action((filePath) => __awaiter(void 0, void 0, void 0, function* () {
        yield dist_1.initConfigAsync(cmd.opts());
        yield generateSlice(filePath, cmd.opts());
    }));
};
exports.default = cliExt;
function generateSlice(filePath, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const basename = /^(.*?)(?:\.[^.])?$/.exec(path_1.default.basename(filePath))[1];
        yield template_gen_1.default(path_1.default.resolve(__dirname, 'template'), filePath, {
            fileMapping: [[/^slice\.ts$/, filePath]],
            textMapping: {
                SliceName: basename.charAt(0).toUpperCase + basename.slice(1),
                sliceName: basename
            }
        }, { dryrun: opts.d });
    });
}

//# sourceMappingURL=cli-gen-slice.js.map
