
export async function queueUp<T>(parallel: number, actions: Array<() => Promise<T>>): Promise<T[]> {
  let actionIdx = 0;
  const results = [] as T[];

  const done = new Array<any>(parallel) as Promise<any>[];
  for (let i = 0; i < parallel; i++) {
    done[i] = performAction();
  }

  async function performAction() {
    while (actionIdx < actions.length) {
      try {
        results.push(await actions[actionIdx++]());
      } catch (err) {
        results.push(err);
      }
    }
  }

  await Promise.all(done);
  return results;
}

export function queue(maxParallel: number) {
  const actions: Array<() => Promise<void>> = [];
  // let actionIdx = 0;
  let parallel = 0;

  async function performAction() {
    parallel++;
    while (actions.length > 0) {
      await (actions.shift())!();
    }
    parallel--;
  }

  return {
    add<T>(action: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, rej) => {
        actions.push(() => action().then(resolve).catch(rej));
        if (parallel < maxParallel) {
          // TODO: handle promise rejection
          void performAction();
        }
      });
    }
  };
}



