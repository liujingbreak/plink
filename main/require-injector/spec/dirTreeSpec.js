const DirTree = require('../dist/dir-tree').DirTree;

describe('DirTree', () => {
	it('should build proper tree for certain', () => {
		var dt = new DirTree();
		dt.putData('/a/b/c/d', 1);
		dt.putData('/a/b/c1/d', 2);
		dt.putData('/e/f/g/h', 3);
		dt.putData('/a/b', 6);
		dt.putData('/a/b/c2', 4);
		dt.putData('/a/b/c1/d/x/x/x', 5);
		console.log(dt.traverse());

		expect(dt.getData('/a/a/a/a/a')).toBe(null);
		expect(dt.getData('/a/b/c/no')).toBe(null);

		expect(dt.getData('/a/b/c/d')).toBe(1);
		expect(dt.getData('/a/b/c1/d')).toBe(2);
		expect(dt.getData('/e/f/g/h')).toBe(3);
		expect(dt.getData('/a/b/c2')).toBe(4);
		expect(dt.getData('/a/b/c1/d/x/x/x')).toBe(5);
		expect(dt.getData('/a/b')).toBe(6);
	});

	it('.getAllData() should work', () => {
		var dt = new DirTree();
		expect(dt.getAllData('/abc')).toEqual([]);
		dt.putData('/a', 0);
		dt.putData('/a/b/c/d', 1);
		dt.putData('/a/b', 2);
		expect(dt.getAllData('/a/b/c/d/foo.bar')).toEqual([0, 2, 1]);
		expect(dt.getAllData('/a/b/c/foobar')).toEqual([0, 2]);
	});

	it('should build proper tree for windows path', () => {
		var dt = new DirTree();
		dt.putData('C:\\a\\b\\c\\d', 1);
		dt.putData('C:\\a\\b\\c1\\d', 2);
		dt.putData('D:\\e\\f\\g\\h', 3);
		dt.putData('C:\\a\\b', 6);
		dt.putData('C:\\a\\b\\c2', 4);
		dt.putData('C:\\a\\b\\c1\\d\\x\\x\\x', 5);
		//console.log(JSON.stringify(dt.root, null, '  '));

		expect(dt.getData('/a/a/a/a/a')).toBe(null);
		expect(dt.getData('/a/b/c/no')).toBe(null);

		expect(dt.getData('C:/a/b/c/d')).toBe(1);
		expect(dt.getData('C:/a/b/c1/d')).toBe(2);
		expect(dt.getData('D:/e/f/g/h')).toBe(3);
		expect(dt.getData('C:/a/b/c2')).toBe(4);
		expect(dt.getData('C:/a/b/c1/d/x/x/x')).toBe(5);
		expect(dt.getData('C:/a/b')).toBe(6);
	});

	it('root should work', () => {
		let dt = new DirTree();
		dt.putRootData(1);
		expect(dt.getAllData('d:/abc/efg')).toEqual([1]);
	});
});
