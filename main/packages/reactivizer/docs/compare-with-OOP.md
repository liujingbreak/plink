## 2. Understand by comparing with plain object-oriented programming

### 2.1 Concepts introduction

OOP languages permit higher level of abstraction for solving real-life problems, along with a lot of design patterns it is widely understood by majority of software engineers.
OOP combines the data structures and algorithms of a reusable software entity inside the same box, e.g. "Class".
OOP stands on ground of [Imperative programming paradigm](https://en.wikipedia.org/wiki/Imperative_programming)

Reactive programming is member of [declarative programming paradigm](https://en.wikipedia.org/wiki/Declarative_programming) family

@wfh/reativizer is a library to help you to program things in reactive style at low level source code, while we can still keep some high level OOP concepts with it.

- OOP's design thoughts: encapsulation, inheritance
- Reactive's event-driven design thoughts.
- Reactive's asynchronous stream process ability

OOP concepts | @wfh/reativizer reformed
| - | -
Class | `ReactorComposite<InputActions, OutputEvents, InputTable, outputTable>`
instance | `new ReactorComposite<InputActions, OutputEvents, InputTable, outputTable>(opts)`
Interface | type definition of **InputActions**, **OutputEvents** or arbitrary type like `Partial<InputActions...>`
member method | ReactorComposite::**inputControl**.dispatcher[member], ReactorComposite::**outputControl**.dispatcher[member], ReactorComposite::`addReactor(observable)`
member field | ReactorComposite::**inputTable**, ReactorComposite::outputTable, arbitrary [BehaviorSubject](https://rxjs.dev/api/index/class/BehaviorSubject) defined in function scope
extends | `ReactorComposite<InputActions & ExtendInputActions, OutputEvents & ExtendOutputEvents>`
override | `ReactorComposite::inputControl.updateInterceptor(factory: (previousInterceptor) => Interceptor))`
