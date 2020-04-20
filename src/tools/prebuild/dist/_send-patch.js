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
        console.log('Pushing App "%s" to remote %s', configName, url);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvX3NlbmQtcGF0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsU0FBc0IsSUFBSSxDQUFDLEdBQVcsRUFBRSxVQUFrQixFQUFFLE9BQWUsRUFBRSxNQUFlOztRQUMxRixJQUFJLEdBQVcsQ0FBQztRQUNoQixRQUFRLEdBQUcsRUFBRTtZQUNYLEtBQUssTUFBTTtnQkFDVCxHQUFHLEdBQUcsMENBQTBDLENBQUM7Z0JBQ2pELE1BQU07WUFDUixLQUFLLE9BQU87Z0JBQ1YsR0FBRyxHQUFHLGlDQUFpQyxDQUFDO2dCQUN4QyxNQUFNO1lBQ1IsS0FBSyxLQUFLLENBQUM7WUFDWCxLQUFLLE1BQU0sQ0FBQztZQUNaO2dCQUNFLEdBQUcsR0FBRywwQkFBMEIsR0FBRyxvQkFBb0IsQ0FBQztnQkFDeEQsTUFBTTtTQUNUO1FBRUQsTUFBTSxVQUFVLEdBQXVCLE9BQU8sQ0FBQywyREFBMkQsQ0FBQyxDQUFDLFVBQVUsQ0FBQztRQUV2SCxzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsRUFBRSxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDOUQsSUFBSTtZQUNGLE1BQU0sVUFBVSxDQUFDO2dCQUNmLElBQUksRUFBRSxXQUFXLEdBQUcsSUFBSSxVQUFVLE1BQU07Z0JBQ3hDLEdBQUc7Z0JBQ0gsU0FBUyxFQUFFLEdBQUcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakMsU0FBUyxFQUFFLEdBQUcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakMsTUFBTTthQUNQLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDYjtRQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsNEJBQTRCO1lBQzVCLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2RUFBNkUsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM1SCxNQUFNLEVBQUUsQ0FBQztTQUNWO0lBQ0gsQ0FBQztDQUFBO0FBbENELG9CQWtDQztBQUVELFNBQWdCLElBQUk7SUFDbEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN0QixDQUFDO0FBRkQsb0JBRUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Biay9wcmVidWlsZC9kaXN0L19zZW5kLXBhdGNoLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2VuZEFwcFppcCBhcyBfc2VuZEFwcFppcCB9IGZyb20gJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9jb250ZW50LWRlcGxveWVyL2NkLWNsaWVudCc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZW5kKGVudjogc3RyaW5nLCBjb25maWdOYW1lOiBzdHJpbmcsIHppcEZpbGU6IHN0cmluZywgc2VjcmV0Pzogc3RyaW5nKSB7XG4gIGxldCB1cmw6IHN0cmluZztcbiAgc3dpdGNoIChlbnYpIHtcbiAgICBjYXNlICdwcm9kJzpcbiAgICAgIHVybCA9ICdodHRwczovL2NyZWRpdC1zZXJ2aWNlLmJramsuY29tL19pbnN0YWxsJztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2xvY2FsJzpcbiAgICAgIHVybCA9ICdodHRwOi8vbG9jYWxob3N0OjE0MzMzL19pbnN0YWxsJztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Rldic6XG4gICAgY2FzZSAndGVzdCc6XG4gICAgZGVmYXVsdDpcbiAgICAgIHVybCA9IGBodHRwczovL2NyZWRpdC1zZXJ2aWNlLiR7ZW52fS5ia2prLmNvbS9faW5zdGFsbGA7XG4gICAgICBicmVhaztcbiAgfVxuXG4gIGNvbnN0IHNlbmRBcHBaaXA6IHR5cGVvZiBfc2VuZEFwcFppcCA9IHJlcXVpcmUoJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9jb250ZW50LWRlcGxveWVyL2NkLWNsaWVudCcpLnNlbmRBcHBaaXA7XG5cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ1B1c2hpbmcgQXBwIFwiJXNcIiB0byByZW1vdGUgJXMnLCBjb25maWdOYW1lLCB1cmwpO1xuICB0cnkge1xuICAgIGF3YWl0IHNlbmRBcHBaaXAoe1xuICAgICAgZmlsZTogYGluc3RhbGwtJHtlbnZ9LyR7Y29uZmlnTmFtZX0uemlwYCxcbiAgICAgIHVybCxcbiAgICAgIG51bU9mQ29uYzogZW52ID09PSAncHJvZCcgPyAyIDogMSxcbiAgICAgIG51bU9mTm9kZTogZW52ID09PSAncHJvZCcgPyAyIDogMSxcbiAgICAgIHNlY3JldFxuICAgIH0sIHppcEZpbGUpO1xuICB9IGNhdGNoIChleCkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICBjb25zb2xlLmxvZyhgWW91IG1heSByZXRyeTpcXG4gbm9kZSAtciB0cy1ub2RlL3JlZ2lzdGVyIHNjcmlwdHMvcHJlYnVpbGQvX3NlbmQtcGF0Y2gudHMgJHtwcm9jZXNzLmFyZ3Yuc2xpY2UoMikuam9pbignICcpfWApO1xuICAgIHRocm93IGV4O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0ZXN0KCkge1xuICBjb25zb2xlLmxvZygndGVzdCcpO1xufVxuXG4iXX0=
