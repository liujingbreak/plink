/* eslint-disable no-console */
import {queueUp, queue} from '../promise-queque';

describe('promise-queue', () => {
  it('parallel queueUp() task should work', async () => {
    const actions = [] as Array<() => Promise<any>>;
    for (let i = 0; i < 10; i++) {
      actions.push(() => {
        const idx = i;
        console.log(`${idx} start`);
        return new Promise(resolve => setTimeout(() => {
          resolve(idx);
          console.log(`${idx} done`);
        }, 500));
      });
    }
    const res = await queueUp(3, actions);
    console.log(res, res.length);

  });

  it('create queue and dynamically add async task to it', async () => {
    const {add} = queue(3);
    const dones = [] as Promise<number>[];
    for (let i = 0; i < 10; i++) {
      const done = add(() => {
        const idx = i;
        console.log(`${idx} start ${new Date().toLocaleTimeString()}`);
        return new Promise<number>(resolve => setTimeout(() => {
          resolve(idx);
          console.log(`${idx} done ${new Date().toLocaleTimeString()}`);
        }, 500));
      });
      dones.push(done);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    for (let i = 0; i < 5; i++) {
      const done = add(() => {
        const idx = 10 + i;
        console.log(`${idx} start ${new Date().toLocaleTimeString()}`);
        return new Promise<number>(resolve => setTimeout(() => {
          resolve(idx);
          console.log(`${idx} done ${new Date().toLocaleTimeString()}`);
        }, 500));
      });
      dones.push(done);
    }
    console.log(await Promise.all(dones));
  });
});
