"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstance = exports.default = void 0;
const replace_require_1 = __importDefault(require("./replace-require"));
exports.default = replace_require_1.default;
let instance;
function getInstance(options) {
    if (instance == null)
        instance = new replace_require_1.default(options);
    return instance;
}
exports.getInstance = getInstance;
//# sourceMappingURL=index.js.map