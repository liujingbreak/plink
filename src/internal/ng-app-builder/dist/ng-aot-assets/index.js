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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceHtml = exports.randomNumStr = void 0;
const __api_1 = __importDefault(require("__api"));
const html_assets_resolver_1 = require("./html-assets-resolver");
const rxjs_1 = require("rxjs");
const fs = __importStar(require("fs"));
const Path = __importStar(require("path"));
// const chalk = require('chalk');
const log = require('log4js').getLogger('ng-app-builder.ng-aot-assets');
exports.randomNumStr = (Math.random() + '').slice(2, 6);
function replaceHtml(filename, source) {
    return html_assets_resolver_1.replaceForHtml(source, filename, (uri) => {
        let text = uri;
        try {
            // log.warn('replaceHtml for ' + text + ', ' + filename);
            if (text.startsWith('~')) {
                try {
                    text = require.resolve(text.slice(1));
                }
                catch (ex) {
                    text = ex.message || 'Failed to resolve ' + text;
                }
            }
            else if (text.startsWith('npm://')) {
                try {
                    text = require.resolve(text.slice('npm://'.length));
                }
                catch (ex) {
                    text = ex.message || 'Failed to resolve ' + text;
                }
            }
            else {
                filename = fs.realpathSync(filename);
                const pk = __api_1.default.findPackageByFile(filename);
                if (pk == null)
                    return rxjs_1.of('resource not found: ' + text);
                const absPath = Path.resolve(Path.dirname(filename), text);
                text = pk.longName + '/' + Path.relative(pk.realPackagePath, absPath).replace(/\\/g, '/');
            }
            // We can't replace to Assets URL here, because at this moment in AOT mode,
            // Webpack is not ready to run file-loader yet, we have to replace this `[drcp_...]`
            // placeholder with actual URL in ng-aot-assets-loader.ts later
            return rxjs_1.of(`[drcp_${exports.randomNumStr};${text}]`);
        }
        catch (ex) {
            log.error(`Failed to transform HTML ${uri} in ${filename}`);
            return rxjs_1.of(`Failed to transform HTML ${filename} (ex.message)`);
        }
    });
}
exports.replaceHtml = replaceHtml;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9uZy1hb3QtYXNzZXRzL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrREFBd0I7QUFDeEIsaUVBQXdEO0FBQ3hELCtCQUFvQztBQUNwQyx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBRTdCLGtDQUFrQztBQUNsQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLDhCQUE4QixDQUFDLENBQUM7QUFDM0QsUUFBQSxZQUFZLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUU3RCxTQUFnQixXQUFXLENBQUMsUUFBZ0IsRUFBRSxNQUFjO0lBQzFELE9BQU8scUNBQWMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDOUMsSUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDO1FBQ2YsSUFBSTtZQUNGLHlEQUF5RDtZQUV6RCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3hCLElBQUk7b0JBQ0YsSUFBSSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUN2QztnQkFBQyxPQUFPLEVBQUUsRUFBRTtvQkFDWCxJQUFJLEdBQUcsRUFBRSxDQUFDLE9BQU8sSUFBSSxvQkFBb0IsR0FBRyxJQUFJLENBQUM7aUJBQ2xEO2FBQ0Y7aUJBQU0sSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUNwQyxJQUFJO29CQUNGLElBQUksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7aUJBQ3JEO2dCQUFDLE9BQU8sRUFBRSxFQUFFO29CQUNYLElBQUksR0FBRyxFQUFFLENBQUMsT0FBTyxJQUFJLG9CQUFvQixHQUFHLElBQUksQ0FBQztpQkFDbEQ7YUFDRjtpQkFBTTtnQkFDTCxRQUFRLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDckMsTUFBTSxFQUFFLEdBQUcsZUFBRyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMzQyxJQUFJLEVBQUUsSUFBSSxJQUFJO29CQUNaLE9BQU8sU0FBRSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzNELElBQUksR0FBRyxFQUFFLENBQUMsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQzthQUMzRjtZQUNELDJFQUEyRTtZQUMzRSxvRkFBb0Y7WUFDcEYsK0RBQStEO1lBQy9ELE9BQU8sU0FBRSxDQUFDLFNBQVMsb0JBQVksSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO1NBQzdDO1FBQUMsT0FBTyxFQUFFLEVBQUU7WUFDWCxHQUFHLENBQUMsS0FBSyxDQUFDLDRCQUE0QixHQUFHLE9BQU8sUUFBUSxFQUFFLENBQUMsQ0FBQztZQUM1RCxPQUFPLFNBQUUsQ0FBQyw0QkFBNEIsUUFBUSxlQUFlLENBQUMsQ0FBQztTQUNoRTtJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQW5DRCxrQ0FtQ0MiLCJmaWxlIjoiZGlzdC9uZy1hb3QtYXNzZXRzL2luZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXX0=
