"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable */
const rxjs_1 = require("rxjs");
describe('rxjs', () => {
    it('new Observable() is cold', () => {
        let obs = new rxjs_1.Observable((subscriber) => {
            console.log('Observable starts');
            subscriber.next(1);
            subscriber.complete();
            return () => console.log('teardown observable');
        });
        console.log('subscribe');
        let sub = obs.subscribe(value => console.log('onNext', value));
        sub.unsubscribe();
    });
    it('Observable.create()', (done) => {
        let obs = rxjs_1.Observable.create((subscriber) => {
            console.log('Observable starts');
            subscriber.next(2);
            subscriber.complete();
            return () => console.log('teardown observable');
        });
        console.log('subscribe');
        setTimeout(() => {
            let sub = obs.subscribe(((value) => console.log('onNext', value)));
            sub.unsubscribe();
            done();
        }, 1000);
    });
    it('Observale keeps state for multiple observers', (done) => {
        let obs = new rxjs_1.Observable((subscriber) => {
            console.log('Observable starts');
            subscriber.next(1);
            subscriber.next(2);
            subscriber.complete();
            return () => console.log('teardown observable');
        });
        console.log('subscribe');
        obs.subscribe(value => console.log('1 onNext', value));
        setTimeout(() => {
            let sub = obs.subscribe(((value) => console.log('2 onNext', value)));
            sub.unsubscribe();
            done();
        }, 1000);
    });
});

//# sourceMappingURL=rxjsSpec.js.map
