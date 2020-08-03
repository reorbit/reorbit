import React from 'react';
import { createOrb, Orb, OrbDef } from 'reorbit';
import { useOrb } from 'react-reorbit';

export interface FractalOrb extends Orb {
  value: number,
  increment: (value: number) => number,
  decrement: (value: number) => number,
  children: FractalOrb[],
}

export const FractalOrbDef: OrbDef<FractalOrb> = {
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
  const { value, increment, decrement, children } = orb;
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
