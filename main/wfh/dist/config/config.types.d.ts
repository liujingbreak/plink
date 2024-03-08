import { InjectorConfigHandler } from '../injector-factory';
import { PlinkSettings } from './config-slice';
export interface PropertyMeta {
    property: string;
    desc: string;
    type: string;
    optional: boolean;
}
export interface PackageSettingInterf<T> extends InjectorConfigHandler {
    (cliOptions: NonNullable<PlinkSettings['cliOptions']>): T;
}
