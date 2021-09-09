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
Object.defineProperty(exports, "__esModule", { value: true });
exports.test = exports.cacheAndReplay = void 0;
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
function cacheAndReplay(markAction, // with offset of look ahead
replayAction // with target marked position
) {
    const store = new rx.BehaviorSubject({
        cacheData: [],
        cacheStartPos: -1,
        // markIdices: new LinkedList<{offset: number; laNum: number}>(),
        unmarkPositions: new Set(),
        inputIdx: -1
    });
    const replayer = new rx.Subject();
    return (input) => {
        const unsubscribeSubj = new rx.Subject();
        // handle mark action
        markAction.pipe(op.mergeMap(laNumber => store.pipe(op.distinctUntilChanged((a, b) => a.inputValue === b.inputValue), op.filter(state => state.inputValue != null), op.take(1), op.map(s => {
            if (s.unmarkPositions.size === 0) {
                s.cacheStartPos = s.inputIdx;
                s.cacheData.push(s.inputValue);
            }
            // s.markIdices.add({offset: s.inputIdx, laNum: laNumber});
            s.unmarkPositions.add(laNumber + s.inputIdx);
            store.next(Object.assign({}, s));
        }))), op.takeUntil(unsubscribeSubj)).subscribe();
        // handle replay action
        replayAction.pipe(op.mergeMap((position) => store.pipe(op.distinctUntilChanged((a, b) => a.cacheStartPos === b.cacheStartPos), op.filter(state => state.cacheStartPos >= 0), op.take(1), op.map(state => {
            for (let i = position - state.cacheStartPos, l = state.cacheData.length; i < l; i++) {
                const value = state.cacheData[i];
                replayer.next({ value, idx: state.cacheStartPos + i });
            }
            store.next(Object.assign({}, state));
        }))), op.takeUntil(unsubscribeSubj)).subscribe();
        // unmarkAction.pipe(
        //   op.map(() => {
        //     const s = store.getValue();
        //     if (s.markIdices.length > 0) {
        //       s.markIdices.pop();
        //     }
        //     if (s.markIdices.length === 0) {
        //       s.cacheData.splice(0);
        //     }
        //     store.next({...s});
        //   }),
        //   op.takeUntil(unsubscribeSubj)
        // ).subscribe();
        return rx.merge(replayer.pipe(op.observeOn(rx.queueScheduler)), input.pipe(op.map((item, idx) => {
            const state = store.getValue();
            if (state.unmarkPositions.has(idx)) {
                // console.log('unmark', state.unmarkPositions.size);
                state.unmarkPositions.delete(idx);
                if (state.unmarkPositions.size === 0) {
                    state.cacheData.splice(0);
                }
            }
            if (state.unmarkPositions.size > 0) {
                state.cacheData.push(item);
            }
            store.next(Object.assign({}, state));
            return { value: item, idx };
        }))).pipe(op.map((item) => {
            const state = store.getValue();
            state.inputIdx = item.idx;
            state.inputValue = item.value;
            store.next(Object.assign({}, state));
            return item;
        }), op.finalize(() => {
            unsubscribeSubj.next();
            unsubscribeSubj.complete();
        }));
    };
}
exports.cacheAndReplay = cacheAndReplay;
function test() {
    const marker = new rx.Subject();
    const replay = new rx.Subject();
    rx.range(0, 20).pipe(
    // op.take(20),
    cacheAndReplay(marker, replay), op.map(({ value, idx }, totalIndex) => {
        // eslint-disable-next-line no-console
        console.log(`(${totalIndex}) offset:${idx}, value: ${value}`);
        if (totalIndex === 5) {
            marker.next(4);
        }
        if (totalIndex === 8) {
            marker.next(2);
        }
        if (totalIndex === 10) {
            replay.next(8);
        }
        if (totalIndex === 15) {
            replay.next(5);
        }
    }), op.take(50)).subscribe();
}
exports.test = test;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZy1yZWFjdGl2ZS1vcHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsYW5nLXJlYWN0aXZlLW9wcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEseUNBQTJCO0FBQzNCLG1EQUFxQztBQVdyQyxTQUFnQixjQUFjLENBQzVCLFVBQWlDLEVBQUUsNEJBQTRCO0FBQy9ELFlBQW1DLENBQUMsOEJBQThCOztJQUVsRSxNQUFNLEtBQUssR0FBRyxJQUFJLEVBQUUsQ0FBQyxlQUFlLENBQXlCO1FBQzNELFNBQVMsRUFBRSxFQUFFO1FBQ2IsYUFBYSxFQUFFLENBQUMsQ0FBQztRQUNqQixpRUFBaUU7UUFDakUsZUFBZSxFQUFFLElBQUksR0FBRyxFQUFVO1FBQ2xDLFFBQVEsRUFBRSxDQUFDLENBQUM7S0FDYixDQUFDLENBQUM7SUFFSCxNQUFNLFFBQVEsR0FBRyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQTJCLENBQUM7SUFFM0QsT0FBTyxDQUFDLEtBQXVCLEVBQUUsRUFBRTtRQUNqQyxNQUFNLGVBQWUsR0FBRyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN6QyxxQkFBcUI7UUFDckIsVUFBVSxDQUFDLElBQUksQ0FDYixFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FDaEMsRUFBRSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQ2hFLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxFQUM1QyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUNWLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDVCxJQUFJ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UUFDbEMsc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxVQUFVLFlBQVksR0FBRyxZQUFZLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDOUQsSUFBSSxVQUFVLEtBQUssQ0FBQyxFQUFFO1lBQ3BCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDaEI7UUFDRCxJQUFJLFVBQVUsS0FBSyxDQUFDLEVBQUU7WUFDcEIsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNoQjtRQUNELElBQUksVUFBVSxLQUFLLEVBQUUsRUFBRTtZQUNyQixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2hCO1FBQ0QsSUFBSSxVQUFVLEtBQUssRUFBRSxFQUFFO1lBQ3JCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDaEI7SUFFSCxDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUNaLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDaEIsQ0FBQztBQTFCRCxvQkEwQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW50ZXJmYWNlIENhY2hlQW5kUmVwbGF5U3RhdGU8VD4ge1xuICBjYWNoZURhdGE6IFRbXTtcbiAgY2FjaGVTdGFydFBvczogbnVtYmVyO1xuICAvLyBtYXJrSWRpY2VzOiBMaW5rZWRMaXN0PHtvZmZzZXQ6IG51bWJlcjsgbGFOdW06IG51bWJlcn0+O1xuICB1bm1hcmtQb3NpdGlvbnM6IFNldDxudW1iZXI+O1xuICBpbnB1dFZhbHVlPzogVDtcbiAgaW5wdXRJZHg6IG51bWJlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhY2hlQW5kUmVwbGF5PFQ+KFxuICBtYXJrQWN0aW9uOiByeC5PYnNlcnZhYmxlPG51bWJlcj4sIC8vIHdpdGggb2Zmc2V0IG9mIGxvb2sgYWhlYWRcbiAgcmVwbGF5QWN0aW9uOiByeC5PYnNlcnZhYmxlPG51bWJlcj4gLy8gd2l0aCB0YXJnZXQgbWFya2VkIHBvc2l0aW9uXG4pIHtcbiAgY29uc3Qgc3RvcmUgPSBuZXcgcnguQmVoYXZpb3JTdWJqZWN0PENhY2hlQW5kUmVwbGF5U3RhdGU8VD4+KHtcbiAgICBjYWNoZURhdGE6IFtdLFxuICAgIGNhY2hlU3RhcnRQb3M6IC0xLFxuICAgIC8vIG1hcmtJZGljZXM6IG5ldyBMaW5rZWRMaXN0PHtvZmZzZXQ6IG51bWJlcjsgbGFOdW06IG51bWJlcn0+KCksXG4gICAgdW5tYXJrUG9zaXRpb25zOiBuZXcgU2V0PG51bWJlcj4oKSxcbiAgICBpbnB1dElkeDogLTFcbiAgfSk7XG5cbiAgY29uc3QgcmVwbGF5ZXIgPSBuZXcgcnguU3ViamVjdDx7dmFsdWU6IFQ7IGlkeDogbnVtYmVyfT4oKTtcblxuICByZXR1cm4gKGlucHV0OiByeC5PYnNlcnZhYmxlPFQ+KSA9PiB7XG4gICAgY29uc3QgdW5zdWJzY3JpYmVTdWJqID0gbmV3IHJ4LlN1YmplY3QoKTtcbiAgICAvLyBoYW5kbGUgbWFyayBhY3Rpb25cbiAgICBtYXJrQWN0aW9uLnBpcGUoXG4gICAgICBvcC5tZXJnZU1hcChsYU51bWJlciA9PiBzdG9yZS5waXBlKFxuICAgICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgoYSwgYikgPT4gYS5pbnB1dFZhbHVlID09PSBiLmlucHV0VmFsdWUpLFxuICAgICAgICBvcC5maWx0ZXIoc3RhdGUgPT4gc3RhdGUuaW5wdXRWYWx1ZSAhPSBudWxsKSxcbiAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgb3AubWFwKHMgPT4ge1xuICAgICAgICAgIGlmIChzLnVubWFya1Bvc2l0aW9ucy5zaXplID09PSAwKSB7XG4gICAgICAgICAgICBzLmNhY2hlU3RhcnRQb3MgPSBzLmlucHV0SWR4O1xuICAgICAgICAgICAgcy5jYWNoZURhdGEucHVzaChzLmlucHV0VmFsdWUhKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gcy5tYXJrSWRpY2VzLmFkZCh7b2Zmc2V0OiBzLmlucHV0SWR4LCBsYU51bTogbGFOdW1iZXJ9KTtcbiAgICAgICAgICBzLnVubWFya1Bvc2l0aW9ucy5hZGQobGFOdW1iZXIgKyBzLmlucHV0SWR4KTtcbiAgICAgICAgICBzdG9yZS5uZXh0KHtcbiAgICAgICAgICAgIC4uLnNcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICkpLFxuICAgICAgb3AudGFrZVVudGlsKHVuc3Vic2NyaWJlU3ViailcbiAgICApLnN1YnNjcmliZSgpO1xuXG4gICAgLy8gaGFuZGxlIHJlcGxheSBhY3Rpb25cbiAgICByZXBsYXlBY3Rpb24ucGlwZShcbiAgICAgIG9wLm1lcmdlTWFwKChwb3NpdGlvbikgPT4gc3RvcmUucGlwZShcbiAgICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKGEsIGIpID0+IGEuY2FjaGVTdGFydFBvcyA9PT0gYi5jYWNoZVN0YXJ0UG9zKSxcbiAgICAgICAgb3AuZmlsdGVyKHN0YXRlID0+IHN0YXRlLmNhY2hlU3RhcnRQb3MgPj0gMCksXG4gICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgIG9wLm1hcChzdGF0ZSA9PiB7XG4gICAgICAgICAgZm9yIChsZXQgaSA9IHBvc2l0aW9uIC0gc3RhdGUuY2FjaGVTdGFydFBvcywgbCA9IHN0YXRlLmNhY2hlRGF0YS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gc3RhdGUuY2FjaGVEYXRhW2ldO1xuICAgICAgICAgICAgcmVwbGF5ZXIubmV4dCh7dmFsdWUsIGlkeDogc3RhdGUuY2FjaGVTdGFydFBvcyArIGl9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RvcmUubmV4dCh7Li4uc3RhdGV9KTtcbiAgICAgICAgfSlcbiAgICAgICkpLFxuICAgICAgb3AudGFrZVVudGlsKHVuc3Vic2NyaWJlU3ViailcbiAgICApLnN1YnNjcmliZSgpO1xuXG4gICAgLy8gdW5tYXJrQWN0aW9uLnBpcGUoXG4gICAgLy8gICBvcC5tYXAoKCkgPT4ge1xuICAgIC8vICAgICBjb25zdCBzID0gc3RvcmUuZ2V0VmFsdWUoKTtcbiAgICAvLyAgICAgaWYgKHMubWFya0lkaWNlcy5sZW5ndGggPiAwKSB7XG4gICAgLy8gICAgICAgcy5tYXJrSWRpY2VzLnBvcCgpO1xuICAgIC8vICAgICB9XG4gICAgLy8gICAgIGlmIChzLm1hcmtJZGljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgLy8gICAgICAgcy5jYWNoZURhdGEuc3BsaWNlKDApO1xuICAgIC8vICAgICB9XG4gICAgLy8gICAgIHN0b3JlLm5leHQoey4uLnN9KTtcbiAgICAvLyAgIH0pLFxuICAgIC8vICAgb3AudGFrZVVudGlsKHVuc3Vic2NyaWJlU3ViailcbiAgICAvLyApLnN1YnNjcmliZSgpO1xuXG4gICAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgICAgcmVwbGF5ZXIucGlwZShvcC5vYnNlcnZlT24ocngucXVldWVTY2hlZHVsZXIpKSxcbiAgICAgIGlucHV0LnBpcGUoXG4gICAgICAgIG9wLm1hcCgoaXRlbSwgaWR4KSA9PiB7XG4gICAgICAgICAgY29uc3Qgc3RhdGUgPSBzdG9yZS5nZXRWYWx1ZSgpO1xuICAgICAgICAgIGlmIChzdGF0ZS51bm1hcmtQb3NpdGlvbnMuaGFzKGlkeCkpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCd1bm1hcmsnLCBzdGF0ZS51bm1hcmtQb3NpdGlvbnMuc2l6ZSk7XG4gICAgICAgICAgICBzdGF0ZS51bm1hcmtQb3NpdGlvbnMuZGVsZXRlKGlkeCk7XG4gICAgICAgICAgICBpZiAoc3RhdGUudW5tYXJrUG9zaXRpb25zLnNpemUgPT09IDApIHtcbiAgICAgICAgICAgICAgc3RhdGUuY2FjaGVEYXRhLnNwbGljZSgwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHN0YXRlLnVubWFya1Bvc2l0aW9ucy5zaXplID4gMCkge1xuICAgICAgICAgICAgc3RhdGUuY2FjaGVEYXRhLnB1c2goaXRlbSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHN0b3JlLm5leHQoey4uLnN0YXRlfSk7XG4gICAgICAgICAgcmV0dXJuIHt2YWx1ZTogaXRlbSwgaWR4fTtcbiAgICAgICAgfSlcbiAgICAgIClcbiAgICApLnBpcGUoXG4gICAgICBvcC5tYXAoKGl0ZW0pID0+IHtcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBzdG9yZS5nZXRWYWx1ZSgpO1xuICAgICAgICBzdGF0ZS5pbnB1dElkeCA9IGl0ZW0uaWR4O1xuICAgICAgICBzdGF0ZS5pbnB1dFZhbHVlID0gaXRlbS52YWx1ZTtcbiAgICAgICAgc3RvcmUubmV4dCh7Li4uc3RhdGV9KTtcbiAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgICB9KSxcbiAgICAgIG9wLmZpbmFsaXplKCgpID0+IHtcbiAgICAgICAgdW5zdWJzY3JpYmVTdWJqLm5leHQoKTtcbiAgICAgICAgdW5zdWJzY3JpYmVTdWJqLmNvbXBsZXRlKCk7XG4gICAgICB9KVxuICAgICk7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0ZXN0KCkge1xuICBjb25zdCBtYXJrZXIgPSBuZXcgcnguU3ViamVjdDxudW1iZXI+KCk7XG4gIGNvbnN0IHJlcGxheSA9IG5ldyByeC5TdWJqZWN0PG51bWJlcj4oKTtcblxuICByeC5yYW5nZSgwLCAyMCkucGlwZShcbiAgICAvLyBvcC50YWtlKDIwKSxcbiAgICBjYWNoZUFuZFJlcGxheShtYXJrZXIsIHJlcGxheSksXG4gICAgb3AubWFwKCh7dmFsdWUsIGlkeH0sIHRvdGFsSW5kZXgpID0+IHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhgKCR7dG90YWxJbmRleH0pIG9mZnNldDoke2lkeH0sIHZhbHVlOiAke3ZhbHVlfWApO1xuICAgICAgaWYgKHRvdGFsSW5kZXggPT09IDUpIHtcbiAgICAgICAgbWFya2VyLm5leHQoNCk7XG4gICAgICB9XG4gICAgICBpZiAodG90YWxJbmRleCA9PT0gOCkge1xuICAgICAgICBtYXJrZXIubmV4dCgyKTtcbiAgICAgIH1cbiAgICAgIGlmICh0b3RhbEluZGV4ID09PSAxMCkge1xuICAgICAgICByZXBsYXkubmV4dCg4KTtcbiAgICAgIH1cbiAgICAgIGlmICh0b3RhbEluZGV4ID09PSAxNSkge1xuICAgICAgICByZXBsYXkubmV4dCg1KTtcbiAgICAgIH1cblxuICAgIH0pLFxuICAgIG9wLnRha2UoNTApXG4gICkuc3Vic2NyaWJlKCk7XG59XG4iXX0=