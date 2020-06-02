import { Orb, OrbDef, updateDependantValues, callDependantSubscribers, callOrbSubscribers, Subscribable, Meta, createOrb } from "reorbit";
import { Store, Unsubscribe, Action, createStore } from "redux";

const { keys } = Object;

interface ReduxMeta extends Meta {
  original: ReduxOrbDef,
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

export interface ReduxOrbDef extends OrbDef {
  redux: {
    [key: string]: {
      default: any,
      transitions?: {
        [key: string]: (state: any, ...args: any[]) => any,
      },
    },
  },
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

export const reducer = (orbDef: ReduxOrbDef) => {
  const orb: ReduxOrb = createOrb(orbDef, undefined, undefined, {
    augmenters: [
      redux({
        store: createStore(() => {}),
      }),
    ],
  });
  return (state: any = orb.meta.reduxState, action: ReduxAction) => {
    const { reorbit } = action;
    if (reorbit === true) {
      return action.state;
    }
    return state;
  };
};

function getRelevantState(state: any, path: string[]) {
  return path.reduce((acc, fragment) => {
    return acc && acc[fragment];
  }, state);
}

function bindRedux(orb: ReduxOrb, orbDef: ReduxOrbDef, store: Store, reducerKey?: string) {
  const redux = orbDef.redux || {};
  const reduxKeys = keys(redux);
  const initialOrbState: any = {};
  reduxKeys.forEach(reduxKey => {
    const reduxDef = redux[reduxKey];
    orb.redux[reduxKey] = {
      orb: orb,
      subscriptions: new Set(),
    };

    const newOrb = orb as any;
    const initial = getRelevantState(orb.root!.meta.initialReduxState || {}, orb.meta.path.concat(reduxKey));
    newOrb[reduxKey] = initial || reduxDef.default;
    const transitions = reduxDef.transitions || {};
    initialOrbState[reduxKey] = redux[reduxKey].default;

    let process = false;
    keys(transitions).map((transitionKey) => {
      orb.redux[reduxKey][transitionKey] = (...args: any[]) => {
        const type = [reducerKey].concat(orb.meta.path, reduxKey, transitionKey).join('/');
        const storeState = store.getState();
        const reorbitState = reducerKey ? storeState[reducerKey] : storeState;
        const reduxKeyState = getRelevantState(reorbitState, orb.meta.path)[reduxKey];
        const newValue = orb.meta.original.redux[reduxKey].transitions![transitionKey](reduxKeyState, ...args);
        if (newValue !== undefined && newValue !== reduxKeyState) {
          orb.root!.meta.reduxState = generateNextState(reorbitState, orb.meta.path.concat(reduxKey), newValue);
          newOrb[reduxKey] = newValue;
          updateDependantValues(orb.redux, reduxKey);
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
      const reorbitState = reducerKey ? storeState[reducerKey] : storeState;
      const orbState = getRelevantState(reorbitState, orb.meta.path);
      if (process || (orbState && orbState[reduxKey] !== newOrb[reduxKey])) {
        newOrb[reduxKey] = orbState[reduxKey];
        updateDependantValues(orb.redux, reduxKey);
        callDependantSubscribers(orb.redux, reduxKey);
        callOrbSubscribers(orb);
        process = false;
      }
    });
  })
  orb.root!.meta.reduxState = generateNextState(orb.root!.meta.reduxState || {}, orb.meta.path, initialOrbState)
}

function onCreate(store: Store, reducerKey: string) {
  return (orb: Orb, orbDef: OrbDef) => {
    const reduxOrb = orb as ReduxOrb;
    reduxOrb.redux = {};
    if (!reduxOrb.root.meta.reduxInitialized) {
      reduxOrb.root.meta.reduxInitialized = true;
      reduxOrb.root.meta.postCreateStack = [];
      const storeState = store.getState();
      reduxOrb.root.meta.initialReduxState = reducerKey ? storeState[reducerKey] : storeState;
    }
    reduxOrb.root.meta.postCreateStack!.push(true);
    bindRedux(reduxOrb, orbDef as ReduxOrbDef, store, reducerKey);
  }
}

function postCreate() {
  return (orb: Orb) => {
    const reduxOrb = orb as ReduxOrb;
    reduxOrb.root.meta.postCreateStack!.pop();
    if (reduxOrb.root.meta.postCreateStack!.length === 0 && reduxOrb.root.meta.initialReduxState) {
      reduxOrb.root.meta.initialReduxState = undefined;
    }
  };
}

function destroy(orb: ReduxOrb) {
  keys(orb.redux).forEach((reduxKey) => {
    const redux = orb.redux[reduxKey];
    redux.subscriptions.clear();
    redux.storeSubscription!();
  });
  orb.root!.meta.reduxState = generateNextState(orb.root!.meta.reduxState, orb.meta.path);
}

function onDestory() {
  return (orb: Orb) => {
    destroy(orb as ReduxOrb);
  }
}

export default function redux(options: any) {
  return {
    name: 'redux',
    onCreate: onCreate(options.store, options.key),
    postCreate: postCreate(),
    onDestory: onDestory(),
  }
}