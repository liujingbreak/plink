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
let dir = process.env.PLINK_WORK_DIR ? process.env.PLINK_WORK_DIR : process.cwd();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yay1wcmVzZXJ2ZS1zeW1saW5rLW1haW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9mb3JrLXByZXNlcnZlLXN5bWxpbmstbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBOzs7R0FHRztBQUNILGdEQUF3QjtBQUV4QixJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNsRixNQUFNLElBQUksR0FBRyxjQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNsQyxJQUFJLE1BQWMsQ0FBQztBQUNuQixPQUFPLElBQUksRUFBRTtJQUNYLE1BQU0sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxjQUFjLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBa0IsQ0FBQyxDQUFDO0lBQzNFLElBQUk7UUFDRixPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hCLE1BQU07S0FDUDtJQUFDLE9BQU8sRUFBRSxFQUFFO1FBQ1gsSUFBSSxHQUFHLEtBQUssSUFBSSxFQUFFO1lBQ2hCLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbEIsTUFBTTtTQUNQO1FBQ0QsR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDekI7Q0FDRjtBQUNELE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogTm9kZSBvcHRpb24gcHJldmVyLXN5bWxpbmsgZG9lcyBub3QgZWZmZWN0IG9uIFwibWFpblwiIGZpbGUsIHNvIHRoaXMgZmlsZSBhY3RzIGFzIG1haW4gZmlsZSB0byBjYWxsIHJlYWwgZmlsZSBmcm9tXG4gKiBhIHN5bWxpbmsgbG9jYXRpb25cbiAqL1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5cbmxldCBkaXIgPSBwcm9jZXNzLmVudi5QTElOS19XT1JLX0RJUiA/IHByb2Nlc3MuZW52LlBMSU5LX1dPUktfRElSIDogcHJvY2Vzcy5jd2QoKTtcbmNvbnN0IHJvb3QgPSBQYXRoLnBhcnNlKGRpcikucm9vdDtcbmxldCB0YXJnZXQ6IHN0cmluZztcbndoaWxlICh0cnVlKSB7XG4gIHRhcmdldCA9IFBhdGgucmVzb2x2ZShkaXIsICdub2RlX21vZHVsZXMnLCBwcm9jZXNzLmVudi5fX3BsaW5rX2ZvcmtfbWFpbiEpO1xuICB0cnkge1xuICAgIHJlcXVpcmUucmVzb2x2ZSh0YXJnZXQpO1xuICAgIGJyZWFrO1xuICB9IGNhdGNoIChleCkge1xuICAgIGlmIChkaXIgPT09IHJvb3QpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXgpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGRpciA9IFBhdGguZGlybmFtZShkaXIpO1xuICB9XG59XG5yZXF1aXJlKHRhcmdldCk7XG4iXX0=