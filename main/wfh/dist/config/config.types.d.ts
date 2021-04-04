import { DrcpSettings as PlinkSettings } from './config-slice';
import { InjectorConfigHandler } from '../injector-factory';
export interface PropertyMeta {
    property: string;
    desc: string;
    type: string;
    optional: boolean;
}
export interface PackageSettingInterf<T> extends InjectorConfigHandler {
    (cliOptions: NonNullable<PlinkSettings['cliOptions']>): T;
}
