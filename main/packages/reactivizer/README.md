# Make your plain object reactive

## 1. A brief introduction

`@wfh/reactivizer` is a RxJS based Reactive Programming library for programming convenience.
It introduces an opinionated style to program reusable logic in shape of **reative service**, you may consider it as a reactive enhanced of OOP.

@wfh/reactivizer does not emphasize contribution on either **frontend** or **backend** side, it is just a low level programming utility,
but it is not limited to be used as frontend state management tool or a backend service controller, even graphics scene builder.

@wfh/reactivizer is not a platform or architecture tool like "event sourcing" to address and solve high level design concerns in between modules or services.

Some of the concepts and conventions are inspired by Apache kafka, Redux-observable

### 1.1. Some of implemented design goals and APIs
- Great Typescript type definition for type inference
- You can use plain "interface", "class" and "member functions" to define group of `Observable` message streams.
- Mimic OOP concept, You can **extend** exsting reusable entity (class/object), **intercept** input or output messages to **override** existing behaviors of extended entity.
- Simple, easy to understand how it works and easy to remember any of API name, less coding in consumer program.
- Taking care of error handling by default.
- `table`s, message's state management, which is a queriable snapshot of `Observable` messages.
- A [**recursive forkjoin**](./docs/fork-join.md) API for Node.js **thread_workers** and browser's **web worker**, and on top of it, an implementation of multithread **merge sort** algorithm.
- RxJS is the only required (peer) dependency, another optional dependency [@wfh/algorithms](../algorithms/README.md) is only needed in case of using **forkjoin** module

### 1.2. A glance at some code

#### 1.2.1. a sample **reative service**

```ts
import * as rx from 'rxjs';
import {ReactorComposite2, SingleActionFactory} from '@wfh/reactivizer';

// Use interface or type to define input message
interface InputActions {
  greeting(byName: string): SingleActionFactory;
  askQuestion(topic: string, detial: string): SingleActionFactory;
  setLanguage(locale: string): SingleActionFactory;
}

// Define output message
interface OutputEvents = {
  replyGreeting(word: string): SingleActionFactory;
  answerQuestion(content: string): SingleActionFactory;
}

export function createMyReactiveService() {
  // define which actions should be stored and replayable (treated by ReplaySubject(1))
  const inputTableFor = ['setLanguage'] as const;

  // Create an reactive service
  const myRxService = new ReactorComposite2<InputActions, OutputEvent, typeof inputTableFor>({
    name: 'Sample',
    inputTableFor
  });

  const {i, o, r, inputTable} = myRxService;

  // create a message "setLanguage" and dispatch it, the parameter will be stored in internal `Map` for later reading (or replay)
  i.ft.setLanguage('zh').dp();

  // Plan reactions on incoming input "message", this is like defining a member function body of reactive service
  r('greeting -> replyGreeting', i.pt.greeting.pipe(
    rx.mergeMap(async ([meta, byName]) => {
      const nickName = await someAsyncQuery(byName);
      o.ft.replyGreeting('Hi ' + nickName).dp(meta);
    })
  ));

  r('askQuestion -> answerQuestion', i.pt.askQuestion.pipe(
    // retrieve latest value of input message "setLanguage", consider it is like a join query in SQL
    rx.combineLatestWith(inputTable.l.setLanguage.pipe(rx.take(1)),
    // "switchMap" means to ignore last uncompleted question
    rx.switchMap(async ([[meta1, topic, detail], [meta2, lang]]) => {
      const answer = await someAsyncQuery(lang, detail);
      o.ft.answerQuestion(`>> ${topic}\n` + answer).dp(meta1, meta2);
    })
  ));
}
```
In above snippet, `new ReactorComposite2<InputActions, OutputEvent, typeof inputTableFor>(...)` is creating an _Reactive Service_,
the type parameter tells the shape of input and output messages, the `inputTableFor` tells which messages should be stored and replayable for later query.

#### 1.2.2 A consumer program interact with _Reactive Service_ in form of dispatching **input** message and subscribe **output** message

```ts
i.ft.<inputMessage>(...parameter).dp();
```
- `i` stands for the **input** message stream controller
- `ft` means "factory by type", which is a map of factory functions of input or output stream controllers
- Invoke `i.ft.<inputMessage>(...parameter)` to create a **message**.
- Continue to call `.dp()` will _dispatch_ this message to down stream.

And if we are expecting a result from an _Reactive Service_, it can be written like,
```ts
i.ft.greeting('comrade').do(o.pt.replyGreeting).pipe(
  rx.take(1)
).subscribe(result => console.log(result));
```
So it means, "send a `greeting` message to service and subscribe to a response message `replyGreeting`".
And it returns an Observable, you may turn it into any other form you like if you are proficient in RxJS, e.g. as Promise,
```ts
const result = await rx.firstValueFrom(i.ft.greeting('comrade').do(o.pt.replyGreeting));
```

- `r('description...', ...)` is a "reactor"
its job is _subscribing_ to _Observable_ stream of specified **message**, and play side effects or dispatch more output messages.
You may consider it as equivalent to _method_ body in OOP, if _message_ is the method name.

#### 1.2.2. Or you may turn a plain object into reactive reusable entity

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
  return new ReactorComposite2({name: 'myService'})
    .reactivize(new MyService());
}

// Use reactive version of MyService
const myRxService = createMyReactiveService();
const {i, o} = myRxService;
// Dispatch "search" message and observe respective "returned" message, "at" stands for "actionByType"
i.ft.search('ReactiveX').do(myRxService.o.at.searchResolved).pipe(
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

## 2. Introduction
[Further reading](./docs/introduction.md)


> Document site is under construction, author is also working on implementing a version in Java.
