import React from 'react';
import createTookit from './tiny-redux-toolkit';
export * from './tiny-redux-toolkit';
export function useTinyReduxTookit(opt) {
    const [state, setState] = React.useState(opt.initialState);
    const tool = React.useMemo(() => createTookit(Object.assign(Object.assign({}, opt), { onStateChange: s => setState(s) })), []);
    React.useEffect(() => {
        return tool.destroy;
    }, []);
    return Object.assign(Object.assign({ useEpic(epic) {
            React.useEffect(() => {
                tool.addEpic(epic);
            }, []);
        } }, tool), { state });
}
