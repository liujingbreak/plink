const scriptCache = new Map<string, Promise<HTMLScriptElement>>();
const moduleCache = new Map<string, Promise<unknown>>();
const containerCache = new Map<string, Promise<Container>>();

declare global {
  // Initializes the share containerName. This fills it with known provided modules from this build and all remotes
  const __webpack_init_sharing__: (containerName: string) => Promise<void>;
  const __webpack_share_scopes__: Record<string, object>;
}

type Container = {
  init(sharedScopeObject: object): Promise<void>;
  get<M>(moduleName: string): Promise<() => M>;
};

export default async function loadModule<M>(remoteUrl: string, containerName: string, module: string) {
  const key = `${remoteUrl}-${containerName}-${module}`;
  if (moduleCache.has(key))
    return await moduleCache.get(key) as M;

  let container: Container | undefined;
  if (containerCache.has(containerName)) {
    container = await containerCache.get(containerName);
  } else {
    const waitForContainer = initContainerOf(remoteUrl, containerName);
    containerCache.set(containerName, waitForContainer);
    container = await waitForContainer;
  }
  const factory = await container!.get<M>(module);
  const Module = factory();
  return Module;
}

function loadScript(url: string) {
  let cache = scriptCache.get(url);
  if (cache == null) {
    cache = new Promise<HTMLScriptElement>((resolve, reject) => {
      const element = document.createElement('script');

      element.src = url;
      element.type = 'text/javascript';
      element.async = true;

      element.onload = () => {
        resolve(element);
      };

      element.onerror = (err) => {
        reject(err);
      };

      document.head.appendChild(element);
    });
    scriptCache.set(url, cache);
  }
  return cache;
}

async function initContainerOf(url: string, containerName: string) {
  await loadScript(url);
  // Initializes the share containerName. This fills it with known provided modules from this build and all remotes
  await __webpack_init_sharing__('default');
  const container = (window as unknown as Record<string, Container>)[containerName]; // or get the container somewhere else
  // Initialize the container, it may provide shared modules
  await container.init(__webpack_share_scopes__.default);
  return container;
  // const factory = await container.get<M>(module);
  // const Module = factory();
  // return Module;
}
