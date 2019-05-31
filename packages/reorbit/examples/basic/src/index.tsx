import { Orb, OrbDef, createOrb, subscribe } from "reorbit";


export interface CounterOrb extends Orb {
  value: number;
  increment: (value: number) => void;
}

export const CounterOrbDef: OrbDef = {
  state: {
    value: {
      default: 0,
      transitions: {
        increment(state: number, value: number): number {
          return state + value;
        },
      }
    }
  },
}

const counterOrb = createOrb<CounterOrb>(CounterOrbDef);

subscribe(counterOrb, () => {
  console.log(`Value: ${counterOrb.value}`);
});

counterOrb.state.value.increment(1);
// Value: 1