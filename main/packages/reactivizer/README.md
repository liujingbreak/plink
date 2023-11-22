# Make your plain object reactive

contents
```
 |- 1. A brief introduction
 | |- 1.1 Some of implemented design goals and APIs
 | |- 1.2 Quick view of what it looks like
 | | |- 1.2.1 Use interface or type to define the shape of reusable entity
 | | |- 1.2.2 Turn plain object to reactive reusable entity
```

## 1. A brief introduction

`@wfh/reactivizer` is a RxJS based Reactive Programming library for programming convenience.
Like a lot of other `rx` series library, it provides some utility functions and classes
that help to program our application in an opinionated Reactive programming style or paradigm at a low level.

The idea is combining traditional object-oriented designed resuable software entity (Class/Object) with "event streaming" and reactive style.

Unlike other "rx" based librarys,
- @wfh/reactivizer does not emphasize contribution on either **frontend** or **backend** side, it is just a low level programming utility,
but it is not limited to be used as frontend state management tool or a backend service controller, even graphics scene builder.
- @wfh/reactivizer is not a platform or architecture tool like "event sourcing" to address and solve high level design concerns in between modules or services.

Some of the concepts and conventions are inspired by Apache kafka, Redux-observable

### 1.1. Some of implemented design goals and APIs
- Great Typescript type definition for type inference
- You can use plain "interface", "class" and "member functions" to define group of `Observable` message streams.
- Mimic OOP concept, You can **extend** exsting reusable entity (class/object), **intercept** input or output messages to **override** existing behaviors of extended entity.
- Simple, easy to understand how it works and easy to remember any of API name, less coding in consumer program.
- Taking care of error handling by default.
- `table`s, message's state management, which is a queriable snapshot of `Observable` messages.
- Message, tracing and tracking which can help to debug and locate problems of from big amount of Observable messages.
- A [**recursive forkjoin**](./docs/reactivizerForkJoin.md) API for Node.js **thread_workers** and browser's **web worker**, and on top of it, an implementation of multithread **merge sort** algorithm.
- RxJS is the only required (peer) dependency, another optional dependency [@wfh/algorithms](../algorithms/README.md) is only needed in case of using **forkjoin** module

### 1.2. Quick view of what it looks like

#### 1.2.1. Use `interface` or `type` to define the shape of reusable entity

```ts
import * as rx from 'rxjs';
import {ReactorComposite} from '@wfh/reactivizer';

// input message
type InputActions = {
  greeting(byName: string): void;
  askQuestion(topic: string, detial: string): void;
  setLanguage(locale: string): void;
};

// output message
type OutputEvents = {
  replyGreeting(word: string): void;
  answerQuestion(content: string): void;
};

export function createSample() {
  // define which actions should be stateful (treated as new ReplaySubject(1))
  const inputTableFor = ['setLanguage'] as const;

  const sample = new ReactorComposite<InputActions, OutputEvent, typeof inputTableFor>({
    name: 'Sample',
    inputTableFor
  });

  const {i: input, o: output, r: addReactor, inputTable} = sample;

  // set default value for a stateful message stream
  input.dispatcher.setLanguage('zh');

  // Plan reactions on incoming "action"
  addReactor('handle greeting', input.payloadByType.greeting.pipe(
    rx.mergeMap(async ([, byName]) => {
      const nickName = await someAsyncQuery(byName);
      output.dispatcher.replyGreeting('Hi ' + nickName);
    })
  ));

  addReactor('answer questions', input.payloadByType.askQuestion.pipe(
    // retrieve latest value of stateful message "setLanguage"
    rx.combineLatestWith(inputTable.l.setLanguage.pipe(rx.take(1)),
    // Choose to ignore last question
    rx.switchMap(async ([[meta1, topic, detail], [meta2, lang]]) => {
      const answer = await someAsyncQuery(lang, detail);
      output.dispatcherFor.answerQuestion([meta1, meta2], `>> ${topic}\n` + answer);
    })
  ));
}
```

#### 1.2.2. Turn plain object to reactive reusable entity

```ts
class MyService {
  greeting(user: string, msg: string) {
    return Promise.resolve('Welcome' + user);
  }

  search(keyWords: string) {
    return rx.of('result: ...');
  }
}

export function createMyReactiveService() {
  return new ReactorComposite({name: 'myService'})
    .reactivize(new MyService());
}

// Use reactive version of MyService
const myRxService = createMyReactiveService();

// Dispatch "search" message and observe respective "returned" message, "at" stands for "actionByType"
myRxService.i.dispatchAndObserveRes.search(myRxService.o.at.searchResolved, 'ReactiveX').pipe(
  rx.tap(([, result]) => {
    console.log('we got search result', result);
  })
).subscribe();

// pt stands for abbrevation of "payloadByType"
myRxService.o.pt.greetingResolved.pipe(
  rx.tap(([, replyGreeting]) => {
    console.log('My service resplied with:', replyGreeting);
  })
).subscribe();

myRxService.i.dispatcher.greeting('Tommy', 'Hi');
```

## 2. Understand by comparing with plain object-oriented programming
[Further reading](./docs/compare-with-OOP.md)


> Document site is under construction, author is also working on implementing a version in Java.
