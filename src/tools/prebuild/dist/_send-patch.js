"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
function send(env, configName, zipFile, secret) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let url;
        switch (env) {
            case 'prod':
                url = 'https://credit-service.bkjk.com/_install';
                break;
            case 'local':
                url = 'http://localhost:14333/_install';
                break;
            case 'dev':
            case 'test':
            default:
                url = `https://credit-service.${env}.bkjk.com/_install`;
                break;
        }
        const sendAppZip = require('@dr-core/assets-processer/dist/content-deployer/cd-client').sendAppZip;
        // tslint:disable-next-line:no-console
        console.log('Push App %s version: %s', configName);
        try {
            yield sendAppZip({
                file: `install-${env}/${configName}.zip`,
                url,
                numOfConc: env === 'prod' ? 2 : 1,
                numOfNode: env === 'prod' ? 2 : 1,
                secret
            }, zipFile);
        }
        catch (ex) {
            // tslint:disable:no-console
            console.error(ex);
            console.log(`You may retry:\n node -r ts-node/register scripts/prebuild/_send-patch.ts ${process.argv.slice(2).join(' ')}`);
            throw ex;
        }
    });
}
exports.send = send;
function test() {
    console.log('test');
}
exports.test = test;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvX3NlbmQtcGF0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsU0FBc0IsSUFBSSxDQUFDLEdBQVcsRUFBRSxVQUFrQixFQUFFLE9BQWUsRUFBRSxNQUFlOztRQUMxRixJQUFJLEdBQVcsQ0FBQztRQUNoQixRQUFRLEdBQUcsRUFBRTtZQUNYLEtBQUssTUFBTTtnQkFDVCxHQUFHLEdBQUcsMENBQTBDLENBQUM7Z0JBQ2pELE1BQU07WUFDUixLQUFLLE9BQU87Z0JBQ1YsR0FBRyxHQUFHLGlDQUFpQyxDQUFDO2dCQUN4QyxNQUFNO1lBQ1IsS0FBSyxLQUFLLENBQUM7WUFDWCxLQUFLLE1BQU0sQ0FBQztZQUNaO2dCQUNFLEdBQUcsR0FBRywwQkFBMEIsR0FBRyxvQkFBb0IsQ0FBQztnQkFDeEQsTUFBTTtTQUNUO1FBRUQsTUFBTSxVQUFVLEdBQXVCLE9BQU8sQ0FBQywyREFBMkQsQ0FBQyxDQUFDLFVBQVUsQ0FBQztRQUV2SCxzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNuRCxJQUFJO1lBQ0YsTUFBTSxVQUFVLENBQUM7Z0JBQ2YsSUFBSSxFQUFFLFdBQVcsR0FBRyxJQUFJLFVBQVUsTUFBTTtnQkFDeEMsR0FBRztnQkFDSCxTQUFTLEVBQUUsR0FBRyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxTQUFTLEVBQUUsR0FBRyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxNQUFNO2FBQ1AsRUFBRSxPQUFPLENBQUMsQ0FBQztTQUNiO1FBQUMsT0FBTyxFQUFFLEVBQUU7WUFDWCw0QkFBNEI7WUFDNUIsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNsQixPQUFPLENBQUMsR0FBRyxDQUFDLDZFQUE2RSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzVILE1BQU0sRUFBRSxDQUFDO1NBQ1Y7SUFDSCxDQUFDO0NBQUE7QUFsQ0Qsb0JBa0NDO0FBRUQsU0FBZ0IsSUFBSTtJQUNsQixPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3RCLENBQUM7QUFGRCxvQkFFQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL3ByZWJ1aWxkL2Rpc3QvX3NlbmQtcGF0Y2guanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzZW5kQXBwWmlwIGFzIF9zZW5kQXBwWmlwIH0gZnJvbSAnQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2NvbnRlbnQtZGVwbG95ZXIvY2QtY2xpZW50JztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlbmQoZW52OiBzdHJpbmcsIGNvbmZpZ05hbWU6IHN0cmluZywgemlwRmlsZTogc3RyaW5nLCBzZWNyZXQ/OiBzdHJpbmcpIHtcbiAgbGV0IHVybDogc3RyaW5nO1xuICBzd2l0Y2ggKGVudikge1xuICAgIGNhc2UgJ3Byb2QnOlxuICAgICAgdXJsID0gJ2h0dHBzOi8vY3JlZGl0LXNlcnZpY2UuYmtqay5jb20vX2luc3RhbGwnO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnbG9jYWwnOlxuICAgICAgdXJsID0gJ2h0dHA6Ly9sb2NhbGhvc3Q6MTQzMzMvX2luc3RhbGwnO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnZGV2JzpcbiAgICBjYXNlICd0ZXN0JzpcbiAgICBkZWZhdWx0OlxuICAgICAgdXJsID0gYGh0dHBzOi8vY3JlZGl0LXNlcnZpY2UuJHtlbnZ9LmJramsuY29tL19pbnN0YWxsYDtcbiAgICAgIGJyZWFrO1xuICB9XG5cbiAgY29uc3Qgc2VuZEFwcFppcDogdHlwZW9mIF9zZW5kQXBwWmlwID0gcmVxdWlyZSgnQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2NvbnRlbnQtZGVwbG95ZXIvY2QtY2xpZW50Jykuc2VuZEFwcFppcDtcblxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnUHVzaCBBcHAgJXMgdmVyc2lvbjogJXMnLCBjb25maWdOYW1lKTtcbiAgdHJ5IHtcbiAgICBhd2FpdCBzZW5kQXBwWmlwKHtcbiAgICAgIGZpbGU6IGBpbnN0YWxsLSR7ZW52fS8ke2NvbmZpZ05hbWV9LnppcGAsXG4gICAgICB1cmwsXG4gICAgICBudW1PZkNvbmM6IGVudiA9PT0gJ3Byb2QnID8gMiA6IDEsXG4gICAgICBudW1PZk5vZGU6IGVudiA9PT0gJ3Byb2QnID8gMiA6IDEsXG4gICAgICBzZWNyZXRcbiAgICB9LCB6aXBGaWxlKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG4gICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgY29uc29sZS5sb2coYFlvdSBtYXkgcmV0cnk6XFxuIG5vZGUgLXIgdHMtbm9kZS9yZWdpc3RlciBzY3JpcHRzL3ByZWJ1aWxkL19zZW5kLXBhdGNoLnRzICR7cHJvY2Vzcy5hcmd2LnNsaWNlKDIpLmpvaW4oJyAnKX1gKTtcbiAgICB0aHJvdyBleDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdGVzdCgpIHtcbiAgY29uc29sZS5sb2coJ3Rlc3QnKTtcbn1cblxuIl19
