import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

type ActionDispather = {
  saveTodo(todo: string): void;
  loadTodo(): void;
  ngDestory(): void;
};

type ActionTypes<AC> = {
  [K in keyof AC]: {
    type: K;
    payload: AC[K] extends (...p: infer P) => void ? P : unknown;
  };
};

function ofActionType<T extends keyof ActionDispather>(type: T) {
  return (upstream$: rx.Observable<ActionTypes<ActionDispather>[keyof ActionDispather]>) => {
    return upstream$.pipe(
      op.filter((action): action is ActionTypes<ActionDispather>[T] => action.type === type),
      op.share()
    );
  };
}

export class MyCmp {
  dispatch$ = new rx.Subject<ActionTypes<ActionDispather>[keyof ActionDispather]>();
  dispatcher: ActionDispather;

  action$ = this.dispatch$.pipe(
    op.tap(action => console.log('incoming action:', action.type, action.payload)),
    op.share()
  );

  constructor(apiService: {post(param: string): Promise<unknown>; get(): Promise<any[]>}) {
    this.dispatcher = new Proxy<ActionDispather>({} as ActionDispather, {
      get(target, key, rec) {
        return (...params: any[]) => ({type: key, payload: params});
      }
    });

    rx.merge(
      this.action$.pipe(
        ofActionType('saveTodo'),
        op.concatMap(({payload: [todo]}) => {
          return apiService.post(todo);
        })
      ),
      this.action$.pipe(
        ofActionType('loadTodo'),
        op.switchMap(() => apiService.get())
      )
    ).pipe(
      op.takeUntil(this.action$.pipe(ofActionType('ngDestory'))),
      op.catchError((err, src$) => {
        console.log('Per error caught', err);
        // let's re-subscribe actions after error being caught
        return src$;
      })
    ).subscribe();
  }

  ngOnDestroy() {
    this.dispatcher.ngDestory();
  }
}
