var priorityHelper = require('../lib/packageMgr/packagePriorityHelper');
var _ = require('lodash');

describe('packagePriorityHelper', function() {
	it('should work 1', function(done) {
		var packages = [
			{
				longName: 'A',
				priority: 'after B'
			},
			{
				longName: 'B',
				priority: 'before D'
			},
			{
				longName: 'C',
				priority: 'before D'
			},
			{
				longName: 'D',
				priority: 4000
			},
			{
				longName: 'E'
			}
		];
		var idx = 0;
		var packageIndexMap = {};
		var foo = {
			run: function(pk) {
				packageIndexMap[pk.longName] = idx++;
			}
		};
		var run = spyOn(foo, 'run').and.callThrough();
		priorityHelper.orderPackages(packages, foo.run)
		.then(() => {
			_.times(5, i => console.log(run.calls.argsFor(i)));
			//console.log(packageIndexMap);
			expect(run.calls.count()).toEqual(5);
			expect(packageIndexMap.E).toBeLessThan(packageIndexMap.D);
			expect(packageIndexMap.A).toBeGreaterThan(packageIndexMap.B);
			expect(packageIndexMap.C).toBeLessThan(packageIndexMap.D);
			expect(packageIndexMap.B).toBeLessThan(packageIndexMap.D);
			done();
			return null;
		}).catch(e => done.fail(e));
	});

	it('should work 2', function(done) {
		var packages = [
			{
				longName: 'A'
			},
			{
				longName: 'B',
				priority: 'before A'
			},
			{
				longName: 'C',
				priority: 'before B'
			},
			{
				longName: 'D',
				priority: 'after B'
			},
			{
				longName: 'E',
				priority: 4999
			}
		];
		var run = jasmine.createSpy('run');
		priorityHelper.orderPackages(packages, run)
		.then(() => {
			expect(run.calls.count()).toEqual(5);
			_.times(5, i => console.log(run.calls.argsFor(i)));
			expect(run.calls.argsFor(0)[0].longName).toEqual('C');
			expect(run.calls.argsFor(1)[0].longName).toEqual('B');
			expect(run.calls.argsFor(2)[0].longName).toEqual('D');
			expect(run.calls.argsFor(3)[0].longName).toEqual('A');
			expect(run.calls.argsFor(4)[0].longName).toEqual('E');
			done();
			return null;
		})
		.catch(e => done.fail(e));
	});

	it('should throw error if before or after package does not exist', (done)=> {
		var packages = [
			{
				longName: 'A',
				priority: 'after B'
			}, {
				longName: 'B',
				priority: 'before D'
			}, {
				longName: 'C',
				priority: 4999
			}
		];
		var idx = 0;
		var packageIndexMap = {};
		var foo = {
			run: function(pk) {
				packageIndexMap[pk.longName] = idx++;
			}
		};
		priorityHelper.orderPackages(packages, foo.run)
		.then(()=> done.fail('there should be error thrown'))
		.catch(e => {
			console.log(e);
			done();
			return new Error(e);
		});
	});

	it('should stop running when any of Run() throws error', (done) => {
		var packages = [
			{
				longName: 'A',
				run: function() { console.log('running %s', this.longName); }
			},
			{
				longName: 'B',
				priority: 'before A',
				run: function() { console.log('running %s', this.longName); }
			},
			{
				longName: 'C',
				priority: 'before B',
				run: function() { console.log('running %s', this.longName);}
			},
			{
				longName: 'D',
				priority: 'after B',
				run: function() {
					console.log('running %s', this.longName);
					throw new Error('Mock a run error here!');
				}
			},
			{
				longName: 'E',
				priority: 5001,
				run: function() { console.log('running %s', this.longName); }
			}
		];
		priorityHelper.orderPackages(packages, pk => pk.run())
		.then(()=> done.fail('there should be error thrown'))
		.catch(e => {
			console.log(e);
			done();
			return new Error(e);
		});
	});

	it('should stop running when any of Run() returns rejection', (done) => {
		var packages = [
			{
				longName: 'A',
				run: function() { console.log('running %s', this.longName); }
			},
			{
				longName: 'B',
				priority: 'before A',
				run: function() { console.log('running %s', this.longName); }
			},
			{
				longName: 'C',
				priority: 'before B',
				run: function() { console.log('running %s', this.longName);}
			},
			{
				longName: 'D',
				priority: 'after B',
				run: function() {
					console.log('running %s', this.longName);
					return Promise.reject('Mock a Promise rejection here!');
				}
			},
			{
				longName: 'E',
				priority: 4999,
				run: function() { console.log('running %s', this.longName); }
			}
		];
		priorityHelper.orderPackages(packages, pk => pk.run())
		.then(()=> done.fail('there should be error thrown'))
		.catch(e => {
			console.log(e);
			done();
			return new Error(e);
		});
	});
});
