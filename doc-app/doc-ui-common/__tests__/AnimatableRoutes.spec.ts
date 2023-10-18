import {describe, it, expect}  from '@jest/globals';
import {testable} from '../client/animation/AnimatableRoutes.hooks';

describe('Animatable router', () => {
  it('matchPath should work', () => {
    const compiled = testable.compileRoutes([
      {
        path: '/hello/:id/:id2/world',
        element: null
      },
      {
        path: '/hello/*',
        element: null
      }
    ]);

    expect(compiled[0].paramNames.length).toBe(2);
    // expect(compiled[0].paramNames).toEqual(['123', '456']);
    const matched = testable.matchRoute(compiled, '/hello/123/456/world');
    expect(matched?.matchedParams.id).toEqual('123');
    expect(matched?.matchedParams.id2).toEqual('456');
    const matched2 = testable.matchRoute(compiled, '/hello/foobar');
    // eslint-disable-next-line no-console
    console.log(matched2);
  });
});
