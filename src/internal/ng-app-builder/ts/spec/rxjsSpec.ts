/* eslint-disable */
import {Observable} from 'rxjs';

describe('rxjs', () => {
	it('new Observable() is cold', () => {
		let obs = new Observable<number>((subscriber) => {
			console.log('Observable starts');
			subscriber.next(1);
			subscriber.complete();
			return () => console.log('teardown observable');
		});
		console.log('subscribe');
		let sub = obs.subscribe(value => console.log('onNext', value));
		sub.unsubscribe();
	});

	it('Observable.create()', (done: ()=> void ) => {
		let obs = Observable.create((subscriber: any) => {
			console.log('Observable starts');
			subscriber.next(2);
			subscriber.complete();
			return () => console.log('teardown observable');
		});
		console.log('subscribe');
		setTimeout(() => {
			let sub = obs.subscribe(((value: any) => console.log('onNext', value)));
			sub.unsubscribe();
			done();
		}, 1000);
	});

	it('Observale keeps state for multiple observers', (done: any) => {
		let obs = new Observable<number>((subscriber) => {
			console.log('Observable starts');
			subscriber.next(1);
			subscriber.next(2);
			subscriber.complete();
			return () => console.log('teardown observable');
		});
		console.log('subscribe');
		obs.subscribe(value => console.log('1 onNext', value));
		setTimeout(() => {
			let sub = obs.subscribe(((value: any) => console.log('2 onNext', value)));
			sub.unsubscribe();
			done();
		}, 1000);
	});
});
