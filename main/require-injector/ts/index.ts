import {RequireInjector} from './replace-require';
import {InjectorOption} from './node-inject';
import Injector from './replace-require';


export {FactoryMapInterf} from './factory-map';
export {Injector as default};
export {RequireInjector} from './replace-require';

export {InjectorOption, ResolveOption} from './node-inject';

let instance: RequireInjector;
export function getInstance(options: InjectorOption): RequireInjector {
  if (instance == null)
    instance = new Injector(options);
  return instance;
}
