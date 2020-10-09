"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchedHandlers = exports.addToHandlerTree = exports.DirTree = void 0;
const dir_tree_1 = require("./dir-tree");
Object.defineProperty(exports, "DirTree", { enumerable: true, get: function () { return dir_tree_1.DirTree; } });
const url_1 = __importDefault(require("url"));
// import get from 'lodash/get';
// import trimStart from 'lodash/trimStart';
const trim_1 = __importDefault(require("lodash/trim"));
const escapeRegExp_1 = __importDefault(require("lodash/escapeRegExp"));
function addToHandlerTree(path, handler, tree) {
    if (path.startsWith('/'))
        path = path.slice(1);
    let leadingPath = path;
    const splittedPath = path.split('/');
    let restingRegex;
    const paramIdx = splittedPath.findIndex(element => element.startsWith(':') || /\s*\*\s*/.test(element));
    if (paramIdx >= 0) {
        leadingPath = splittedPath.slice(0, paramIdx).join('/');
        restingRegex = new RegExp('^' + splittedPath.slice(paramIdx).map(el => {
            if (el.startsWith(':')) {
                return '([^/]+)';
            }
            else if (el === '*') {
                return '.*';
            }
            else {
                return escapeRegExp_1.default(el);
            }
        }).join('\\/') + '$');
        // tslint:disable-next-line:no-console
        console.log(`[path-matcher] path ${path}'s regexp:`, restingRegex);
    }
    const data = {
        handler,
        treePath: leadingPath,
        restingRegex
    };
    const existing = tree.getData(leadingPath);
    if (existing) {
        existing.push(data);
    }
    else {
        tree.putData(leadingPath, [data]);
    }
}
exports.addToHandlerTree = addToHandlerTree;
function matchedHandlers(tree, reqUrl) {
    reqUrl = trim_1.default(reqUrl, '/');
    const found = [];
    lookup(found, tree, reqUrl);
    const parsedReqUrl = url_1.default.parse(reqUrl);
    if (parsedReqUrl.query) {
        lookup(found, tree, parsedReqUrl.pathname || '');
    }
    return found;
}
exports.matchedHandlers = matchedHandlers;
function lookup(found, tree, reqUrl) {
    tree.getAllData(reqUrl).forEach(shandlers => {
        for (const sh of shandlers) {
            let restingReqUrl = reqUrl.slice(sh.treePath.length);
            restingReqUrl = trim_1.default(restingReqUrl, '/');
            if (sh.restingRegex == null) {
                if (restingReqUrl.length === 0) {
                    found.push(sh.handler);
                    continue;
                }
                continue;
            }
            const re = sh.restingRegex.exec(restingReqUrl);
            if (re) {
                found.push(sh.handler);
            }
        }
        return false;
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL3Rvb2xzL2h0dHAtcmVxdWVzdC1wcm94eS9pc29tL3BhdGgtbWF0Y2hlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx5Q0FBbUM7QUFRM0Isd0ZBUkEsa0JBQU8sT0FRQTtBQU5mLDhDQUFzQjtBQUN0QixnQ0FBZ0M7QUFDaEMsNENBQTRDO0FBQzVDLHVEQUErQjtBQUMvQix1RUFBK0M7QUF3Qi9DLFNBQWdCLGdCQUFnQixDQUM5QixJQUFZLEVBQUUsT0FBVSxFQUFFLElBQWlDO0lBQzNELElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7UUFDdEIsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkIsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDO0lBQ3ZCLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDckMsSUFBSSxZQUFnQyxDQUFDO0lBQ3JDLE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUN4RyxJQUFJLFFBQVEsSUFBSSxDQUFDLEVBQUU7UUFDakIsV0FBVyxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN4RCxZQUFZLEdBQUcsSUFBSSxNQUFNLENBQUMsR0FBRyxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3BFLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDdEIsT0FBTyxTQUFTLENBQUM7YUFDbEI7aUJBQU0sSUFBSSxFQUFFLEtBQUssR0FBRyxFQUFFO2dCQUNyQixPQUFPLElBQUksQ0FBQzthQUNiO2lCQUFNO2dCQUNMLE9BQU8sc0JBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUN6QjtRQUNILENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUN0QixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsSUFBSSxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUM7S0FDcEU7SUFFRCxNQUFNLElBQUksR0FBcUI7UUFDN0IsT0FBTztRQUNQLFFBQVEsRUFBRSxXQUFXO1FBQ3JCLFlBQVk7S0FDYixDQUFDO0lBQ0YsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMzQyxJQUFJLFFBQVEsRUFBRTtRQUNaLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDckI7U0FBTTtRQUNMLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztLQUNuQztBQUNILENBQUM7QUFsQ0QsNENBa0NDO0FBRUQsU0FBZ0IsZUFBZSxDQUFJLElBQWlDLEVBQUUsTUFBYztJQUNsRixNQUFNLEdBQUcsY0FBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMzQixNQUFNLEtBQUssR0FBUSxFQUFFLENBQUM7SUFDdEIsTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDNUIsTUFBTSxZQUFZLEdBQUcsYUFBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN2QyxJQUFJLFlBQVksQ0FBQyxLQUFLLEVBQUU7UUFDdEIsTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsWUFBWSxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUMsQ0FBQztLQUNsRDtJQUNELE9BQU8sS0FBSyxDQUFDO0FBQ2YsQ0FBQztBQVRELDBDQVNDO0FBRUQsU0FBUyxNQUFNLENBQUksS0FBVSxFQUFFLElBQWlDLEVBQUUsTUFBYztJQUM5RSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRTtRQUMxQyxLQUFLLE1BQU0sRUFBRSxJQUFJLFNBQVMsRUFBRTtZQUMxQixJQUFJLGFBQWEsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDckQsYUFBYSxHQUFHLGNBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDekMsSUFBSSxFQUFFLENBQUMsWUFBWSxJQUFJLElBQUksRUFBRTtnQkFDM0IsSUFBSSxhQUFhLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtvQkFDOUIsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ3ZCLFNBQVM7aUJBQ1Y7Z0JBQ0QsU0FBUzthQUNWO1lBQ0QsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDL0MsSUFBSSxFQUFFLEVBQUU7Z0JBQ04sS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDeEI7U0FDRjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwiZmlsZSI6InRvb2xzL2h0dHAtcmVxdWVzdC1wcm94eS9kaXN0L3BhdGgtbWF0Y2hlci5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
