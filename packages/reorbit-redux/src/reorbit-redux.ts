import { Orb, OrbDef, updateDependantValues, callDependantSubscribers,
  callOrbSubscribers, Subscribable, Meta, Subscription, Extendables, createOrb } from "reorbit";
import { Store, Unsubscribe, Action, createStore } from "redux";
const { keys } = Object;

const PATH_SEPARATOR = '.';

export interface ReduxOrbDef<T extends Orb> extends OrbDef<T> {
  redux: {
    [key: string]: {
      default: any,
      transitions?: {
        [key: string]: (state: any, ...args: any[]) => any,
      },
    },
  },
}

interface ReduxMeta extends Meta {
  original: ReduxOrbDef<any>,
  reduxState?: any,
  reduxInitialized?: boolean,
  initialReduxState?: any,
  postCreateStack?: boolean[],
}

export interface Redux extends Subscribable {
  storeSubscription?: Unsubscribe,
  [key: string]: any,
}

interface ReduxMap {
  [key: string]: Redux,
}

export interface ReduxOrb extends Orb {
  root: ReduxOrb,
  parent: ReduxOrb,
  redux: ReduxMap,
  meta: ReduxMeta,
}

interface ReduxAction extends Action {
  reorbit: boolean,
  state: any,
}

export const reducer = (orbDef: ReduxOrbDef<any>, key: string) => {
  const orb: ReduxOrb = createOrb(orbDef, undefined, key, {
    extensions: [
      redux(createStore(() => {}))
    ]
  });
  return (state: any = orb.meta.reduxState, action: ReduxAction) => {
    const { reorbit } = action;
    if (reorbit === true) {
      return action.state;
    }
    return state;
  };
};

const objectWithoutKey = (object: any, key: string) => {
  const {[key]: deletedKey, ...otherKeys} = object;
  return otherKeys;
}

function generateNextState(state: any, path: string[], newValue?: any): any {
  if (path.length === 0) {
    return newValue;
  } else if (path.length === 1) {
    const node = path[0];
    if (newValue === undefined) {
      return objectWithoutKey(state, node);
    }
    return {
      ...state,
      [node]: newValue,
    };
  } else {
    const [node, ...restPath] = path;
    const nextState = generateNextState(state[node] || {}, restPath, newValue);
    if (keys(nextState).length === 0) {
      return objectWithoutKey(state, node);
    }
    return {
      ...state,
      [node]: nextState,
    };
  }
}

function getRelevantState(state: any, path: string[]) {
  return path.reduce((acc, fragment) => {
    return acc && acc[fragment];
  }, state);
}

function resolve(state: any, path: string[]) {
  return path.reduce((acc, fragment) => {
    return acc && acc[fragment];
  }, state);
};

function bindRedux(orb: ReduxOrb, orbDef: OrbDef<any>, store: Store) {
  const initialState = orb.meta.initialState && resolve(orb.meta.initialState, orb.meta.path);
  const reudxOrbDef = orbDef as ReduxOrbDef<any>;
  const redux = reudxOrbDef.redux || {};
  const reduxKeys = keys(redux);
  const initialOrbState: any = {};
  reduxKeys.forEach(reduxKey => {
    const reduxDef = redux[reduxKey];
    orb.redux[reduxKey] = {
      orb: orb,
      subscriptions: new Set(),
    };

    const newOrb = orb as any;
    newOrb[reduxKey] = initialState || reduxDef.default;

    newOrb[reduxKey] = initialState && initialState[reduxKey] ?
      initialState[reduxKey] : redux[reduxKey].default;
    const transitions = reduxDef.transitions || {};
    initialOrbState[reduxKey] = redux[reduxKey].default;

    let process = false;
    keys(transitions).map((transitionKey) => {
      newOrb[transitionKey] = (...args: any[]) => {
        const type = orb.meta.path.concat(reduxKey, transitionKey).join(PATH_SEPARATOR);
        const storeState = store.getState();
        const reorbitState = storeState;
        const reduxKeyState = getRelevantState(reorbitState, orb.meta.path)[reduxKey];
        const newValue = orb.meta.original.redux[reduxKey].transitions![transitionKey](reduxKeyState, ...args);
        if (newValue !== undefined && newValue !== reduxKeyState) {
          orb.root!.meta.reduxState = generateNextState(reorbitState, orb.meta.path.concat(reduxKey), newValue);
          newOrb[reduxKey] = newValue;
          const updatedSubscriptions = new Set<Subscription>();
          updateDependantValues(orb.redux, reduxKey, updatedSubscriptions);
          process = true;
          store.dispatch({
            type,
            reorbit: true,
            state: orb.root!.meta.reduxState,
          });
        }
      };
    });
    orb.redux[reduxKey].storeSubscription = store.subscribe(() => {
      const storeState = store.getState();
      const reorbitState = storeState;
      const orbState = getRelevantState(reorbitState, orb.meta.path);
      if (process || (orbState && orbState[reduxKey] !== newOrb[reduxKey])) {
        newOrb[reduxKey] = orbState[reduxKey];
        orb.root.meta.initialState = storeState;
        const updatedSubscriptions = new Set<Subscription>();
        updateDependantValues(orb.redux, reduxKey, updatedSubscriptions);
        if (updatedSubscriptions.size !== 0) {
          callDependantSubscribers(orb.redux, reduxKey, updatedSubscriptions);
        }
        callOrbSubscribers(orb);
        process = false;
      }
    });
  })
  orb.root!.meta.reduxState = generateNextState(orb.root!.meta.reduxState || {}, orb.meta.path, initialOrbState)
}

export function redux(store: Store): (extensions: Extendables) => Extendables {
  function onTransition(orb: Orb, stateKey: string, transitionKey: string, args: any[], newValue: any) {
    const path = orb.meta.path.concat(stateKey, transitionKey);
    const type = path.join(PATH_SEPARATOR);
    store.dispatch({
      type,
      path,
      args,
      newValue,
    });
  }
  return (extensions : Extendables) => {
    const  { augmenters, destroyOrb } = extensions;
    const ext: Extendables = {
      augmenters: {
        static: augmenters?.static!,
        state: (orb: Orb, orbDef: OrbDef<any>) => {
          const state = orbDef.state || {};
          Object.keys(state).forEach(stateKey => {
            const transitions = state[stateKey].transitions || {};
            Object.keys(transitions).forEach(transitionKey => {
              const originalTransition = transitions[transitionKey];
              transitions[transitionKey] = (...args) => {
                const newValue = originalTransition(...args);
                onTransition(orb, stateKey, transitionKey, args, newValue);
                return newValue;
              }
            });
          });
          augmenters?.state(orb, orbDef);
        },
        dynamic: (orb: Orb, orbDef: OrbDef<any>) => {
          const reduxOrb = orb as ReduxOrb;
          reduxOrb.redux = {};
          if (!reduxOrb.root.meta.reduxInitialized) {
            reduxOrb.root.meta.reduxInitialized = true;
            reduxOrb.root.meta.postCreateStack = [];
            const storeState = store.getState();
            reduxOrb.root.meta.initialReduxState = storeState;
          }
          reduxOrb.root.meta.postCreateStack!.push(true);
          bindRedux(reduxOrb, orbDef, store);
          augmenters?.dynamic(orb, orbDef);
          reduxOrb.root.meta.postCreateStack!.pop();
          if (reduxOrb.root.meta.postCreateStack!.length === 0 && reduxOrb.root.meta.initialReduxState) {
            reduxOrb.root.meta.initialReduxState = undefined;
          }
        },
      },
      destroyOrb(orb: Orb) {
        destroyOrb && destroyOrb(orb);
        const reduxOrb = orb as ReduxOrb;
        keys(reduxOrb.redux).forEach((reduxKey) => {
          const redux = reduxOrb.redux[reduxKey];
          redux.subscriptions.clear();
          redux.storeSubscription!();
        });
        reduxOrb.root!.meta.reduxState = generateNextState(reduxOrb.root!.meta.reduxState, orb.meta.path);
      },
    };
    return ext;
  };
}
