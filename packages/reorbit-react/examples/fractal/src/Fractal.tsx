import React from 'react';
import { createOrb, Orb, OrbDef, State } from 'reorbit';
import { useOrb } from 'reorbit-react';

interface FractalOrbStore extends State {
  increment: (value: number) => number,
  decrement: (value: number) => number,
}

export interface FractalOrb extends Orb {
  value: number,
  state: {
    value: FractalOrbStore,
  },
  children: FractalOrb[],
}

export const FractalOrbDef: OrbDef = {
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
  dynamic: {
    children: {
      dependencies: [
        (orb: FractalOrb) => orb.state.value,
      ],
      derive: (orb: FractalOrb) => {
        const orbs = [];
        for (let count = 0; count < orb.value; count += 1) {
          orbs.push(createOrb<FractalOrb>(FractalOrbDef, orb, String(count)));
        }
        return orbs;
      },
    },
  },
};

export const Fractal = ({ orb }: { orb: FractalOrb }) => {
  const { value, state, children } = orb;
  const { value: { increment, decrement } } = state;
  useOrb(orb);
  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      Value ({value})
      <div>
        <button onClick={() => increment(1)}>+</button>
        <button onClick={() => decrement(1)}>-</button>
      </div>
      <div>
        {children.map((child, key) => {
          return <Fractal key={key} orb={child} />;
        })}
      </div>
    </div>
  );
};