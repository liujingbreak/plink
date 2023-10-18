Stream and state
---------
> Refer to [Kafka's duality of Steams and Tables](https://kafka.apache.org/35/documentation/streams/core-concepts#streams_concepts_duality)

### A stream process is a "Push" mode data process programming

### A state query is a "Pull" mode data query programming



```ts
i.createLatestPayloadsFor
i.pt.actionA.pipe(
  rx.withLatestFrom(i.pt.actionB),
  rx.tap([[, ...actionAData], [, ...actionBData]]) => {
    // process steam event of "actionA", pull data of "actionB" from `state`
  })
)
```
