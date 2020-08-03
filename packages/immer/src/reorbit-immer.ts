import { Orb, OrbDef, Extendables } from "@reorbit/core";
import produce from "immer";

export function immer({ augmenters }: Extendables): Extendables {
  return {
    augmenters: {
      static: augmenters?.static!,
      state: (orb: Orb, orbDef: OrbDef<any>) => {
        const state = orbDef.state || {};
        Object.keys(state).forEach(stateKey => {
          const transitions = state[stateKey].transitions || {};
          Object.keys(transitions).forEach(transitionKey => {
            const transitionDefinition = transitions[transitionKey];
            transitions[transitionKey] = (state, ...args: any[]) => {
              if (typeof state === 'object' && state !== null) {
                return produce(state, (draftState: any) => {
                  transitionDefinition(draftState, ...args);
                });
              } else {
                return transitionDefinition(state, ...args);
              }
            };
          });
        });
        augmenters?.state(orb, orbDef);
      },
      dynamic: augmenters?.dynamic!,
    },
  };
}
