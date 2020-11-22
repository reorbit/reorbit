# <img src="./logo/reorbit-logo.png " width="256">
Reorbit is a library that enables application state to be structured, dynamic, and composable. It allows your to create a typesafe API to all your application state.

![](name-of-giphy.gif)

[Try it!](https://codesandbox.io/s/github/reorbit/reorbit/tree/master/examples/redux-devtools/redux-devtools)

# Motivation

React popularized component based views, but it couples application state with the views. This causes issues when application state does not map 1-to-1 to views, like data returned from APIs. Libraries like Redux emerged to fill the gap of storing state decoupled from the views, but it has a few limitations. Since Redux is only concerned about serializable state, it does not provide a facility to compose related dynamic or other non-serializable properties.
Reorbit allows you to group all state and logic that are "concerned" with each other into structured, self contained objects called "orbs". Orbs are decoupled from views and can be composed and abstracted. They therefore possess the same powerful properties similar to what composition and abstraction provides to React views.

To give a better sense of this in action, here is a demo of a fractal counter using Reorbit:

[Fractal Counter](https://codesandbox.io/s/github/reorbit/reorbit/tree/master/examples/react/react-fractal)

And here is the implementation of quintessential todo app:

[Sum](https://codesandbox.io/s/github/reorbit/reorbit/tree/master/examples/react/react-todos)

## How does it work?

All state and related logic are defined as a tree of dynamic, composable, and type capable objects called "orbs". Views can subscribe to orbs and be rendered when their state is updated.

Orbs are defined using plain objects, allowing the definitions to be composed and transformed dynamically. Within an orb definition, you can define subscribable state and their respective transition functions. You can also define related static functions or properties, which are helpful for storing logic around side effects and other helper functions. In addition, you can define dynamic properties in an orb that are dependent on its own state, or state from another orb within the application. This allows applications to have all state always have a single source of truth. You can even define child orbs as dynamic properties, allowing for composition and abstraction of orbs.

Since all serializable state is structured in a predictable way, orbs can also be serialized and deserialized trivially. These are properties important to enabling powerful functionality within the application as well as enabling powerful developer tools.

## The basics:

### Step 1 - Defining your orb (types are optional but recommended)
```javascript
import { Orb, OrbDef, State, createOrb, subscribe } from "reorbit";

interface CounterOrb extends Orb {
  value: number;
  increment: (value: number) => number;
}

const CounterOrbDef: OrbDef<CounterOrb> = {
  state: {
    value: {
      default: 0,
      transitions: {
        increment(state: number, value: number): number {
          return state + value;
        },
      },
    },
  },
};
```
### Step 2 - Create your orb
```javascript
const counterOrb = createOrb<CounterOrb>(CounterOrbDef);
```
### Step 3 - Subscribe to state changes
```javascript
subscribe(counterOrb, () => {
  console.log(`Value: ${counterOrb.value}`);
});
```
### Step 4 - Trigger a state change
```javascript
counterOrb.increment(1);
// Value: 1
```

[Try it out!](https://codesandbox.io/s/github/reorbit/reorbit/tree/master/examples/core/basic)

## Static properties
```javascript
interface StaticOrb extends Orb {
  someConstant: number;
  sideEffect: (orb: StaticOrb) => void;
}

const StaticOrbDef: OrbDef<StaticOrb> = {
  static: {
    someConstant: 1,
    sideEffect(num: number) {
      setTimeout(() => console.log(`Value: ${num}`), 1000);
    },
  },
};

const staticOrb = createOrb<StaticOrb>(StaticOrbDef);

staticOrb.sideEffect(1);
// Value: 1 (after 1 second)
```

## Dynamic properties
```javascript

interface DynamicOrb extends Orb {
  value: number,
  double: number,
  increment: (value: number) => void;
}

const DynamicOrbDef: OrbDef<DynamicOrb> = {
  state: {
    value: {
      default: 0,
      transitions: {
        increment(state: number, value: number): number {
          return state + value;
        },
      },
    },
  },
  dynamic: {
    double: {
      dependencies: [
        (orb: DynamicOrb) => orb.state.value,
      ],
      derive(currentOrb: DynamicOrb, dependantOrb: DynamicOrb) {
        return dependantOrb.value * 2;
      },
    },
  },
};

const dynamicOrb = createOrb<DynamicOrb>(DynamicOrbDef);

console.log(dynamicOrb.double);
// 0
dynamicOrb.increment(1);
console.log(dynamicOrb.double);
// 2
dynamicOrb.increment(1);
console.log(dynamicOrb.double);
// 4
```

## Anatomy of an orb definition

### State Map
```javascript
export const NewOrbDef: OrbDef = {
  state: { // All serializable state should be defined in the state map
    stateKey: { // The state is assigned to the orb with the key provided
      default: 0, // The initial state
      transitions: { // The transitions in the definition will be assigned to the orb
        // When the function on the orb is called the state transition defined here is made
        // All the arguments to the function call are appended to the state transition arguments
        // Each state transition function returns a new state given a previous state and the arguments
        increment(state: number, value: number): number {
          return state + value;
        },
      },
    },
  },
};
```
### Static Map
```javascript
export const NewOrbDef: OrbDef = {
  static: { // All static values and functions should be defined in the static map
    // Properties can be values or functions
    staticProperty: 0,
    staticFunction() {
      console.log('side effect'); // Functions are where all side effects should be placed
    },
  },
};
```
### Dynamic Map
```javascript
export const NewOrbDef: OrbDef = {
  state: {
    value: {
      default: 0,
    },
  },
  dynamic: { // All dynamic serializable and non serializable data should be stored in the dynamic map
    // These can be composed of derived state, or even child orbs
    dynamicKey: {
      // To define these values, you need to define a function that returns and array of functions
      // Those functions take in the current orb as an argument and return a subscribable value
      // Subscribable values are defined as state or other dynamic values
      dependencies: [
        (orb: NewOrbDef) => orb.state.value,
      ],
      // The derive function takes in the orbs containing the subscrbed dependencies
      // The first argument will always be the current orb
      // The orbs that hold all the remaining dependencies are spread out as the remaining arguments
      // The value returned from the function is assigned to the orb
      derive(currentOrb: NewOrbDef, dependentOrb: NewOrbDef) {
        return dependentOrb.value * 2;
      },
    },
  },
};
```
