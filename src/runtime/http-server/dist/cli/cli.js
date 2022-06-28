"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const cliExt = (program) => {
    program.command('gen-ssl-keys')
        .description('Use Openssl to generate a development purposed key pair for @wfh/http-server')
        .action(async (argument1) => {
        await (await Promise.resolve().then(() => __importStar(require('./cli-gen-ssl-keys')))).genSslKeys();
    });
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFQSxNQUFNLE1BQU0sR0FBaUIsQ0FBQyxPQUFPLEVBQUUsRUFBRTtJQUN2QyxPQUFPLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQztTQUM5QixXQUFXLENBQUMsOEVBQThFLENBQUM7U0FDM0YsTUFBTSxDQUFDLEtBQUssRUFBRSxTQUFtQixFQUFFLEVBQUU7UUFDcEMsTUFBTSxDQUFDLHdEQUFhLG9CQUFvQixHQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUMxRCxDQUFDLENBQUMsQ0FBQztBQUVMLENBQUMsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q2xpRXh0ZW5zaW9ufSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0JztcblxuY29uc3QgY2xpRXh0OiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSkgPT4ge1xuICBwcm9ncmFtLmNvbW1hbmQoJ2dlbi1zc2wta2V5cycpXG4gIC5kZXNjcmlwdGlvbignVXNlIE9wZW5zc2wgdG8gZ2VuZXJhdGUgYSBkZXZlbG9wbWVudCBwdXJwb3NlZCBrZXkgcGFpciBmb3IgQHdmaC9odHRwLXNlcnZlcicpXG4gIC5hY3Rpb24oYXN5bmMgKGFyZ3VtZW50MTogc3RyaW5nW10pID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1nZW4tc3NsLWtleXMnKSkuZ2VuU3NsS2V5cygpO1xuICB9KTtcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xpRXh0O1xuIl19