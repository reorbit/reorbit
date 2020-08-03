import { Orb, deserialize, callOrbSubscribers, Meta, OrbDef, Extendables } from "@reorbit/core";

declare var window: any;

const withDevTools = (
  process.env.NODE_ENV === 'development' &&
  typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__
)

const PATH_SEPARATOR = '.';

let id = 0;

interface ReduxDevtoolsMeta extends Meta {
  devTools: any;
  id: number;
}

export interface ReduxDevtoolsOrb extends Orb {
  meta: ReduxDevtoolsMeta,
}

const orbName = (orb: ReduxDevtoolsOrb) => {
  return `Orb: ${orb.meta.path.length > 0 ? orb.meta.path[0] : id}`;
}

function onTransition(orb: Orb, transitionKey: string, args: any[]) {
  if (!withDevTools) return;
  const path = orb.meta.path.concat(transitionKey).join(PATH_SEPARATOR);
  const rootOrb = (orb.root! as ReduxDevtoolsOrb);
  rootOrb.meta.devTools.send({
    type: path,
    args,
  }, orb.root!.meta.immutableState, null, orbName(rootOrb));
}

export function reduxDevtools({ augmenters, destroyOrb } : Extendables) {
  return {
    augmenters: {
      static: augmenters?.static,
      state: (orb: Orb, orbDef: OrbDef<any>) => {
        const state = orbDef.state || {};
        augmenters?.state(orb, orbDef);
        Object.keys(state).forEach(stateKey => {
          const transitions = state[stateKey].transitions || {};
          Object.keys(transitions).forEach(transitionKey => {
            const newOrb = orb as any;
            const originalStateTransition = newOrb[transitionKey];

            newOrb[transitionKey] = (...args: any[]) => {
              originalStateTransition(...args)
              onTransition(orb, transitionKey, args);
            }
          });
        });
      },
      dynamic: (orb: ReduxDevtoolsOrb, orbDef: OrbDef<any>) => {
        augmenters?.dynamic(orb, orbDef);
        if (!withDevTools) return;
        if (orb.parent || orb.meta.devTools) return;
        const { meta } = orb;
        meta.id = id;
        id += 1;
        meta.devTools = window.__REDUX_DEVTOOLS_EXTENSION__.connect({ name: orbName(orb) });
        const { devTools } = meta;
        devTools.send({
          type: 'INITIAL_STATE'
        }, meta.immutableState, {}, orbName(orb));
        devTools.subscribe((message: any) => {
          if (message.type !== 'DISPATCH') return;
          switch (message.payload.type) {
            case 'RESET':
              devTools.init(meta.initialState);
              deserialize(orb, meta.initialState);
              callOrbSubscribers(orb);
              return;
            case 'ROLLBACK':
              devTools.init(JSON.parse(message.state));
              deserialize(orb, JSON.parse(message.state));
              callOrbSubscribers(orb);
              return;
            case 'COMMIT':
              devTools.init(meta.immutableState);
              return;
            case 'JUMP_TO_STATE':
            case 'JUMP_TO_ACTION':
              deserialize(orb, JSON.parse(message.state));
              callOrbSubscribers(orb);
              return;
            case 'TOGGLE_ACTION':
              console.warn('TOGGLE_ACTION (skip) is not supported');
              return;
            case 'IMPORT_STATE':
              const { nextLiftedState } = message.payload;
              const { computedStates } = nextLiftedState;
              console.log(computedStates[computedStates.length - 1].state)
              deserialize(orb, computedStates[computedStates.length - 1].state);
              callOrbSubscribers(orb);
              devTools.send(null, nextLiftedState);
              return;
          }
        })
      },
    },
    destroyOrb(orb: Orb) {
      destroyOrb && destroyOrb(orb);
      if (!withDevTools) return;
      const rootOrb = (orb.root! as ReduxDevtoolsOrb);
      if (orb.parent) return;
      rootOrb.meta.devTools.disconnect();
    },
  };
}
