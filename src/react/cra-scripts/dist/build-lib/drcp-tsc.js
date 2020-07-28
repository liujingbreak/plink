"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const drcpConfig = require('dr-comp-package/wfh/lib/config');
drcpConfig.init({})
    .then(() => {
    const tsc = require('dr-comp-package/wfh/dist/ts-cmd').tsc;
    return tsc({
        package: [process.argv[2]],
        ed: true, jsx: true,
        watch: process.argv.slice(3).indexOf('--watch') >= 0,
        compileOptions: {
            module: 'esnext'
        }
    });
})
    .then(emitted => {
    // tslint:disable-next-line: no-console
    console.log('[drcp-tsc] declaration files emitted:');
    // tslint:disable-next-line: no-console
    emitted.forEach(info => console.log(`[drcp-tsc] emitted: ${info[0]} ${info[1]}Kb`));
})
    .catch(err => {
    console.error('[child-process tsc] Typescript compilation contains errors');
    console.error(err);
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvYnVpbGQtbGliL2RyY3AtdHNjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFFNUQsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQWtCO0tBQ3BDLElBQUksQ0FBQyxHQUFHLEVBQUU7SUFDVCxNQUFNLEdBQUcsR0FBZ0IsT0FBTyxDQUFDLGlDQUFpQyxDQUFDLENBQUMsR0FBRyxDQUFDO0lBQ3hFLE9BQU8sR0FBRyxDQUFDO1FBQ1QsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQixFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJO1FBQ25CLEtBQUssRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztRQUNwRCxjQUFjLEVBQUU7WUFDZCxNQUFNLEVBQUUsUUFBUTtTQUNqQjtLQUNGLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQztLQUNELElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtJQUNkLHVDQUF1QztJQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7SUFDckQsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3RGLENBQUMsQ0FBQztLQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRTtJQUNYLE9BQU8sQ0FBQyxLQUFLLENBQUMsNERBQTRELENBQUMsQ0FBQztJQUM1RSxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3JCLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvZGlzdC9idWlsZC1saWIvZHJjcC10c2MuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3RzYyBhcyBfdHNjfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdHMtY21kJztcbmNvbnN0IGRyY3BDb25maWcgPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9jb25maWcnKTtcblxuKGRyY3BDb25maWcuaW5pdCh7fSkgYXMgUHJvbWlzZTxhbnk+KVxuLnRoZW4oKCkgPT4ge1xuICBjb25zdCB0c2M6IHR5cGVvZiBfdHNjID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3RzLWNtZCcpLnRzYztcbiAgcmV0dXJuIHRzYyh7XG4gICAgcGFja2FnZTogW3Byb2Nlc3MuYXJndlsyXV0sXG4gICAgZWQ6IHRydWUsIGpzeDogdHJ1ZSxcbiAgICB3YXRjaDogcHJvY2Vzcy5hcmd2LnNsaWNlKDMpLmluZGV4T2YoJy0td2F0Y2gnKSA+PSAwLFxuICAgIGNvbXBpbGVPcHRpb25zOiB7XG4gICAgICBtb2R1bGU6ICdlc25leHQnXG4gICAgfVxuICB9KTtcbn0pXG4udGhlbihlbWl0dGVkID0+IHtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdbZHJjcC10c2NdIGRlY2xhcmF0aW9uIGZpbGVzIGVtaXR0ZWQ6Jyk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBlbWl0dGVkLmZvckVhY2goaW5mbyA9PiBjb25zb2xlLmxvZyhgW2RyY3AtdHNjXSBlbWl0dGVkOiAke2luZm9bMF19ICR7aW5mb1sxXX1LYmApKTtcbn0pXG4uY2F0Y2goZXJyID0+IHtcbiAgY29uc29sZS5lcnJvcignW2NoaWxkLXByb2Nlc3MgdHNjXSBUeXBlc2NyaXB0IGNvbXBpbGF0aW9uIGNvbnRhaW5zIGVycm9ycycpO1xuICBjb25zb2xlLmVycm9yKGVycik7XG59KTtcblxuIl19
