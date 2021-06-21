"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(require("commander"));
const index_1 = require("./index");
const log_config_1 = __importDefault(require("./log-config"));
const override_commander_1 = require("./cmd/override-commander");
const { version } = require('../../package.json');
process.title = 'Plink - server';
const program = new commander_1.default.Command()
    .arguments('[args...]')
    .action((args) => {
    // eslint-disable-next-line no-console
    console.log('\nPlink version:', version);
    index_1.initProcess(() => {
        return shutdown();
    });
    const setting = index_1.initConfig(program.opts());
    log_config_1.default(setting());
    const { runServer } = require('./package-runner');
    const { shutdown } = runServer();
    // await started;
});
override_commander_1.withGlobalOptions(program);
program.parseAsync(process.argv)
    .catch((e) => {
    console.error(e, e.stack);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FwcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwwREFBa0M7QUFDbEMsbUNBQStEO0FBRS9ELDhEQUFxQztBQUNyQyxpRUFBMkQ7QUFFM0QsTUFBTSxFQUFDLE9BQU8sRUFBQyxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBc0IsQ0FBQztBQUVyRSxPQUFPLENBQUMsS0FBSyxHQUFHLGdCQUFnQixDQUFDO0FBRWpDLE1BQU0sT0FBTyxHQUFHLElBQUksbUJBQVMsQ0FBQyxPQUFPLEVBQUU7S0FDdEMsU0FBUyxDQUFDLFdBQVcsQ0FBQztLQUN0QixNQUFNLENBQUMsQ0FBQyxJQUFjLEVBQUUsRUFBRTtJQUN6QixzQ0FBc0M7SUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUV6QyxtQkFBVyxDQUFDLEdBQUcsRUFBRTtRQUNmLE9BQU8sUUFBUSxFQUFFLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7SUFDSCxNQUFNLE9BQU8sR0FBRyxrQkFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQW1CLENBQUMsQ0FBQztJQUM1RCxvQkFBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDckIsTUFBTSxFQUFDLFNBQVMsRUFBQyxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBbUIsQ0FBQztJQUNsRSxNQUFNLEVBQUMsUUFBUSxFQUFDLEdBQUcsU0FBUyxFQUFFLENBQUM7SUFDL0IsaUJBQWlCO0FBQ25CLENBQUMsQ0FBQyxDQUFDO0FBRUgsc0NBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7QUFFM0IsT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0tBQy9CLEtBQUssQ0FBQyxDQUFDLENBQVEsRUFBRSxFQUFFO0lBQ2xCLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMxQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNvbW1hbmRlciBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IHtHbG9iYWxPcHRpb25zLCBpbml0Q29uZmlnLCBpbml0UHJvY2Vzc30gZnJvbSAnLi9pbmRleCc7XG5pbXBvcnQgKiBhcyBfcnVubmVyIGZyb20gJy4vcGFja2FnZS1ydW5uZXInO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuL2xvZy1jb25maWcnO1xuaW1wb3J0IHt3aXRoR2xvYmFsT3B0aW9uc30gZnJvbSAnLi9jbWQvb3ZlcnJpZGUtY29tbWFuZGVyJztcblxuY29uc3Qge3ZlcnNpb259ID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJykgYXMge3ZlcnNpb246IHN0cmluZ307XG5cbnByb2Nlc3MudGl0bGUgPSAnUGxpbmsgLSBzZXJ2ZXInO1xuXG5jb25zdCBwcm9ncmFtID0gbmV3IGNvbW1hbmRlci5Db21tYW5kKClcbi5hcmd1bWVudHMoJ1thcmdzLi4uXScpXG4uYWN0aW9uKChhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnXFxuUGxpbmsgdmVyc2lvbjonLCB2ZXJzaW9uKTtcblxuICBpbml0UHJvY2VzcygoKSA9PiB7XG4gICAgcmV0dXJuIHNodXRkb3duKCk7XG4gIH0pO1xuICBjb25zdCBzZXR0aW5nID0gaW5pdENvbmZpZyhwcm9ncmFtLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKTtcbiAgbG9nQ29uZmlnKHNldHRpbmcoKSk7XG4gIGNvbnN0IHtydW5TZXJ2ZXJ9ID0gcmVxdWlyZSgnLi9wYWNrYWdlLXJ1bm5lcicpIGFzIHR5cGVvZiBfcnVubmVyO1xuICBjb25zdCB7c2h1dGRvd259ID0gcnVuU2VydmVyKCk7XG4gIC8vIGF3YWl0IHN0YXJ0ZWQ7XG59KTtcblxud2l0aEdsb2JhbE9wdGlvbnMocHJvZ3JhbSk7XG5cbnByb2dyYW0ucGFyc2VBc3luYyhwcm9jZXNzLmFyZ3YpXG4uY2F0Y2goKGU6IEVycm9yKSA9PiB7XG4gIGNvbnNvbGUuZXJyb3IoZSwgZS5zdGFjayk7XG4gIHByb2Nlc3MuZXhpdCgxKTtcbn0pO1xuIl19