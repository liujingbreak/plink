"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable: member-ordering
// import {Transform} from 'stream';
const log4js_1 = __importDefault(require("log4js"));
const lodash_1 = __importDefault(require("lodash"));
const node_inject_1 = __importDefault(require("./node-inject"));
const parse_ts_import_1 = require("./parse-ts-import");
const log = log4js_1.default.getLogger('require-injector.replace-require');
// function replace(code: string, factoryMaps: FactoryMap[], fileParam: any, ast: any) {
//   return new ReplaceRequire().replace(code, factoryMaps, fileParam, ast);
//   // return ReplaceRequire.prototype.replace.apply(new ReplaceRequire(), arguments);
// }
class ReplaceRequire extends node_inject_1.default {
    /**
       * opts.enableFactoryParamFile `true` if you need "filePath" as parameter for .factory(factory(filePath) {...})
       * 	this will expose original source file path in code, default is `false`.
       */
    constructor(opts) {
        super(opts);
        if (!(this instanceof ReplaceRequire)) {
            return new ReplaceRequire(opts);
        }
        this.tsParser = new parse_ts_import_1.TypescriptParser(this);
        // this.transform = function(file: string) {
        //   if (!_.endsWith(file, '.js')) {
        //     return through();
        //   }
        //   let data = '';
        //   return through(write, end);
        //   function write(buf: string, enc: string, next: through.TransformCallback) {
        //     data += buf; next();
        //   }
        //   function end(next: through.TransformCallback) {
        //     this.push(self.injectToFile(file, data));
        //     next();
        //   }
        // };
    }
    changeTsCompiler(tsCompiler) {
        this.tsParser.ts = tsCompiler;
    }
    cleanup() {
        this.removeAllListeners('replace');
        super.cleanup();
    }
    /**
       * Here "inject" is actually "replacement".
       Parsing a matched file to Acorn AST tree, looking for matched `require(module)` expression and replacing
        them with proper values, expression.
       * @name injectToFile
       * @param  {string} filePath file path
       * @param  {string} code     content of file
       * @param  {object} ast      optional, if you have already parsed code to AST tree, pass it to this function which
       *  helps to speed up process by skip parsing again.
       * @return {string}          replaced source code, if there is no injectable `require()`,
       * 	same source code will be returned.
       */
    injectToFile(filePath, code, ast) {
        return this.injectToFileWithPatchInfo(filePath, code, ast).replaced;
    }
    /**
       * @return patch information, so that other parser tool can resue AST and
       * calculate position with these patch information
       */
    injectToFileWithPatchInfo(filePath, code, ast) {
        let factoryMaps;
        try {
            factoryMaps = this.factoryMapsForFile(filePath);
            if (factoryMaps.length > 0) {
                // if (/\.tsx?$/.test(filePath)) {
                const result = this.tsParser.replace(code, factoryMaps, filePath, ast);
                // } else
                // replaced = this.replace(code, factoryMaps, filePath, ast);
                if (result.replaced != null)
                    return result;
            }
            return { replaced: code, patches: [], ast: this.tsParser.srcfile };
        }
        catch (e) {
            log.error('filePath: ' + filePath);
            if (factoryMaps != null)
                log.error(lodash_1.default.map(factoryMaps, factoryMap => factoryMap.requireMap).join());
            log.error(e.stack);
            throw e;
        }
    }
    addPatch(patches, start, end, moduleName, replaceType, fmaps, fileParam) {
        const self = this;
        let setting;
        for (const factoryMap of fmaps) {
            setting = factoryMap.matchRequire(moduleName);
            if (setting) {
                const replacement = factoryMap.getReplacement(setting, replaceType, fileParam);
                if (replacement != null) {
                    patches.push({
                        start,
                        end,
                        replacement: typeof (replacement) === 'string' ?
                            replacement
                            : (replacement).code
                    });
                    self.emit('replace', moduleName, replacement);
                }
                break;
            }
        }
    }
}
exports.default = ReplaceRequire;
// export function parseCode(code: string) {
//   var ast;
//   var firstCompileErr = null;
//   try {
//     ast = acornjsx.parse(code, {allowHashBang: true, sourceType: 'module'});
//   } catch (err) {
//     firstCompileErr = err;
//     try {
//       ast = acorn.parse(code, {allowHashBang: true});
//     } catch (err2) {
//       log.error('Possible ES compilation error', firstCompileErr);
//       firstCompileErr.message += '\nOr ' + err2.message;
//       firstCompileErr.stack += '\nAnother possible compilation error is\n' + err2.stack;
//       throw firstCompileErr;
//     }
//   }
//   return ast;
// }
//# sourceMappingURL=replace-require.js.map