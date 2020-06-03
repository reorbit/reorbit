import React from 'react';
import { Orb, OrbDef } from "reorbit";
import { useOrb } from "reorbit-react";

export interface CounterOrb extends Orb {
  value: number,
  increment: (value: number) => number;
  decrement: (value: number) => number;
  valuePlusOne: number,
  double: (value: number) => number,
  incrementAsync: (orb: CounterOrb, value: number) => void,
}

export const CounterOrbDef: OrbDef<CounterOrb> = {
  state: {
    value: {
      default: 0,
      transitions: {
        increment(state: number, value: number): number {
          return state + value;
        },
        decrement(state: number, value: number): number {
          return state - value;
        },
      },
    },
  },
  static: {
    double(value: number) {
      return value * 2;
    },
    incrementAsync(orb: CounterOrb, value: number) {
      setTimeout(() => orb.increment(orb.double(value)), 1000);
    },
  },
  dynamic: {
    valuePlusOne: {
      dependencies: [
        (orb: CounterOrb) => orb.state.value,
      ],
      derive(orb: CounterOrb) {
        return orb.value + 1;
      },
    },
  },
}

export function Counter({ orb }: { orb: CounterOrb}) {
  const { value, valuePlusOne, increment, decrement, double, incrementAsync } = orb;
  useOrb(orb);

  return (
    <div>
      Value ({value}) ({valuePlusOne}) ({double(value)})
      {<button onClick={() => increment(1)}>+</button>}
      {<button onClick={() => decrement(1)}>-</button>}
      {<button onClick={() => incrementAsync(orb, 1)}>Async</button>}
    </div>
  );
}