"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Node option prever-symlink does not effect on "main" file, so this file acts as main file to call real file from
 * a symlink location
 */
const path_1 = __importDefault(require("path"));
require(path_1.default.resolve(process.cwd(), 'node_modules', process.env.__plink_fork_main));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yay1wcmVzZXJ2ZS1zeW1saW5rLW1haW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9mb3JrLXByZXNlcnZlLXN5bWxpbmstbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBOzs7R0FHRztBQUNILGdEQUF3QjtBQUN4QixPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsY0FBYyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWtCLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBOb2RlIG9wdGlvbiBwcmV2ZXItc3ltbGluayBkb2VzIG5vdCBlZmZlY3Qgb24gXCJtYWluXCIgZmlsZSwgc28gdGhpcyBmaWxlIGFjdHMgYXMgbWFpbiBmaWxlIHRvIGNhbGwgcmVhbCBmaWxlIGZyb21cbiAqIGEgc3ltbGluayBsb2NhdGlvblxuICovXG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbnJlcXVpcmUoUGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdub2RlX21vZHVsZXMnLCBwcm9jZXNzLmVudi5fX3BsaW5rX2ZvcmtfbWFpbiEpKTtcbiJdfQ==