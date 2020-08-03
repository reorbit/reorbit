import React from 'react';
import { createOrb } from 'reorbit';
import { useOrb } from 'react-reorbit';
import { reduxDevtools } from 'reorbit-redux-devtools';

const FractalOrbDef = {
  state: {
    value: {
      default: 0,
      transitions: {
        increment(state, value) {
          return state + value;
        },
        decrement(state, value) {
          return state - value;
        },
      },
    },
  },
  dynamic: {
    children: {
      dependencies: [
        (orb) => orb.state.value,
      ],
      derive(orb) {
        const orbs = [];
        for (let count = 0; count < orb.value; count += 1) {
          orbs.push(createOrb(FractalOrbDef, orb, String(count)));
        }
        return orbs;
      },
    },
  },
};

const Fractal = ({ orb }) => {
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

const orb = createOrb(FractalOrbDef, undefined, 'Fractal', {
  extensions: [
    reduxDevtools,
  ]
});

export const FractalRoot = () => {
  useOrb(orb);
  return <Fractal orb={orb} />
}
