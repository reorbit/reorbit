# Reorbit

Reorbit is a library that enables application state to be structured, dynamic, and composable.

# Motivation

React popularized component based views, but it coupled application state with the views. This causes issues because sometimes application state does not map 1-to-1 to views, like data returned from APIs. Libraries like Redux emerged to fill the gap of storing state decoupled from the views, but it has a few limitations. Since Redux is only concerned about serializable state, it does not provide a facility to compose related dynamic or other non-serializable properties. Reorbit allows you to group all state and logic that are "concerned" with each other into structured, self contained objects called "orbs". Orbs are decoupled from views and can be composed and abstracted. They therefore possess the same powerful properties similar to what composition and abstraction provides to React views.

To give a better sense of this in action, here is a demo of a fractal counter using Reorbit:

And a slightly more complicated application where each counter also tracks the sum of all it's child counters in a performant manner:

## How does it work?

All state and related logic is defined as a tree of dynamic, composable, and type capable objects called "orbs". Views can subscribe to orbs and render when their state is updated.

Orbs are defined using plain objects, allowing the definitions themselves to be composed and transformed dynamically. Within an and orb definition, you can describe subscribable state and their respective transition functions. You can also define related static functions or properties, which are helpful for storing logic around side effects and other helper functions. Finally, you can also define dynamic properties in an orb that are dependent on its own state, or state from another orb within the application. This allows for applications where all state always has a single source of truth. You can even define child orbs as dynamic properties, allowing for composition and abstraction of orbs.

Since all serializable state is structured in a predictable way, orbs can also be serialized and deserialized trivially. These are properties important to enabling powerful functionality within the application as well as enabling powerful developer tools.

## The basics:

### Step 1 - Defining your orb (types are optional but recommended)
```
import { Orb, OrbDef, createOrb, subscribe } from "reorbit";

export interface CounterOrb extends Orb {
  value: number;
  increment: (value: number) => void;
}

export const CounterOrbDef: OrbDef = {
  state: {
    value: {
      default: () => 0,
      transitions: {
        increment(state: number, value: number): number {
          return state + value;
        },
      }
    }
  },
}
```
### Step 2 - Create your orb
```
const counterOrb = createOrb<CounterOrb>(CounterOrbDef);
```
### Step 3 - Subscribe to state changes
```
subscribe(counterOrb, () => {
  console.log(`Value: ${counterOrb.value}`);
});
```
### Step 4 - Trigger a state change
```
counterOrb.state.value.increment(1);
// Value: 1
```

Try it out!

## Static properties
```
export interface StaticOrb extends Orb {
  someConstant: number;
  sideEffect: (orb: StaticOrb) => void;
}

export const StaticOrbDef: OrbDef = {
  static: {
    someConstant: 1,
    sideEffect(orb: StaticOrb) {
        setTimeout(() => console.log(`Value: ${orb.someConstant}`), 1000);
    },
  },
}

const staticOrb = createOrb<StaticOrb>(StaticOrbDef);

staticOrb.sideEffect(staticOrb);
// Value: 1 (after 1 second)
```

## Dynamic properties
```
export interface DynamicOrb extends Orb {
  value: number;
  increment: (value: number) => void;
  double: number;
}

export const DynamicOrbDef: OrbDef = {
  state: {
    value: {
      default: () => 0,
      transitions: {
        increment(state: number, value: number): number {
          return state + value;
        },
      }
    }
  },
  dynamic: {
    double: {
        dependencies: () => [
            (orb: DynamicOrb) => orb.state.value,
        ],
        combiner(orb: DynamicOrb) {
            return orb.value * 2;
        },
    },
  },
}

const dynamicOrb = createOrb<DynamicOrb>(DynamicOrbDef);

console.log(dynamicOrb.double)
// 0
dynamicOrb.increment(1);
console.log(dynamicOrb.double)
// 2
dynamicOrb.increment(1);
console.log(dynamicOrb.double)
// 4
```

## Anatomy of an orb definition

### State Map
```
export const NewOrbDef: OrbDef = {
  state: { // All serializable state should be defined in the state map
    stateKey: { // The state is assigned to the orb with the key provided
      default: () => 0, // The initial function returns the initial state
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
```
export const NewOrbDef: OrbDef = {
  static: { // All static values and functions should be defined in the static map
    // Properties can be values or functions
    staticProperty: 0,
    staticFunction() {
        console.log('side effect'); // Functions are a good place to store side effects
    },
  },
}
```
### Dynamic Map
```
export const NewOrbDef: OrbDef = {
  state: {
      value: {
          default: () => 0,
      }
  }
  dynamic: { // All dynamic serializable and non serializable data should be stored in the dynamic map
    // These can be composed of derived state, or even child orbs
    dynamicKey: {
        // Do define these values, you need to define a function that returns and array of functions
        // Those functions take in the current orb as an argument and return a subscribable value
        // Subscribable values are defined as state or other dynamic values
        dependencies: () => [
            (orb: NewOrbDef) => orb.state.value,
        ],
        // The combiner takes in the orbs containing the subscrbed dependencies
        // The value returned from the function is assigned to the orb
        combiner(orb: NewOrbDef) {
            return orb.value * 2;
        },
    },
  },
}
```
