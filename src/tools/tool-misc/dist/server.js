"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const plink_1 = require("@wfh/plink");
// import * as op from 'rxjs/operators';
const log = (0, plink_1.log4File)(__filename);
function activate(api) {
    const router = api.router();
    log.info('Plink command server is up and running');
    router.post('/plink-cli/:cmdName', (req, res) => {
        log.info('Recieve command', req.params.cmdName);
    });
    router.post('/plink-cli-stoi', (req, res) => {
        // exit$.pipe(
        //   op.filter(action => action === 'done'),
        //   op.tap(() => {
        //     process.exit(0);
        //   })
        // ).subscribe();
        // exit$.next('start');
    });
}
exports.activate = activate;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHNDQUFzRDtBQUN0RCx3Q0FBd0M7QUFFeEMsTUFBTSxHQUFHLEdBQUcsSUFBQSxnQkFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBRWpDLFNBQWdCLFFBQVEsQ0FBQyxHQUFxQjtJQUM1QyxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDNUIsR0FBRyxDQUFDLElBQUksQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDO0lBRW5ELE1BQU0sQ0FBQyxJQUFJLENBQW9CLHFCQUFxQixFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ2pFLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNsRCxDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDMUMsY0FBYztRQUNkLDRDQUE0QztRQUM1QyxtQkFBbUI7UUFDbkIsdUJBQXVCO1FBQ3ZCLE9BQU87UUFDUCxpQkFBaUI7UUFFakIsdUJBQXVCO0lBQ3pCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQWxCRCw0QkFrQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0V4dGVuc2lvbkNvbnRleHQsIGxvZzRGaWxlfSBmcm9tICdAd2ZoL3BsaW5rJztcbi8vIGltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBhY3RpdmF0ZShhcGk6IEV4dGVuc2lvbkNvbnRleHQpIHtcbiAgY29uc3Qgcm91dGVyID0gYXBpLnJvdXRlcigpO1xuICBsb2cuaW5mbygnUGxpbmsgY29tbWFuZCBzZXJ2ZXIgaXMgdXAgYW5kIHJ1bm5pbmcnKTtcblxuICByb3V0ZXIucG9zdDx7Y21kTmFtZTogc3RyaW5nfT4oJy9wbGluay1jbGkvOmNtZE5hbWUnLCAocmVxLCByZXMpID0+IHtcbiAgICBsb2cuaW5mbygnUmVjaWV2ZSBjb21tYW5kJywgcmVxLnBhcmFtcy5jbWROYW1lKTtcbiAgfSk7XG5cbiAgcm91dGVyLnBvc3QoJy9wbGluay1jbGktc3RvaScsIChyZXEsIHJlcykgPT4ge1xuICAgIC8vIGV4aXQkLnBpcGUoXG4gICAgLy8gICBvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbiA9PT0gJ2RvbmUnKSxcbiAgICAvLyAgIG9wLnRhcCgoKSA9PiB7XG4gICAgLy8gICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgICAvLyAgIH0pXG4gICAgLy8gKS5zdWJzY3JpYmUoKTtcblxuICAgIC8vIGV4aXQkLm5leHQoJ3N0YXJ0Jyk7XG4gIH0pO1xufVxuIl19