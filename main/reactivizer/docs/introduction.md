# Make your plain object reactive

## 2 Introduction
**reactivized** reactive service can be simply understood with comparing concepts in object-oriented programming design.
### 2.1 Reactive service
The most basic distinct feature of `Reactive service` from plain Object-oriented design is that its totally **message** or **event** driven.

To interact with `Reactive service`, one has to **create** and **dispatch** a message, instead of invoking a **public method** on an object.

To consume data from service, one has to **subcribe a message stream** with proper filtering condition, instead of retrieving a method result.

### 2.2 Define service shape
To define how a service interact with outsider service consumer, we just need to define interface of input message factory, output event messages factory and message table.
#### 2.2.1 Basic types
##### Message interface
A message is represented in type `Action<F>`
```ts
export type Action<F> = {
  /** type */
  t: string;
  /** payload **/
  p: InferPayload<F>;
} & ActionMeta;
```
The message is consist of following properties:

| Property | Description
| - | -
| `t` | message type name
| `i` | message ID
| `p` | message payload, which is an array
| `r` | context information, value is a or more `ID` of other messages

#### 2.2.2 Interface of input and output message

This is what both input and output message factories should be written like:
```ts
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
```
We can use either `interface` or `type` keyward in Typescript. The only thing it requires is that each member method of interface must return `SingleActionFactory` type.
The parameter values is considered as message content which is property `p` of `Action`

`SingleActionFactory` provides methods to create and dispatch message `Action`

### 2.3 Message stream controller and dispatching message
As a message producer to create and dispatch message, we need firstly abtain a message stream controller of type `RxController2<I>`.
For example, if there is an exiting reactive **service** instance of type `SimplexReactor`, its property `.s` is the core message stream controller.
Here is how we use it to create and dispatch message:

#### 2.3.1 Dispatching action message
```ts
export function consumeServiceExample(service: SimplexReactor<InputActions & OutputEvents, typeof tableFor>) {
  service.s.ft.greeting('hello').dp(); // create and dispatch a message whose type is "greeting" and its payload is `['hello']`
}
```
- The property `.ft` stands for "Action factory of type...", it is an implementation of interface `InputActions` (underneath it is just a `Proxy`).
- The `.greeting()` is inferred from `InputActions['greeting']` function, it accepts a parameter as the value of message payload property `p`.
- `.dp` (stands for "dispatch") is a member function of implementation of type `SingleActionFactory`, it dispatchs specific message to stream controller and returns that message instance of type `Action<InputActions['greeting']>`.

#### 2.3.2 Consuming message
To cosume message of a certain type of message,
We can subscribe Action observable
```ts
s.at.askQuestion.pipe(
  rx.map(action => {
    const [question, details] = action.p;
    console.log(question, details);
  })
).subscribe();
```
or subscribe to Action variant **Payload**, which is more convenient data structure to extract action payload data from
```ts
s.pt.greeting.pipe(
  rx.map(([_actionMeta, question, details]) => {
    console.log(question, details);
  })
).subscribe();
```

### 2.4 Creating service

#### 2.4.1 Error hanlding
#### 2.4.2 Type inference and access control
#### 2.4.3 Extend created service instance
### 3 Advanced features
- Dispatching and filtering contextual actions
- Statement menagement - action table
- Configuring and tracing debug information
- Action dispenser
- Other functionalities of RxController2
- Type inference
- Worker thread based fork-join service
[Further reading](./docs/advanced.md)

