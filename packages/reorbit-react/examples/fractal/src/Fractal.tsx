import React from 'react';
import { createOrb, Orb, OrbDef, State } from 'reorbit';
import { useOrb } from 'reorbit-react';

const { keys } = Object;

interface FractalOrbStore extends State {
  increment: (value: number) => number,
  decrement: (value: number) => number,
}

export interface FractalOrb extends Orb {
  value: number,
  state: {
    value: FractalOrbStore,
  },
  children: {
    [key: string]: FractalOrb,
  },
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
      combiner: (orb: FractalOrb) => {
        const map: { [key: number]: FractalOrb } = {};
        for (let count = 0; count < orb.value; count += 1) {
          map[count] = orb.children[count] ?
            orb.children[count] :
            createOrb<FractalOrb>(FractalOrbDef, orb, String(count));
        }
        return map;
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
        {keys(children).map((key) => {
          return <Fractal key={key} orb={children[key]} />;
        })}
      </div>
    </div>
  );
};