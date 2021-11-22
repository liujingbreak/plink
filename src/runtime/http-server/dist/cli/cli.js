"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLE9BQU8sQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDO1NBQzlCLFdBQVcsQ0FBQyw4RUFBOEUsQ0FBQztTQUMzRixNQUFNLENBQUMsS0FBSyxFQUFFLFNBQW1CLEVBQUUsRUFBRTtRQUNwQyxNQUFNLENBQUMsd0RBQWEsb0JBQW9CLEdBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQzFELENBQUMsQ0FBQyxDQUFDO0FBRUwsQ0FBQyxDQUFDO0FBRUYsa0JBQWUsTUFBTSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtDbGlFeHRlbnNpb259IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QnO1xuXG5jb25zdCBjbGlFeHQ6IENsaUV4dGVuc2lvbiA9IChwcm9ncmFtKSA9PiB7XG4gIHByb2dyYW0uY29tbWFuZCgnZ2VuLXNzbC1rZXlzJylcbiAgLmRlc2NyaXB0aW9uKCdVc2UgT3BlbnNzbCB0byBnZW5lcmF0ZSBhIGRldmVsb3BtZW50IHB1cnBvc2VkIGtleSBwYWlyIGZvciBAd2ZoL2h0dHAtc2VydmVyJylcbiAgLmFjdGlvbihhc3luYyAoYXJndW1lbnQxOiBzdHJpbmdbXSkgPT4ge1xuICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWdlbi1zc2wta2V5cycpKS5nZW5Tc2xLZXlzKCk7XG4gIH0pO1xuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGlFeHQ7XG4iXX0=