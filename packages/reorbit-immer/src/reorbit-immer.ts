import { Orb, OrbDef, Extendables } from "reorbit";
import produce from "immer";

export function immer({ augmenters }: Extendables): Extendables {
  return {
    augmenters: {
      static: augmenters?.static!,
      state: (orb: Orb, orbDef: OrbDef<any>) => {
        augmenters?.state(orb, orbDef);
        const state = orbDef.state || {};
        Object.keys(state).forEach(stateKey => {
          const transitions = state[stateKey].transitions || {};
          Object.keys(transitions).forEach(transitionKey => {
            const transitionDefinition = transitions[transitionKey];
            const curOrb = orb as any;
            curOrb[transitionKey] = (...args: any[]) => {
              return produce(curOrb[stateKey], (draftState: any) => {
                transitionDefinition(draftState, ...args);
              });
            };
          });
        });
      },
      dynamic: augmenters?.dynamic!,
    },
  };
}
