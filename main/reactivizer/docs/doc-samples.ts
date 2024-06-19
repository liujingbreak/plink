/* eslint-disable no-console */
import * as rx from 'rxjs';
import {SimplexReactor, SingleActionFactory} from '@wfh/reactivizer';

// Use interface or type to define input message
interface InputActions {
  greeting(byName: string): SingleActionFactory;
  askQuestion(topic: string, details: string): SingleActionFactory;
  setLanguage(locale: string): SingleActionFactory;
}

// Define output message
interface OutputEvents {
  replyGreeting(word: string): SingleActionFactory;
  answerQuestion(content: string): SingleActionFactory;
}

// define which actions should be stored and replayable (treated by ReplaySubject(1))
const tableFor = ['setLanguage'] as const;
export function createMyReactiveService() {

  // Create an reactive service
  const myRxService = new SimplexReactor<InputActions & OutputEvents, typeof tableFor>({
    name: 'Sample',
    tableFor
  });

  const {s, r, table} = myRxService;

  // create a message "setLanguage" and dispatch it, the parameter will be stored in internal `Map` for later reading (or replay)
  s.ft.setLanguage('zh').dp();

  // Plan reactions on incoming input "message", this is like defining a member function body of reactive service
  r('greeting -> replyGreeting', s.pt.greeting.pipe(
    rx.combineLatestWith(table.l.setLanguage),
    rx.mergeMap(async ([[meta, byName], [, lang]]) => {
      const nickName = await someAsyncQuery(lang, byName);
      s.ft.replyGreeting('Hi ' + nickName).re(meta).dp();
    })
  ));

  r('askQuestion -> answerQuestion', s.pt.askQuestion.pipe(
    // retrieve latest value of input message "setLanguage", consider it is like a join query in SQL
    rx.combineLatestWith(table.l.setLanguage),
    // "switchMap" means to ignore last uncompleted question
    rx.switchMap(async ([[meta, topic, detail], [, lang]]) => {
      const answer = await someAsyncQuery(lang, detail);
      s.ft.answerQuestion(`>> ${topic}\n` + answer).re(meta).dp();
    })
  ));
  return myRxService;
}

export type MyReactiveSerivce = SimplexReactor<InputActions & OutputEvents, typeof tableFor>;

export function consumeServiceExample(service: SimplexReactor<InputActions & OutputEvents, typeof tableFor>) {
  service.s.ft.greeting('hello').dp();
}

// -----------------------------------------------------
// A sample for turning plain object to reactive serivce

function someAsyncQuery(lang: string, detail: string) {
  return Promise.resolve('foobar');
}

class MyService {
  greeting(user: string, msg: string) {
    return Promise.resolve('Welcome' + user);
  }

  search(keyWords: string) {
    return rx.of('result: ...');
  }
}

export function createReactiveService() {
  return new SimplexReactor({name: 'myService'})
    .reactivize(new MyService());
}

// Use reactive version of MyService
const myRxService = createReactiveService();
const {s} = myRxService;
// Dispatch "search" message and observe respective "returned" message, "at" stands for "actionByType"
s.ft.search('ReactiveX').do(myRxService.s.pt.searchResolved).pipe(
  rx.tap(([, result]) => {
    console.log('we got search result', result);
  })
).subscribe();

// pt stands for abbrevation of "payloadByType"
myRxService.s.pt.greetingResolved.pipe(
  rx.tap(([, replyGreeting]) => {
    console.log('My service resplied with:', replyGreeting);
  })
).subscribe();

myRxService.s.ft.greeting('Tommy', 'Hi').dp();
