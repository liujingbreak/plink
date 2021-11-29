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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const plink_1 = require("@wfh/plink");
const index_1 = require("@wfh/plink/wfh/dist/package-mgr/index");
const store_1 = require("@wfh/plink/wfh/dist/store");
const op = __importStar(require("rxjs/operators"));
const fix_postcss_values_parser_1 = __importDefault(require("../fix-postcss-values-parser"));
const log = (0, plink_1.log4File)(__filename);
const cliExt = (program) => {
    store_1.stateFactory.addEpic((action$, state$) => {
        return (0, store_1.castByActionType)(index_1.slice.actions, action$).workspaceChanged.pipe(op.map(({ payload: workspacekeys }) => {
            log.info('Checking... worktree space:', workspacekeys.join(', '));
            void (0, fix_postcss_values_parser_1.default)(workspacekeys.map(key => (0, index_1.workspaceDir)(key)));
        }), op.ignoreElements());
    });
    program.command('patch:postcss-values-parser')
        .description('Fix postcss-values-parser@2.0.1')
        // .argument('[argument1...]', 'Description for argument1', [])
        // .option('-f, --file <spec>', 'sample option')
        .action((argument1) => {
        return (0, index_1.getStore)().pipe(op.map(s => s.workspaces), op.distinctUntilChanged(), op.take(1), op.switchMap(map => (0, fix_postcss_values_parser_1.default)(map.keys()))).toPromise();
    });
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHNDQUFrRDtBQUNsRCxpRUFBc0c7QUFDdEcscURBQXlFO0FBQ3pFLG1EQUFxQztBQUNyQyw2RkFBd0Q7QUFFeEQsTUFBTSxHQUFHLEdBQUcsSUFBQSxnQkFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBRWpDLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLG9CQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3ZDLE9BQU8sSUFBQSx3QkFBZ0IsRUFBQyxhQUFLLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FDbkUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxFQUFFLGFBQWEsRUFBQyxFQUFFLEVBQUU7WUFDbEMsR0FBRyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDbEUsS0FBSyxJQUFBLG1DQUFZLEVBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUEsb0JBQVksRUFBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakUsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUNwQixDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxPQUFPLENBQUMsT0FBTyxDQUFDLDZCQUE2QixDQUFDO1NBQzdDLFdBQVcsQ0FBQyxpQ0FBaUMsQ0FBQztRQUMvQywrREFBK0Q7UUFDL0QsZ0RBQWdEO1NBQy9DLE1BQU0sQ0FBQyxDQUFDLFNBQW1CLEVBQUUsRUFBRTtRQUM5QixPQUFPLElBQUEsZ0JBQWMsR0FBRSxDQUFDLElBQUksQ0FDMUIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFDekIsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQ3pCLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ1YsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUEsbUNBQVksRUFBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUM5QyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDO0FBRUwsQ0FBQyxDQUFDO0FBRUYsa0JBQWUsTUFBTSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtDbGlFeHRlbnNpb24sIGxvZzRGaWxlfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7Z2V0U3RvcmUgYXMgZ2V0UGtnTWdyU3RvcmUsIHNsaWNlLCB3b3Jrc3BhY2VEaXJ9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3IvaW5kZXgnO1xuaW1wb3J0IHtzdGF0ZUZhY3RvcnksIGNhc3RCeUFjdGlvblR5cGV9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3Qvc3RvcmUnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHBhdGNoUG9zdGNzcyBmcm9tICcuLi9maXgtcG9zdGNzcy12YWx1ZXMtcGFyc2VyJztcblxuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5cbmNvbnN0IGNsaUV4dDogQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW0pID0+IHtcbiAgc3RhdGVGYWN0b3J5LmFkZEVwaWMoKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICAgIHJldHVybiBjYXN0QnlBY3Rpb25UeXBlKHNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpLndvcmtzcGFjZUNoYW5nZWQucGlwZShcbiAgICAgIG9wLm1hcCgoe3BheWxvYWQ6IHdvcmtzcGFjZWtleXN9KSA9PiB7XG4gICAgICAgIGxvZy5pbmZvKCdDaGVja2luZy4uLiB3b3JrdHJlZSBzcGFjZTonLCB3b3Jrc3BhY2VrZXlzLmpvaW4oJywgJykpO1xuICAgICAgICB2b2lkIHBhdGNoUG9zdGNzcyh3b3Jrc3BhY2VrZXlzLm1hcChrZXkgPT4gd29ya3NwYWNlRGlyKGtleSkpKTtcbiAgICAgIH0pLFxuICAgICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICAgICk7XG4gIH0pO1xuXG4gIHByb2dyYW0uY29tbWFuZCgncGF0Y2g6cG9zdGNzcy12YWx1ZXMtcGFyc2VyJylcbiAgLmRlc2NyaXB0aW9uKCdGaXggcG9zdGNzcy12YWx1ZXMtcGFyc2VyQDIuMC4xJylcbiAgLy8gLmFyZ3VtZW50KCdbYXJndW1lbnQxLi4uXScsICdEZXNjcmlwdGlvbiBmb3IgYXJndW1lbnQxJywgW10pXG4gIC8vIC5vcHRpb24oJy1mLCAtLWZpbGUgPHNwZWM+JywgJ3NhbXBsZSBvcHRpb24nKVxuICAuYWN0aW9uKChhcmd1bWVudDE6IHN0cmluZ1tdKSA9PiB7XG4gICAgcmV0dXJuIGdldFBrZ01nclN0b3JlKCkucGlwZShcbiAgICAgIG9wLm1hcChzID0+IHMud29ya3NwYWNlcyksXG4gICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgb3AudGFrZSgxKSxcbiAgICAgIG9wLnN3aXRjaE1hcChtYXAgPT4gcGF0Y2hQb3N0Y3NzKG1hcC5rZXlzKCkpKVxuICAgICkudG9Qcm9taXNlKCk7XG4gIH0pO1xuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGlFeHQ7XG4iXX0=