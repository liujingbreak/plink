"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const replace_and_inject_1 = __importDefault(require("./tsjs/replace-and-inject"));
const loader = function (source, sourceMap) {
    const file = this.resourcePath;
    const opts = this.query;
    // console.log(file);
    const cb = this.async();
    try {
        const replaced = replace_and_inject_1.default(file, source, opts.injector, opts.tsConfigFile, opts.compileExpContex ? opts.compileExpContex(file) : {});
        cb(null, replaced, sourceMap);
    }
    catch (e) {
        console.error('[webpack-common.ts-loader]processing: ' + file, e);
        return cb(e);
    }
};
exports.default = loader;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL2ludGVybmFsL3dlYnBhY2stY29tbW9uL3RzL3RzLWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUNBLG1GQUF5RDtBQVN6RCxNQUFNLE1BQU0sR0FBcUIsVUFBUyxNQUFNLEVBQUUsU0FBUztJQUN6RCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQy9CLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFnQixDQUFDO0lBQ25DLHFCQUFxQjtJQUNyQixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDeEIsSUFBSTtRQUNGLE1BQU0sUUFBUSxHQUFHLDRCQUFnQixDQUFDLElBQUksRUFBRSxNQUFnQixFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFDeEYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzVELEVBQUcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0tBQ2hDO0lBQUMsT0FBTyxDQUFDLEVBQUU7UUFDVixPQUFPLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxHQUFHLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRSxPQUFPLEVBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNmO0FBQ0gsQ0FBQyxDQUFDO0FBRUYsa0JBQWUsTUFBTSxDQUFDIiwiZmlsZSI6ImludGVybmFsL3dlYnBhY2stY29tbW9uL2Rpc3QvdHMtbG9hZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXX0=
