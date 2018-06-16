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
    it('Observable.create()', () => {
        let obs = rxjs_1.Observable.create((subscriber) => {
            console.log('Observable starts');
            subscriber.next(2);
            subscriber.complete();
            return () => console.log('teardown observable');
        });
        console.log('subscribe');
        let sub = obs.subscribe(((value) => console.log('onNext', value)));
        sub.unsubscribe();
    });
});

//# sourceMappingURL=dev-serverSpec.js.map
