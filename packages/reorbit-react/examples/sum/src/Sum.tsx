import React, { memo } from 'react';
import { createOrb, Orb, OrbDef, State } from 'reorbit';
import { useOrb } from 'reorbit-react';

const { keys } = Object;

interface SumOrbStore extends State {
  increment: (value: number) => number,
  decrement: (value: number) => number,
}

export interface SumOrb extends Orb {
  value: number,
  sum: number,
  state: {
    value: SumOrbStore,
    sum: SumOrbStore,
  },
  children: SumOrb[],
  incrementWithChildren: (orb: SumOrb) => void,
  decrementWithChildren: (orb: SumOrb) => void,
}

export const SumOrbDef: OrbDef = {
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
    sum: {
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
    incrementWithChildren(orb: SumOrb) {
      orb.state.value.increment(1);
      let curOrb = orb;
      while (curOrb) {
        curOrb.state.sum.increment(1);
        curOrb = curOrb.parent as SumOrb;
      }
    },
    decrementWithChildren(orb: SumOrb) {
      const lastChild = orb.children[keys(orb.children).length - 1];
      const lastChildSum = (lastChild && lastChild.sum) || 0;
      let curOrb = orb;
      while (curOrb) {
        curOrb.state.sum.decrement(1 + lastChildSum);
        curOrb = curOrb.parent as SumOrb;
      }
      orb.state.value.decrement(1);
    }
  },
  dynamic: {
    children: {
      dependencies: [
        (orb: SumOrb) => orb.state.value,
      ],
      derive: (orb: SumOrb) => {
        const orbs = [];
        for (let count = 0; count < orb.value; count += 1) {
          orbs.push(createOrb<SumOrb>(SumOrbDef, orb, String(count)));
        }
        return orbs;
      },
    },
  },
};

export const Sum = memo(({ orb }: { orb: SumOrb }) => {
  const { value, sum, children, incrementWithChildren, decrementWithChildren } = orb;
  useOrb(orb);
  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      Value ({value})
      <br/>
      Sum ({sum})
      <div>
        <button onClick={() => incrementWithChildren(orb)}>+</button>
        <button onClick={() => decrementWithChildren(orb)}>-</button>
      </div>
      <div>
        {children.map((child, key) => {
          return <Sum key={key} orb={child} />;
        })}
      </div>
    </div>
  );
});