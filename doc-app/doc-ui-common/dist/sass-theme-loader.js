"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const plink_1 = require("@wfh/plink");
const __plink_1 = __importDefault(require("__plink"));
// import path from 'path';
const log = plink_1.logger.getLogger('@wfh/doc-ui-common.sass-theme-loader');
let themeName;
const loader = function (source, sourceMap) {
    const cb = this.async();
    // log.info(source);
    const file = this.resourcePath;
    const pkg = __plink_1.default.findPackageByFile(file);
    if (themeName == null) {
        themeName = plink_1.config()['@wfh/doc-ui-common'].materialTheme;
        themeName = themeName === 'default' ? '' : '-' + themeName;
        log.info('Use Material theme sass file: theme' + themeName);
    }
    if (pkg && pkg.name === '@wfh/doc-ui-common') {
        source = source.replace(/@use\s+['"'](?:[^'"/]*?\/)*theme['"']/m, `@use "theme${themeName}"`);
    }
    cb(null, source, sourceMap);
};
exports.default = loader;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Fzcy10aGVtZS1sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzYXNzLXRoZW1lLWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUNBLHNDQUEwQztBQUMxQyxzREFBNEI7QUFDNUIsMkJBQTJCO0FBRTNCLE1BQU0sR0FBRyxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsc0NBQXNDLENBQUMsQ0FBQztBQUVyRSxJQUFJLFNBQWlCLENBQUM7QUFFdEIsTUFBTSxNQUFNLEdBQWtCLFVBQVMsTUFBTSxFQUFFLFNBQVM7SUFDdEQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRyxDQUFDO0lBQ3pCLG9CQUFvQjtJQUNwQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQy9CLE1BQU0sR0FBRyxHQUFHLGlCQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUMsSUFBSSxTQUFTLElBQUksSUFBSSxFQUFFO1FBQ3JCLFNBQVMsR0FBRyxjQUFNLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLGFBQWEsQ0FBQztRQUN6RCxTQUFTLEdBQUcsU0FBUyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsU0FBUyxDQUFDO1FBQzNELEdBQUcsQ0FBQyxJQUFJLENBQUMscUNBQXFDLEdBQUcsU0FBUyxDQUFDLENBQUM7S0FDN0Q7SUFDRCxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLG9CQUFvQixFQUFFO1FBQzVDLE1BQU0sR0FBSSxNQUFpQixDQUFDLE9BQU8sQ0FBQyx3Q0FBd0MsRUFBRSxjQUFjLFNBQVMsR0FBRyxDQUFDLENBQUM7S0FDM0c7SUFDRCxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUM7QUFFRixrQkFBZSxNQUFNLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2xvYWRlcn0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQge2xvZ2dlciwgY29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBwbGluayBmcm9tICdfX3BsaW5rJztcbi8vIGltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5jb25zdCBsb2cgPSBsb2dnZXIuZ2V0TG9nZ2VyKCdAd2ZoL2RvYy11aS1jb21tb24uc2Fzcy10aGVtZS1sb2FkZXInKTtcblxubGV0IHRoZW1lTmFtZTogc3RyaW5nO1xuXG5jb25zdCBsb2FkZXI6IGxvYWRlci5Mb2FkZXIgPSBmdW5jdGlvbihzb3VyY2UsIHNvdXJjZU1hcCkge1xuICBjb25zdCBjYiA9IHRoaXMuYXN5bmMoKSE7XG4gIC8vIGxvZy5pbmZvKHNvdXJjZSk7XG4gIGNvbnN0IGZpbGUgPSB0aGlzLnJlc291cmNlUGF0aDtcbiAgY29uc3QgcGtnID0gcGxpbmsuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gIGlmICh0aGVtZU5hbWUgPT0gbnVsbCkge1xuICAgIHRoZW1lTmFtZSA9IGNvbmZpZygpWydAd2ZoL2RvYy11aS1jb21tb24nXS5tYXRlcmlhbFRoZW1lO1xuICAgIHRoZW1lTmFtZSA9IHRoZW1lTmFtZSA9PT0gJ2RlZmF1bHQnID8gJycgOiAnLScgKyB0aGVtZU5hbWU7XG4gICAgbG9nLmluZm8oJ1VzZSBNYXRlcmlhbCB0aGVtZSBzYXNzIGZpbGU6IHRoZW1lJyArIHRoZW1lTmFtZSk7XG4gIH1cbiAgaWYgKHBrZyAmJiBwa2cubmFtZSA9PT0gJ0B3ZmgvZG9jLXVpLWNvbW1vbicpIHtcbiAgICBzb3VyY2UgPSAoc291cmNlIGFzIHN0cmluZykucmVwbGFjZSgvQHVzZVxccytbJ1wiJ10oPzpbXidcIi9dKj9cXC8pKnRoZW1lWydcIiddL20sIGBAdXNlIFwidGhlbWUke3RoZW1lTmFtZX1cImApO1xuICB9XG4gIGNiKG51bGwsIHNvdXJjZSwgc291cmNlTWFwKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGxvYWRlcjtcbiJdfQ==