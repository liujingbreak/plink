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
exports.doTsconfig = void 0;
const path_1 = __importDefault(require("path"));
const op = __importStar(require("rxjs/operators"));
const editor_helper_1 = require("../editor-helper");
// import {getLogger} from 'log4js';
const misc_1 = require("../utils/misc");
const store_1 = require("../store");
function doTsconfig(opts) {
    if (opts.hook && opts.hook.length > 0) {
        store_1.dispatcher.changeActionOnExit('save');
        editor_helper_1.dispatcher.hookTsconfig(opts.hook);
    }
    if (opts.unhook && opts.unhook.length > 0) {
        store_1.dispatcher.changeActionOnExit('save');
        editor_helper_1.dispatcher.unHookTsconfig(opts.unhook);
    }
    if (opts.unhookAll) {
        store_1.dispatcher.changeActionOnExit('save');
        editor_helper_1.dispatcher.unHookAll();
    }
    (0, editor_helper_1.getStore)().pipe(op.map(s => s.tsconfigByRelPath), op.distinctUntilChanged(), op.filter(datas => {
        if (datas.size > 0) {
            return true;
        }
        // eslint-disable-next-line no-console
        console.log('No hooked files found, hook file by command options "--hook <file>"');
        return false;
    }), op.debounceTime(0), // There will be two change events happening, let's get the last change result only
    op.tap((datas) => {
        // eslint-disable-next-line no-console
        console.log('Hooked tsconfig files:');
        for (const data of datas.values()) {
            // eslint-disable-next-line no-console
            console.log('  ' + path_1.default.resolve((0, misc_1.getRootDir)(), data.relPath));
        }
    })).subscribe();
}
exports.doTsconfig = doTsconfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXRzY29uZmlnLWhvb2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXRzY29uZmlnLWhvb2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUN4QixtREFBcUM7QUFDckMsb0RBQXNEO0FBQ3RELG9DQUFvQztBQUNwQyx3Q0FBeUM7QUFDekMsb0NBQThEO0FBUTlELFNBQWdCLFVBQVUsQ0FBQyxJQUFnQjtJQUN6QyxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3JDLGtCQUFzQixDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xELDBCQUFVLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNwQztJQUNELElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDekMsa0JBQXNCLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEQsMEJBQVUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQ3hDO0lBQ0QsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO1FBQ2xCLGtCQUFzQixDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xELDBCQUFVLENBQUMsU0FBUyxFQUFFLENBQUM7S0FDeEI7SUFDRCxJQUFBLHdCQUFRLEdBQUUsQ0FBQyxJQUFJLENBQ2IsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxFQUNoQyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsRUFDekIsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNoQixJQUFJLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxFQUFFO1lBQ2xCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxRUFBcUUsQ0FBQyxDQUFDO1FBQ25GLE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxtRkFBbUY7SUFDdkcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1FBQ2Ysc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUN0QyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNqQyxzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFBLGlCQUFVLEdBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUM5RDtJQUNILENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7QUFDaEIsQ0FBQztBQWxDRCxnQ0FrQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7Z2V0U3RvcmUsIGRpc3BhdGNoZXJ9IGZyb20gJy4uL2VkaXRvci1oZWxwZXInO1xuLy8gaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge2dldFJvb3REaXJ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtkaXNwYXRjaGVyIGFzIHN0b3JlU2V0dGluZ0Rpc3BhdGNoZXJ9IGZyb20gJy4uL3N0b3JlJztcblxuZXhwb3J0IGludGVyZmFjZSBDbGlPcHRpb25zIHtcbiAgaG9vazogc3RyaW5nW107XG4gIHVuaG9vazogc3RyaW5nW107XG4gIHVuaG9va0FsbDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRvVHNjb25maWcob3B0czogQ2xpT3B0aW9ucykge1xuICBpZiAob3B0cy5ob29rICYmIG9wdHMuaG9vay5sZW5ndGggPiAwKSB7XG4gICAgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlci5jaGFuZ2VBY3Rpb25PbkV4aXQoJ3NhdmUnKTtcbiAgICBkaXNwYXRjaGVyLmhvb2tUc2NvbmZpZyhvcHRzLmhvb2spO1xuICB9XG4gIGlmIChvcHRzLnVuaG9vayAmJiBvcHRzLnVuaG9vay5sZW5ndGggPiAwKSB7XG4gICAgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlci5jaGFuZ2VBY3Rpb25PbkV4aXQoJ3NhdmUnKTtcbiAgICBkaXNwYXRjaGVyLnVuSG9va1RzY29uZmlnKG9wdHMudW5ob29rKTtcbiAgfVxuICBpZiAob3B0cy51bmhvb2tBbGwpIHtcbiAgICBzdG9yZVNldHRpbmdEaXNwYXRjaGVyLmNoYW5nZUFjdGlvbk9uRXhpdCgnc2F2ZScpO1xuICAgIGRpc3BhdGNoZXIudW5Ib29rQWxsKCk7XG4gIH1cbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIG9wLm1hcChzID0+IHMudHNjb25maWdCeVJlbFBhdGgpLFxuICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgb3AuZmlsdGVyKGRhdGFzID0+IHtcbiAgICAgIGlmIChkYXRhcy5zaXplID4gMCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygnTm8gaG9va2VkIGZpbGVzIGZvdW5kLCBob29rIGZpbGUgYnkgY29tbWFuZCBvcHRpb25zIFwiLS1ob29rIDxmaWxlPlwiJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSksXG4gICAgb3AuZGVib3VuY2VUaW1lKDApLCAvLyBUaGVyZSB3aWxsIGJlIHR3byBjaGFuZ2UgZXZlbnRzIGhhcHBlbmluZywgbGV0J3MgZ2V0IHRoZSBsYXN0IGNoYW5nZSByZXN1bHQgb25seVxuICAgIG9wLnRhcCgoZGF0YXMpID0+IHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygnSG9va2VkIHRzY29uZmlnIGZpbGVzOicpO1xuICAgICAgZm9yIChjb25zdCBkYXRhIG9mIGRhdGFzLnZhbHVlcygpKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKCcgICcgKyBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBkYXRhLnJlbFBhdGgpKTtcbiAgICAgIH1cbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xufVxuIl19