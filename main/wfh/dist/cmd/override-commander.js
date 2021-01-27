"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideCommand = void 0;
const chalk_1 = __importDefault(require("chalk"));
function overrideCommand(program, ws) {
    const loadedCmdMap = new Map();
    const origPgmCommand = program.command;
    let filePath = null;
    let pk;
    let originDescFn;
    function command(nameAndArgs, ...restArgs) {
        const cmdName = /^\S+/.exec(nameAndArgs)[0];
        if (loadedCmdMap.has(cmdName)) {
            throw new Error(`Conflict command name ${cmdName} from extensions "${filePath}" and "${loadedCmdMap.get(cmdName)}"`);
        }
        loadedCmdMap.set(cmdName, filePath);
        const subCmd = origPgmCommand.call(this, nameAndArgs, ...restArgs);
        originDescFn = subCmd.description;
        subCmd.description = description;
        return subCmd;
    }
    function description(str, ...remainder) {
        str = chalk_1.default.blue(`[${pk.name}]`) + ' ' + str;
        return originDescFn.call(this, str, ...remainder);
    }
    program.command = command;
    return {
        forPackage(pkg, cmdExecutionFile) {
            pk = pkg;
            filePath = cmdExecutionFile;
        }
    };
}
exports.overrideCommand = overrideCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnJpZGUtY29tbWFuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL292ZXJyaWRlLWNvbW1hbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFFQSxrREFBMEI7QUFFMUIsU0FBZ0IsZUFBZSxDQUFDLE9BQTBCLEVBQUUsRUFBOEI7SUFDeEYsTUFBTSxZQUFZLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7SUFDL0MsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztJQUN2QyxJQUFJLFFBQVEsR0FBa0IsSUFBSSxDQUFDO0lBRW5DLElBQUksRUFBZSxDQUFDO0lBQ3BCLElBQUksWUFBcUUsQ0FBQztJQUUxRSxTQUFTLE9BQU8sQ0FBdUIsV0FBbUIsRUFBRSxHQUFHLFFBQWU7UUFDNUUsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDN0IsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsT0FBTyxxQkFBcUIsUUFBUSxVQUFVLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3RIO1FBQ0QsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsUUFBUyxDQUFDLENBQUM7UUFDckMsTUFBTSxNQUFNLEdBQXNDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxHQUFHLFFBQVEsQ0FBQyxDQUFDO1FBQ3RHLFlBQVksR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDO1FBRWxDLE1BQU0sQ0FBQyxXQUFXLEdBQUcsV0FBa0IsQ0FBQztRQUN4QyxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBRUQsU0FBUyxXQUFXLENBQTBDLEdBQVcsRUFBRSxHQUFHLFNBQWdCO1FBQzVGLEdBQUcsR0FBRyxlQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQztRQUM3QyxPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLFNBQVMsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRCxPQUFPLENBQUMsT0FBTyxHQUFHLE9BQWMsQ0FBQztJQUVqQyxPQUFPO1FBQ0wsVUFBVSxDQUFDLEdBQWdCLEVBQUUsZ0JBQXdCO1lBQ25ELEVBQUUsR0FBRyxHQUFHLENBQUM7WUFDVCxRQUFRLEdBQUcsZ0JBQWdCLENBQUM7UUFDOUIsQ0FBQztLQUNGLENBQUM7QUFDSixDQUFDO0FBbENELDBDQWtDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCB7V29ya3NwYWNlU3RhdGUsIFBhY2thZ2VJbmZvfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuXG5leHBvcnQgZnVuY3Rpb24gb3ZlcnJpZGVDb21tYW5kKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kLCB3czogV29ya3NwYWNlU3RhdGUgfCB1bmRlZmluZWQpIHtcbiAgY29uc3QgbG9hZGVkQ21kTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3Qgb3JpZ1BnbUNvbW1hbmQgPSBwcm9ncmFtLmNvbW1hbmQ7XG4gIGxldCBmaWxlUGF0aDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbiAgbGV0IHBrOiBQYWNrYWdlSW5mbztcbiAgbGV0IG9yaWdpbkRlc2NGbjogUmV0dXJuVHlwZTxjb21tYW5kZXIuQ29tbWFuZFsnY29tbWFuZCddPlsnZGVzY3JpcHRpb24nXTtcblxuICBmdW5jdGlvbiBjb21tYW5kKHRoaXM6IHR5cGVvZiBwcm9ncmFtLCBuYW1lQW5kQXJnczogc3RyaW5nLCAuLi5yZXN0QXJnczogYW55W10pIHtcbiAgICBjb25zdCBjbWROYW1lID0gL15cXFMrLy5leGVjKG5hbWVBbmRBcmdzKSFbMF07XG4gICAgaWYgKGxvYWRlZENtZE1hcC5oYXMoY21kTmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ29uZmxpY3QgY29tbWFuZCBuYW1lICR7Y21kTmFtZX0gZnJvbSBleHRlbnNpb25zIFwiJHtmaWxlUGF0aH1cIiBhbmQgXCIke2xvYWRlZENtZE1hcC5nZXQoY21kTmFtZSl9XCJgKTtcbiAgICB9XG4gICAgbG9hZGVkQ21kTWFwLnNldChjbWROYW1lLCBmaWxlUGF0aCEpO1xuICAgIGNvbnN0IHN1YkNtZDogUmV0dXJuVHlwZTx0eXBlb2Ygb3JpZ1BnbUNvbW1hbmQ+ID0gb3JpZ1BnbUNvbW1hbmQuY2FsbCh0aGlzLCBuYW1lQW5kQXJncywgLi4ucmVzdEFyZ3MpO1xuICAgIG9yaWdpbkRlc2NGbiA9IHN1YkNtZC5kZXNjcmlwdGlvbjtcblxuICAgIHN1YkNtZC5kZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uIGFzIGFueTtcbiAgICByZXR1cm4gc3ViQ21kO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVzY3JpcHRpb24odGhpczogUmV0dXJuVHlwZTx0eXBlb2Ygb3JpZ1BnbUNvbW1hbmQ+LCBzdHI6IHN0cmluZywgLi4ucmVtYWluZGVyOiBhbnlbXSkge1xuICAgIHN0ciA9IGNoYWxrLmJsdWUoYFske3BrLm5hbWV9XWApICsgJyAnICsgc3RyO1xuICAgIHJldHVybiBvcmlnaW5EZXNjRm4uY2FsbCh0aGlzLCBzdHIsIC4uLnJlbWFpbmRlcik7XG4gIH1cblxuICBwcm9ncmFtLmNvbW1hbmQgPSBjb21tYW5kIGFzIGFueTtcblxuICByZXR1cm4ge1xuICAgIGZvclBhY2thZ2UocGtnOiBQYWNrYWdlSW5mbywgY21kRXhlY3V0aW9uRmlsZTogc3RyaW5nKSB7XG4gICAgICBwayA9IHBrZztcbiAgICAgIGZpbGVQYXRoID0gY21kRXhlY3V0aW9uRmlsZTtcbiAgICB9XG4gIH07XG59XG5cblxuIl19