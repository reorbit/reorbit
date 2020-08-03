import { Orb, OrbDef, createOrb, subscribe } from "reorbit";

export interface CounterOrb extends Orb {
  value: number;
  increment: (value: number) => number;
}

export const CounterOrbDef: OrbDef<CounterOrb> = {
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

counterOrb.increment(1);
// Value: 1
