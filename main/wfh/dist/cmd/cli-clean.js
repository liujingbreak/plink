"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.actions = exports.getStore = exports.getState = exports.slice = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
// import Path from 'path';
// import * as recipeManager from '../recipe-manager';
const store_1 = require("../store");
const symlinks_1 = __importDefault(require("../utils/symlinks"));
function clean(onlySymlink = false) {
    return __awaiter(this, void 0, void 0, function* () {
        // logConfig(config());
        yield symlinks_1.default('all');
        if (!onlySymlink) {
            const deleteFiles = [
                'dist', 'yarn.lock', 'package-lock.json', 'yarn-error.log',
                'dr.package.json.bak'
            ];
            yield Promise.all(deleteFiles.map(target => fs_extra_1.default.remove(target)));
        }
    });
}
exports.default = clean;
const initialState = {
    workspace: {},
    projectSource: {}
};
exports.slice = store_1.stateFactory.newSlice({
    name: 'clean',
    initialState,
    reducers: {
        addWorkspaceFile(state, { payload: files }) {
            for (const file of files)
                state.workspace[file] = true;
        },
        addSourceFile(state, { payload: { project, files } }) {
            const nativeState = store_1.stateFactory.sliceState(exports.slice);
            if (!lodash_1.default.has(nativeState.projectSource, project)) {
                state.projectSource[project] = {};
            }
            for (const file of files) {
                if (!lodash_1.default.has(nativeState.projectSource[project], file))
                    state.projectSource[project][file] = true;
            }
        }
    }
});
// rootStore.addEpic<any, any, PayloadAction>((action$, state$) => {
//   return of<PayloadAction>(slice.actions.change(d => ));
// });
function getState() {
    return store_1.stateFactory.sliceState(exports.slice);
}
exports.getState = getState;
function getStore() {
    return store_1.stateFactory.sliceStore(exports.slice);
}
exports.getStore = getStore;
exports.actions = store_1.stateFactory.bindActionCreators(exports.slice);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWNsZWFuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1jbGVhbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSx3REFBMEI7QUFDMUIsb0RBQXVCO0FBQ3ZCLDJCQUEyQjtBQUMzQixzREFBc0Q7QUFDdEQsb0NBQXNDO0FBQ3RDLGlFQUFnRDtBQUdoRCxTQUE4QixLQUFLLENBQUMsV0FBVyxHQUFHLEtBQUs7O1FBQ3JELHVCQUF1QjtRQUN2QixNQUFNLGtCQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNoQixNQUFNLFdBQVcsR0FBRztnQkFDbEIsTUFBTSxFQUFFLFdBQVcsRUFBRSxtQkFBbUIsRUFBRSxnQkFBZ0I7Z0JBQzFELHFCQUFxQjthQUN0QixDQUFDO1lBQ0YsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxrQkFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDakU7SUFDSCxDQUFDO0NBQUE7QUFWRCx3QkFVQztBQVNELE1BQU0sWUFBWSxHQUFlO0lBQy9CLFNBQVMsRUFBRSxFQUFFO0lBQ2IsYUFBYSxFQUFFLEVBQUU7Q0FDbEIsQ0FBQztBQUVXLFFBQUEsS0FBSyxHQUFHLG9CQUFZLENBQUMsUUFBUSxDQUFDO0lBQ3pDLElBQUksRUFBRSxPQUFPO0lBQ2IsWUFBWTtJQUNaLFFBQVEsRUFBRTtRQUNSLGdCQUFnQixDQUFDLEtBQUssRUFBRSxFQUFDLE9BQU8sRUFBRSxLQUFLLEVBQTBCO1lBQy9ELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSztnQkFDdEIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDakMsQ0FBQztRQUNELGFBQWEsQ0FBQyxLQUFLLEVBQUUsRUFBQyxPQUFPLEVBQUUsRUFBQyxPQUFPLEVBQUUsS0FBSyxFQUFDLEVBQW9EO1lBQ2pHLE1BQU0sV0FBVyxHQUFHLG9CQUFZLENBQUMsVUFBVSxDQUFDLGFBQUssQ0FBRSxDQUFDO1lBQ3BELElBQUksQ0FBQyxnQkFBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxFQUFFO2dCQUM5QyxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQzthQUNuQztZQUNELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO2dCQUN4QixJQUFJLENBQUMsZ0JBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUM7b0JBQ2xELEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO2FBQzdDO1FBQ0gsQ0FBQztLQUNGO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsb0VBQW9FO0FBQ3BFLDJEQUEyRDtBQUMzRCxNQUFNO0FBRU4sU0FBZ0IsUUFBUTtJQUN0QixPQUFPLG9CQUFZLENBQUMsVUFBVSxDQUFDLGFBQUssQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFGRCw0QkFFQztBQUVELFNBQWdCLFFBQVE7SUFDdEIsT0FBTyxvQkFBWSxDQUFDLFVBQVUsQ0FBQyxhQUFLLENBQUMsQ0FBQztBQUN4QyxDQUFDO0FBRkQsNEJBRUM7QUFDWSxRQUFBLE9BQU8sR0FBRyxvQkFBWSxDQUFDLGtCQUFrQixDQUFDLGFBQUssQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG4vLyBpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCAqIGFzIHJlY2lwZU1hbmFnZXIgZnJvbSAnLi4vcmVjaXBlLW1hbmFnZXInO1xuaW1wb3J0IHtzdGF0ZUZhY3Rvcnl9IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCBzY2FuTm9kZU1vZHVsZXMgZnJvbSAnLi4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0IHtQYXlsb2FkQWN0aW9ufSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gY2xlYW4ob25seVN5bWxpbmsgPSBmYWxzZSkge1xuICAvLyBsb2dDb25maWcoY29uZmlnKCkpO1xuICBhd2FpdCBzY2FuTm9kZU1vZHVsZXMoJ2FsbCcpO1xuICBpZiAoIW9ubHlTeW1saW5rKSB7XG4gICAgY29uc3QgZGVsZXRlRmlsZXMgPSBbXG4gICAgICAnZGlzdCcsICd5YXJuLmxvY2snLCAncGFja2FnZS1sb2NrLmpzb24nLCAneWFybi1lcnJvci5sb2cnLFxuICAgICAgJ2RyLnBhY2thZ2UuanNvbi5iYWsnXG4gICAgXTtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChkZWxldGVGaWxlcy5tYXAodGFyZ2V0ID0+IGZzLnJlbW92ZSh0YXJnZXQpKSk7XG4gIH1cbn1cbi8qKlxuICogRmlsZXMgbmVlZHMgdG8gYmUgY2xlYW5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDbGVhblN0YXRlIHtcbiAgd29ya3NwYWNlOiB7W3BhdGg6IHN0cmluZ106IGJvb2xlYW59O1xuICBwcm9qZWN0U291cmNlOiB7W3Byb2plY3Q6IHN0cmluZ106IHtbcGF0aDogc3RyaW5nXTogYm9vbGVhbn19O1xufVxuXG5jb25zdCBpbml0aWFsU3RhdGU6IENsZWFuU3RhdGUgPSB7XG4gIHdvcmtzcGFjZToge30sXG4gIHByb2plY3RTb3VyY2U6IHt9XG59O1xuXG5leHBvcnQgY29uc3Qgc2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnY2xlYW4nLFxuICBpbml0aWFsU3RhdGUsXG4gIHJlZHVjZXJzOiB7XG4gICAgYWRkV29ya3NwYWNlRmlsZShzdGF0ZSwge3BheWxvYWQ6IGZpbGVzfTogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHtcbiAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcylcbiAgICAgICAgc3RhdGUud29ya3NwYWNlW2ZpbGVdID0gdHJ1ZTtcbiAgICB9LFxuICAgIGFkZFNvdXJjZUZpbGUoc3RhdGUsIHtwYXlsb2FkOiB7cHJvamVjdCwgZmlsZXN9fTogUGF5bG9hZEFjdGlvbjx7cHJvamVjdDogc3RyaW5nLCBmaWxlczogc3RyaW5nW119Pikge1xuICAgICAgY29uc3QgbmF0aXZlU3RhdGUgPSBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShzbGljZSkhO1xuICAgICAgaWYgKCFfLmhhcyhuYXRpdmVTdGF0ZS5wcm9qZWN0U291cmNlLCBwcm9qZWN0KSkge1xuICAgICAgICBzdGF0ZS5wcm9qZWN0U291cmNlW3Byb2plY3RdID0ge307XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICAgICAgaWYgKCFfLmhhcyhuYXRpdmVTdGF0ZS5wcm9qZWN0U291cmNlW3Byb2plY3RdLCBmaWxlKSlcbiAgICAgICAgICBzdGF0ZS5wcm9qZWN0U291cmNlW3Byb2plY3RdW2ZpbGVdID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pO1xuXG4vLyByb290U3RvcmUuYWRkRXBpYzxhbnksIGFueSwgUGF5bG9hZEFjdGlvbj4oKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuLy8gICByZXR1cm4gb2Y8UGF5bG9hZEFjdGlvbj4oc2xpY2UuYWN0aW9ucy5jaGFuZ2UoZCA9PiApKTtcbi8vIH0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShzbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbn1cbmV4cG9ydCBjb25zdCBhY3Rpb25zID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG5leHBvcnQgdHlwZSBBY3Rpb25zVHlwZSA9IHR5cGVvZiBhY3Rpb25zIGV4dGVuZHMgUHJvbWlzZTxpbmZlciBUPiA/IFQgOiB1bmtub3duO1xuXG5cbiJdfQ==