# 2 Node.js utilities: a thread worker pool and a promise queue

## Thread worker pool
Create a thread pool, set maximum number of parallel threads to `os.cpus().length - 1`, maximum idle duration to be 1 minute.
```ts
import os from 'os';

const pool = new Pool(os.cpus().length - 1, 6000, {
  initializer: {file: 'source-map-support/register'},
  cwd: 'dist'
});

// Add 1 task to thread pool
const donePromise = pool.submit({
  file: 'worker-file.js',
  exportFn: 'default',
  args: []
});

```
Author your `worker-file.js` file
```ts
export default function(): Promise<Date> {
  return new Promise(resolve => setTimeout(() => resolve(new Date()), 1000));
}

```


## Promise queue
