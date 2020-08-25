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
    workspace: new Set(),
    projectSource: new Map()
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
            const nativeState = getState();
            if (!nativeState.projectSource.has(project)) {
                state.projectSource.set(project, new Set());
            }
            for (const file of files) {
                if (!nativeState.projectSource.get(project).has(file))
                    state.projectSource.get(project).add(file);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWNsZWFuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1jbGVhbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSx3REFBMEI7QUFFMUIsMkJBQTJCO0FBQzNCLHNEQUFzRDtBQUN0RCxvQ0FBc0M7QUFDdEMsaUVBQWdEO0FBR2hELFNBQThCLEtBQUssQ0FBQyxXQUFXLEdBQUcsS0FBSzs7UUFDckQsdUJBQXVCO1FBQ3ZCLE1BQU0sa0JBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ2hCLE1BQU0sV0FBVyxHQUFHO2dCQUNsQixNQUFNLEVBQUUsV0FBVyxFQUFFLG1CQUFtQixFQUFFLGdCQUFnQjtnQkFDMUQscUJBQXFCO2FBQ3RCLENBQUM7WUFDRixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLGtCQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNqRTtJQUNILENBQUM7Q0FBQTtBQVZELHdCQVVDO0FBU0QsTUFBTSxZQUFZLEdBQWU7SUFDL0IsU0FBUyxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3BCLGFBQWEsRUFBRSxJQUFJLEdBQUcsRUFBRTtDQUN6QixDQUFDO0FBRVcsUUFBQSxLQUFLLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDekMsSUFBSSxFQUFFLE9BQU87SUFDYixZQUFZO0lBQ1osUUFBUSxFQUFFO1FBQ1IsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLEVBQUMsT0FBTyxFQUFFLEtBQUssRUFBMEI7WUFDL0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLO2dCQUN0QixLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztRQUNqQyxDQUFDO1FBQ0QsYUFBYSxDQUFDLEtBQUssRUFBRSxFQUFDLE9BQU8sRUFBRSxFQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUMsRUFBb0Q7WUFDakcsTUFBTSxXQUFXLEdBQUcsUUFBUSxFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUMzQyxLQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO2FBQzdDO1lBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7Z0JBQ3hCLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO29CQUNwRCxLQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDL0M7UUFDSCxDQUFDO0tBQ0Y7Q0FDRixDQUFDLENBQUM7QUFFSCxvRUFBb0U7QUFDcEUsMkRBQTJEO0FBQzNELE1BQU07QUFFTixTQUFnQixRQUFRO0lBQ3RCLE9BQU8sb0JBQVksQ0FBQyxVQUFVLENBQUMsYUFBSyxDQUFDLENBQUM7QUFDeEMsQ0FBQztBQUZELDRCQUVDO0FBRUQsU0FBZ0IsUUFBUTtJQUN0QixPQUFPLG9CQUFZLENBQUMsVUFBVSxDQUFDLGFBQUssQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFGRCw0QkFFQztBQUNZLFFBQUEsT0FBTyxHQUFHLG9CQUFZLENBQUMsa0JBQWtCLENBQUMsYUFBSyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbi8vIGltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0ICogYXMgcmVjaXBlTWFuYWdlciBmcm9tICcuLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQge3N0YXRlRmFjdG9yeX0gZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0IHNjYW5Ob2RlTW9kdWxlcyBmcm9tICcuLi91dGlscy9zeW1saW5rcyc7XG5pbXBvcnQge1BheWxvYWRBY3Rpb259IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBjbGVhbihvbmx5U3ltbGluayA9IGZhbHNlKSB7XG4gIC8vIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gIGF3YWl0IHNjYW5Ob2RlTW9kdWxlcygnYWxsJyk7XG4gIGlmICghb25seVN5bWxpbmspIHtcbiAgICBjb25zdCBkZWxldGVGaWxlcyA9IFtcbiAgICAgICdkaXN0JywgJ3lhcm4ubG9jaycsICdwYWNrYWdlLWxvY2suanNvbicsICd5YXJuLWVycm9yLmxvZycsXG4gICAgICAnZHIucGFja2FnZS5qc29uLmJhaydcbiAgICBdO1xuICAgIGF3YWl0IFByb21pc2UuYWxsKGRlbGV0ZUZpbGVzLm1hcCh0YXJnZXQgPT4gZnMucmVtb3ZlKHRhcmdldCkpKTtcbiAgfVxufVxuLyoqXG4gKiBGaWxlcyBuZWVkcyB0byBiZSBjbGVhblxuICovXG5leHBvcnQgaW50ZXJmYWNlIENsZWFuU3RhdGUge1xuICB3b3Jrc3BhY2U6IFNldDxzdHJpbmc+O1xuICBwcm9qZWN0U291cmNlOiBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj47XG59XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogQ2xlYW5TdGF0ZSA9IHtcbiAgd29ya3NwYWNlOiBuZXcgU2V0KCksXG4gIHByb2plY3RTb3VyY2U6IG5ldyBNYXAoKVxufTtcblxuZXhwb3J0IGNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ2NsZWFuJyxcbiAgaW5pdGlhbFN0YXRlLFxuICByZWR1Y2Vyczoge1xuICAgIGFkZFdvcmtzcGFjZUZpbGUoc3RhdGUsIHtwYXlsb2FkOiBmaWxlc306IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpXG4gICAgICAgIHN0YXRlLndvcmtzcGFjZVtmaWxlXSA9IHRydWU7XG4gICAgfSxcbiAgICBhZGRTb3VyY2VGaWxlKHN0YXRlLCB7cGF5bG9hZDoge3Byb2plY3QsIGZpbGVzfX06IFBheWxvYWRBY3Rpb248e3Byb2plY3Q6IHN0cmluZywgZmlsZXM6IHN0cmluZ1tdfT4pIHtcbiAgICAgIGNvbnN0IG5hdGl2ZVN0YXRlID0gZ2V0U3RhdGUoKTtcbiAgICAgIGlmICghbmF0aXZlU3RhdGUucHJvamVjdFNvdXJjZS5oYXMocHJvamVjdCkpIHtcbiAgICAgICAgc3RhdGUucHJvamVjdFNvdXJjZS5zZXQocHJvamVjdCwgbmV3IFNldCgpKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgICAgICBpZiAoIW5hdGl2ZVN0YXRlLnByb2plY3RTb3VyY2UuZ2V0KHByb2plY3QpIS5oYXMoZmlsZSkpXG4gICAgICAgICAgc3RhdGUucHJvamVjdFNvdXJjZS5nZXQocHJvamVjdCkhLmFkZChmaWxlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pO1xuXG4vLyByb290U3RvcmUuYWRkRXBpYzxhbnksIGFueSwgUGF5bG9hZEFjdGlvbj4oKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuLy8gICByZXR1cm4gb2Y8UGF5bG9hZEFjdGlvbj4oc2xpY2UuYWN0aW9ucy5jaGFuZ2UoZCA9PiApKTtcbi8vIH0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShzbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbn1cbmV4cG9ydCBjb25zdCBhY3Rpb25zID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG5cblxuIl19