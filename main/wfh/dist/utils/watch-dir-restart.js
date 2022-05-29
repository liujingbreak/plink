"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
const cp = __importStar(require("child_process"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const chokidar_1 = __importDefault(require("chokidar"));
function default_1(dirOrFile, forkJsFiles) {
    const watcher = chokidar_1.default.watch(dirOrFile, { ignoreInitial: true });
    const change$ = rx.fromEventPattern(h => watcher.on('change', h), h => watcher.off('change', h))
        .pipe(op.map(event => ({ fileChangeType: 'change', data: event })));
    const add$ = rx.fromEventPattern(h => watcher.on('add', h), h => watcher.off('add', h))
        .pipe(op.map(event => ({ fileChangeType: 'add', data: event })));
    const action$ = new rx.Subject();
    const serverState$ = new rx.BehaviorSubject('stopped');
    rx.merge(action$.pipe(
    // eslint-disable-next-line no-console
    op.tap(type => console.log('[watch-dir-restart]:', type)), op.ignoreElements()), 
    // restart after started
    rx.merge(change$, add$).pipe(op.debounceTime(500), op.mapTo('request restart'), op.exhaustMap(() => {
        const wait = serverState$.pipe(op.filter(type => type === 'started'), op.take(1));
        action$.next('restart');
        return wait;
    })), 
    // restart -> (after stopped) -> stop, start
    action$.pipe(op.filter(type => type === 'restart'), op.concatMap(() => {
        const done = serverState$.pipe(op.filter(type => type === 'stopped'), op.take(1));
        action$.next('stop');
        return done;
    }), op.tap(() => action$.next('start'))), 
    // start -> started, stop -> stopped
    action$.pipe(op.filter(type => type === 'start'), op.concatMap(() => {
        let child$;
        if (forkJsFiles.length > 0 && typeof forkJsFiles[0] === 'string') {
            child$ = rx.from(forkJsFiles).pipe(op.map(forkJsFile => cp.fork(forkJsFile)));
        }
        else {
            child$ = rx.from(forkJsFiles());
        }
        serverState$.next('started');
        const store = new rx.BehaviorSubject({
            numOfExited: 0
        });
        return rx.merge(store.pipe(op.filter(s => s.numOfExited === s.numOfChild), op.take(1), op.tap(() => {
            serverState$.next('stopped');
        })), child$.pipe(op.tap(child => {
            child.on('error', err => {
                // action$.error(err);
                const state = store.getValue();
                store.next(Object.assign(Object.assign({}, state), { numOfExited: state.numOfExited + 1 }));
                console.error('[watch-dir-restart] child process error', err);
            });
            child.on('exit', () => {
                const state = store.getValue();
                store.next(Object.assign(Object.assign({}, state), { numOfExited: state.numOfExited + 1 }));
            });
        }), op.count(), op.map(count => {
            store.next(Object.assign(Object.assign({}, store.getValue()), { numOfChild: count }));
        })), action$.pipe(op.filter(type => type === 'stop'), op.take(1), op.mergeMap(() => child$), op.map(child => child.kill('SIGINT'))));
    })), rx.defer(() => {
        // initial
        action$.next('start');
        return rx.EMPTY;
    })).subscribe();
    return { action$, serverState$ };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2gtZGlyLXJlc3RhcnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy93YXRjaC1kaXItcmVzdGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUEsa0RBQW9DO0FBQ3BDLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsd0RBQStCO0FBSS9CLG1CQUF3QixTQUFtQixFQUFFLFdBQTJDO0lBQ3RGLE1BQU0sT0FBTyxHQUFHLGtCQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO0lBQ2hFLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBbUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQy9ILElBQUksQ0FDSCxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLGNBQWMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUMsQ0FDM0QsQ0FBQztJQUNKLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDNUYsSUFBSSxDQUNILEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsY0FBYyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FB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QUFDLENBQ0gsRUFDRCxPQUFPLENBQUMsSUFBSSxDQUNWLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLEVBQ2xDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ1YsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFDekIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FDdEMsQ0FDRixDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQ0gsRUFDRCxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNaLFVBQVU7UUFDVixPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RCLE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQztJQUNsQixDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2QsT0FBTyxFQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUMsQ0FBQztBQUNqQyxDQUFDO0FBeEdELDRCQXdHQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9pbmRlbnQgKi9cbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBjcCBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGNob2tpZGEgZnJvbSAnY2hva2lkYXInO1xuXG50eXBlIENoaWxkUHJvY2Vzc0ZhY3RvcnkgPSAoKSA9PiBjcC5DaGlsZFByb2Nlc3NbXSB8IHJ4Lk9ic2VydmFibGU8Y3AuQ2hpbGRQcm9jZXNzPjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oZGlyT3JGaWxlOiBzdHJpbmdbXSwgZm9ya0pzRmlsZXM6IHN0cmluZ1tdIHwgQ2hpbGRQcm9jZXNzRmFjdG9yeSkge1xuICBjb25zdCB3YXRjaGVyID0gY2hva2lkYS53YXRjaChkaXJPckZpbGUsIHtpZ25vcmVJbml0aWFsOiB0cnVlfSk7XG4gIGNvbnN0IGNoYW5nZSQgPSByeC5mcm9tRXZlbnRQYXR0ZXJuPFtwYXRoOiBzdHJpbmcsIHN0YXRzPzogZnMuU3RhdHNdPihoID0+IHdhdGNoZXIub24oJ2NoYW5nZScsIGgpLCBoID0+IHdhdGNoZXIub2ZmKCdjaGFuZ2UnLCBoKSlcbiAgICAucGlwZShcbiAgICAgIG9wLm1hcChldmVudCA9PiAoe2ZpbGVDaGFuZ2VUeXBlOiAnY2hhbmdlJywgZGF0YTogZXZlbnR9KSlcbiAgICApO1xuICBjb25zdCBhZGQkID0gcnguZnJvbUV2ZW50UGF0dGVybjxzdHJpbmc+KGggPT4gd2F0Y2hlci5vbignYWRkJywgaCksIGggPT4gd2F0Y2hlci5vZmYoJ2FkZCcsIGgpKVxuICAgIC5waXBlKFxuICAgICAgb3AubWFwKGV2ZW50ID0+ICh7ZmlsZUNoYW5nZVR5cGU6ICdhZGQnLCBkYXRhOiBldmVudH0pKVxuICAgICk7XG5cbiAgY29uc3QgYWN0aW9uJCA9IG5ldyByeC5TdWJqZWN0PCdzdG9wJyB8ICdyZXN0YXJ0JyB8ICdzdGFydCc+KCk7XG4gIGNvbnN0IHNlcnZlclN0YXRlJCA9IG5ldyByeC5CZWhhdmlvclN1YmplY3Q8J3N0b3BwZWQnIHwgJ3N0YXJ0ZWQnIHwgJ3N0YXJ0aW5nJyB8ICdzdG9wcGluZyc+KCdzdG9wcGVkJyk7XG5cbiAgcngubWVyZ2UoXG4gICAgYWN0aW9uJC5waXBlKFxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIG9wLnRhcCh0eXBlID0+IGNvbnNvbGUubG9nKCdbd2F0Y2gtZGlyLXJlc3RhcnRdOicsIHR5cGUpKSxcbiAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIC8vIHJlc3RhcnQgYWZ0ZXIgc3RhcnRlZFxuICAgIHJ4Lm1lcmdlKCBjaGFuZ2UkLCBhZGQkKS5waXBlKFxuICAgICAgb3AuZGVib3VuY2VUaW1lKDUwMCksXG4gICAgICBvcC5tYXBUbygncmVxdWVzdCByZXN0YXJ0JyksXG4gICAgICBvcC5leGhhdXN0TWFwKCgpID0+IHtcbiAgICAgICAgY29uc3Qgd2FpdCA9IHNlcnZlclN0YXRlJC5waXBlKFxuICAgICAgICAgIG9wLmZpbHRlcih0eXBlID0+IHR5cGUgPT09ICdzdGFydGVkJyksXG4gICAgICAgICAgb3AudGFrZSgxKVxuICAgICAgICApO1xuICAgICAgICBhY3Rpb24kLm5leHQoJ3Jlc3RhcnQnKTtcbiAgICAgICAgcmV0dXJuIHdhaXQ7XG4gICAgICB9KVxuICAgICksXG4gICAgLy8gcmVzdGFydCAtPiAoYWZ0ZXIgc3RvcHBlZCkgLT4gc3RvcCwgc3RhcnRcbiAgICBhY3Rpb24kLnBpcGUoXG4gICAgICBvcC5maWx0ZXIodHlwZSA9PiB0eXBlID09PSAncmVzdGFydCcpLFxuICAgICAgb3AuY29uY2F0TWFwKCgpID0+IHtcbiAgICAgICAgY29uc3QgZG9uZSA9IHNlcnZlclN0YXRlJC5waXBlKFxuICAgICAgICAgIG9wLmZpbHRlcih0eXBlID0+IHR5cGUgPT09ICdzdG9wcGVkJyksXG4gICAgICAgICAgb3AudGFrZSgxKVxuICAgICAgICApO1xuICAgICAgICBhY3Rpb24kLm5leHQoJ3N0b3AnKTtcbiAgICAgICAgcmV0dXJuIGRvbmU7XG4gICAgICB9KSxcbiAgICAgIG9wLnRhcCgoKSA9PiBhY3Rpb24kLm5leHQoJ3N0YXJ0JykpXG4gICAgKSxcbiAgICAvLyBzdGFydCAtPiBzdGFydGVkLCBzdG9wIC0+IHN0b3BwZWRcbiAgICBhY3Rpb24kLnBpcGUoXG4gICAgICBvcC5maWx0ZXIodHlwZSA9PiB0eXBlID09PSAnc3RhcnQnKSxcbiAgICAgIG9wLmNvbmNhdE1hcCgoKSA9PiB7XG4gICAgICAgIGxldCBjaGlsZCQ6IHJ4Lk9ic2VydmFibGU8Y3AuQ2hpbGRQcm9jZXNzPjtcbiAgICAgICAgaWYgKGZvcmtKc0ZpbGVzLmxlbmd0aCA+IDAgJiYgdHlwZW9mIGZvcmtKc0ZpbGVzWzBdID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGNoaWxkJCA9IHJ4LmZyb20oZm9ya0pzRmlsZXMgYXMgc3RyaW5nW10pLnBpcGUob3AubWFwKGZvcmtKc0ZpbGUgPT4gY3AuZm9yayhmb3JrSnNGaWxlKSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNoaWxkJCA9IHJ4LmZyb20oKGZvcmtKc0ZpbGVzIGFzIENoaWxkUHJvY2Vzc0ZhY3RvcnkpKCkpO1xuICAgICAgICB9XG4gICAgICAgIHNlcnZlclN0YXRlJC5uZXh0KCdzdGFydGVkJyk7XG5cbiAgICAgICAgY29uc3Qgc3RvcmUgPSBuZXcgcnguQmVoYXZpb3JTdWJqZWN0PHtudW1PZkNoaWxkPzogbnVtYmVyOyBudW1PZkV4aXRlZDogbnVtYmVyfT4oe1xuICAgICAgICAgIG51bU9mRXhpdGVkOiAwXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByeC5tZXJnZShcbiAgICAgICAgICBzdG9yZS5waXBlKFxuICAgICAgICAgICAgb3AuZmlsdGVyKHMgPT4gcy5udW1PZkV4aXRlZCA9PT0gcy5udW1PZkNoaWxkKSxcbiAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICBvcC50YXAoKCkgPT4ge1xuICAgICAgICAgICAgICBzZXJ2ZXJTdGF0ZSQubmV4dCgnc3RvcHBlZCcpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApLFxuICAgICAgICAgIGNoaWxkJC5waXBlKFxuICAgICAgICAgICAgb3AudGFwKGNoaWxkID0+IHtcbiAgICAgICAgICAgICAgY2hpbGQub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgICAgICAgICAgICAvLyBhY3Rpb24kLmVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdGUgPSBzdG9yZS5nZXRWYWx1ZSgpO1xuICAgICAgICAgICAgICAgIHN0b3JlLm5leHQoey4uLnN0YXRlLCBudW1PZkV4aXRlZDogc3RhdGUubnVtT2ZFeGl0ZWQgKyAxfSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW3dhdGNoLWRpci1yZXN0YXJ0XSBjaGlsZCBwcm9jZXNzIGVycm9yJywgZXJyKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGNoaWxkLm9uKCdleGl0JywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRlID0gc3RvcmUuZ2V0VmFsdWUoKTtcbiAgICAgICAgICAgICAgICBzdG9yZS5uZXh0KHsuLi5zdGF0ZSwgbnVtT2ZFeGl0ZWQ6IHN0YXRlLm51bU9mRXhpdGVkICsgMX0pO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgb3AuY291bnQoKSxcbiAgICAgICAgICAgIG9wLm1hcChjb3VudCA9PiB7XG4gICAgICAgICAgICAgIHN0b3JlLm5leHQoey4uLnN0b3JlLmdldFZhbHVlKCksIG51bU9mQ2hpbGQ6IGNvdW50fSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICksXG4gICAgICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICAgICAgb3AuZmlsdGVyKHR5cGUgPT4gdHlwZSA9PT0gJ3N0b3AnKSxcbiAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICBvcC5tZXJnZU1hcCgoKSA9PiBjaGlsZCQpLFxuICAgICAgICAgICAgb3AubWFwKGNoaWxkID0+IGNoaWxkLmtpbGwoJ1NJR0lOVCcpKVxuICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICByeC5kZWZlcigoKSA9PiB7XG4gICAgICAvLyBpbml0aWFsXG4gICAgICBhY3Rpb24kLm5leHQoJ3N0YXJ0Jyk7XG4gICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbiAgcmV0dXJuIHthY3Rpb24kLCBzZXJ2ZXJTdGF0ZSR9O1xufVxuIl19