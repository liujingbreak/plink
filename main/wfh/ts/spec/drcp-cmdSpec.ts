import {parseNpmPackOutput} from '../drcp-cmd';

describe('drcp-cmd', () => {
  it('parseNpmPackOutput', () => {
    const map = parseNpmPackOutput(`
npm notice === Tarball Details === 
npm notice name:          require-injector                        
npm notice version:       5.1.5                                   
npm notice filename:      require-injector-5.1.5.tgz              
npm notice package size:  56.9 kB                                 
npm notice unpacked size: 229.1 kB                                
npm notice shasum:        c0693270c140f65a696207ab9deb18e64452a02c
npm notice integrity:     sha512-kRGVWcw1fvQ5J[...]ABwLPU8UvStbA==
npm notice total files:   47                                      
npm notice`);
    // tslint:disable-next-line: no-console
    console.log(map);
    expect(map.get('filename')).toBe('require-injector-5.1.5.tgz');
  });
});
