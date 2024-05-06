/* eslint-disable no-console */

export default function(input: number) {
  console.log('In thread');
  return new Promise(resolve => setTimeout(() => resolve(input * 10), 1000));
}
