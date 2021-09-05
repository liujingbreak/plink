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
let dir = process.cwd();
const root = path_1.default.parse(dir).root;
let target;
while (true) {
    target = path_1.default.resolve(dir, 'node_modules', process.env.__plink_fork_main);
    try {
        require.resolve(target);
        break;
    }
    catch (ex) {
        if (dir === root) {
            console.error(ex);
            break;
        }
        dir = path_1.default.dirname(dir);
    }
}
require(target);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yay1wcmVzZXJ2ZS1zeW1saW5rLW1haW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9mb3JrLXByZXNlcnZlLXN5bWxpbmstbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBOzs7R0FHRztBQUNILGdEQUF3QjtBQUV4QixJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDeEIsTUFBTSxJQUFJLEdBQUcsY0FBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDbEMsSUFBSSxNQUFjLENBQUM7QUFDbkIsT0FBTyxJQUFJLEVBQUU7SUFDWCxNQUFNLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWtCLENBQUMsQ0FBQztJQUMzRSxJQUFJO1FBQ0YsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN4QixNQUFNO0tBQ1A7SUFBQyxPQUFPLEVBQUUsRUFBRTtRQUNYLElBQUksR0FBRyxLQUFLLElBQUksRUFBRTtZQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2xCLE1BQU07U0FDUDtRQUNELEdBQUcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3pCO0NBQ0Y7QUFDRCxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIE5vZGUgb3B0aW9uIHByZXZlci1zeW1saW5rIGRvZXMgbm90IGVmZmVjdCBvbiBcIm1haW5cIiBmaWxlLCBzbyB0aGlzIGZpbGUgYWN0cyBhcyBtYWluIGZpbGUgdG8gY2FsbCByZWFsIGZpbGUgZnJvbVxuICogYSBzeW1saW5rIGxvY2F0aW9uXG4gKi9cbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuXG5sZXQgZGlyID0gcHJvY2Vzcy5jd2QoKTtcbmNvbnN0IHJvb3QgPSBQYXRoLnBhcnNlKGRpcikucm9vdDtcbmxldCB0YXJnZXQ6IHN0cmluZztcbndoaWxlICh0cnVlKSB7XG4gIHRhcmdldCA9IFBhdGgucmVzb2x2ZShkaXIsICdub2RlX21vZHVsZXMnLCBwcm9jZXNzLmVudi5fX3BsaW5rX2ZvcmtfbWFpbiEpO1xuICB0cnkge1xuICAgIHJlcXVpcmUucmVzb2x2ZSh0YXJnZXQpO1xuICAgIGJyZWFrO1xuICB9IGNhdGNoIChleCkge1xuICAgIGlmIChkaXIgPT09IHJvb3QpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXgpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGRpciA9IFBhdGguZGlybmFtZShkaXIpO1xuICB9XG59XG5yZXF1aXJlKHRhcmdldCk7XG4iXX0=