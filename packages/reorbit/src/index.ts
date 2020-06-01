const { keys, values } = Object;

export interface OrbDef {
  name?: String;
  state?: {
    [key: string]: {
      default: any,
      transitions?: {
        [key: string]: (state: any, ...args: any[]) => any,
      },
    },
  },
  static?: {
    [key: string]: any,
  },
  dynamic?: {
    [key: string]: {
      dependencies?: Array<(orb: any) => State>,
      combiner: (...args: any[]) => any,
    },
  },
}

interface Subscription {
  key: string,
  orb: Orb,
  state: State,
}

export interface Subscribable {
  subscriptions: Set<Subscription>,
  orb: Orb,
}

export interface State extends Subscribable {
  [key: string]: any,
}

interface Dynamic extends Subscribable {
  dependencies: Array<(orb: any) => Subscribable>,
  combiner: (...args: any[]) => any,
  depSubscriptions: Set<Subscription>,
  children: Map<string, Orb>,
  nextChildren: Map<string, Orb>,
}

interface Augmenter {
  name: string,
  onCreate: (orb: Orb, orbDef: OrbDef) => void,
  onDestory: (orb: Orb) => void,
  postCreate: (orb: Orb) => void,
}

interface Options {
  state?: any,
  augmenters?: Array<Augmenter>,
}

export interface Meta {
  original: OrbDef,
  path: string[],
  options?: Options,
  processingKey?: string,
  initialState?: any,
  immutableState?: any,
}

interface StateMap {
  [key: string]: State,
}

interface DynamicMap {
  [key: string]: Dynamic,
}

export interface Orb {
  subscriptions: Set<() => void>,
  root?: Orb,
  parent?: Orb,
  meta: Meta,
  state: StateMap,
  dynamic: DynamicMap,
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

function bindStatic(orb: Orb, orbDef: OrbDef) {
  const staticDef = orbDef.static || {};
  const fnKeys = keys(staticDef);
  for (let functionIndex = 0; functionIndex < fnKeys.length; functionIndex += 1) {
    const fnKey = fnKeys[functionIndex];
    const newOrb = orb as any;
    newOrb[fnKey] = staticDef[fnKey];
  }
}

function bindState(orb: Orb, orbDef: OrbDef, initialState: any) {
  const state = orbDef.state || {};
  const stateKeys = keys(state);
  const newState: { [key: string]: any } = {};
  for (let stateKeyIndex = 0; stateKeyIndex < stateKeys.length; stateKeyIndex += 1) {
    const stateKey = stateKeys[stateKeyIndex];
    orb.state[stateKey] = {
      orb: orb,
      subscriptions: new Set(),
    };
    const newOrb = orb as any;
    newOrb[stateKey] = initialState && initialState[stateKey] ? initialState[stateKey] : state[stateKey].default;
    newState[stateKey] = newOrb[stateKey];
    const transitions = state[stateKey].transitions || {};
    const stateTransistionKeys = keys(transitions);
    for (let stateTransitionKeyIndex = 0; stateTransitionKeyIndex < stateTransistionKeys.length; stateTransitionKeyIndex += 1) {
      const stateTransitionKey = stateTransistionKeys[stateTransitionKeyIndex];
      orb.state[stateKey][stateTransitionKey] = (...args: any[]) => {
        newOrb[stateKey] = transitions[stateTransitionKey](newOrb[stateKey], ...args);
        const path = orb.meta.path.concat(stateKey);
        orb.root!.meta.immutableState = generateNextState(orb.root!.meta.immutableState || {}, path, newOrb[stateKey]);
        updateDependantValues(orb.state, stateKey);
        callDependantSubscribers(orb.state, stateKey);
        callOrbSubscribers(orb);
      };
    }
  }
  orb.root!.meta.immutableState = generateNextState(orb.root!.meta.immutableState || {}, orb.meta.path, newState);
}

export function updateDependantValues(subscribable: DynamicMap | StateMap, key: string) {
  subscribable[key].subscriptions.forEach((dependencySubscription: Subscription) => {
    updateDependantValue(dependencySubscription.orb, dependencySubscription.key);
    updateDependantValues(dependencySubscription.orb.dynamic, dependencySubscription.key);
  });
}

export function callDependantSubscribers(subscribable: DynamicMap | StateMap, key: string) {
  subscribable[key].subscriptions.forEach((dependencySubscription: Subscription) => {
    callOrbSubscribers(dependencySubscription.orb);
    callDependantSubscribers(dependencySubscription.orb.dynamic, dependencySubscription.key);
  });
}

function deleteStaleChildren(orb: Orb) {
  const key = orb.meta.processingKey!;
  const prevChildren = orb.dynamic[key].children;
  const prevChildrenKeys = Array.from(prevChildren.keys());
  const curChildren = orb.dynamic[key].nextChildren;
  const curChildrenKeysSet = new Set(curChildren.keys());
  const difference = new Set([...prevChildrenKeys].filter(x => !curChildrenKeysSet.has(x)));
  difference.forEach(key => {
    destroyOrb(prevChildren.get(key)!);
  });
  orb.dynamic[key].children = curChildren;
  orb.dynamic[key].nextChildren = new Map();
}

export function updateDependantValue(orb: Orb, key: string) {
  orb.meta.processingKey = key;
  const dynamicDef = orb.dynamic[key] || { dependencies: null };
  const combiner = dynamicDef.combiner;
  const selectors = dynamicDef.dependencies || [];
  const dependencyStates = selectors.map(dependency => {
    return dependency(orb);
  });
  const depdencyOrbs = dependencyStates.map(state => {
    return state.orb;
  });
  const combined = combiner && combiner(...depdencyOrbs);
  const newOrb = orb as any;
  deleteStaleChildren(orb);
  newOrb[key] = combined;
  orb.meta.processingKey = undefined;
}

export function callOrbSubscribers(orb: Orb) {
  orb.subscriptions.forEach((orbSubscription) => {
    orbSubscription();
  });
}

function bindDynamic(orb: Orb, orbDef: OrbDef) {
  const dynamic = orbDef.dynamic || {};
  const dynamicKeys = keys(dynamic);
  for (let dynamicKeyIndex = 0; dynamicKeyIndex < dynamicKeys.length; dynamicKeyIndex += 1) {
    const dynamicKey = dynamicKeys[dynamicKeyIndex];
    const dynamicDef = dynamic[dynamicKey];
    const selectors = [...(dynamicDef.dependencies || [])];
    orb.dynamic[dynamicKey] = {
      orb: orb,
      subscriptions: new Set(),
      dependencies: selectors,
      combiner: dynamicDef.combiner,
      depSubscriptions: new Set(),
      children: new Map(),
      nextChildren: new Map(),
    };
    const dependencies = selectors;
    const dependencySubscribables = dependencies.map(dependency => {
      return dependency(orb);
    });
    for (let dependencyIndex = 0; dependencyIndex < dependencySubscribables.length; dependencyIndex += 1) {
      const dependencySubscribable: Subscribable = dependencySubscribables[dependencyIndex];
      subscribeDependency(orb, dynamicKey, dependencySubscribable)
    }
    updateDependantValue(orb, dynamicKey);
  }
}

export function subscribeDependency(orb: Orb, key: string, dependencyState: State) {
  const dependencySubscription: Subscription = {
    key,
    orb: orb,
    state: dependencyState,
  };
  dependencyState.subscriptions.add(dependencySubscription);
  orb.dynamic[key].depSubscriptions.add(dependencySubscription);
}

function resolve(state: any, path: string[]) {
  return path.reduce((acc, fragment) => {
    return acc[fragment];
  }, state);
};

export function createOrb<T extends Orb>(orbDef: OrbDef, parent?: Orb, key?: string, options?: Options): T {
  if (parent && parent.meta.processingKey && key) {
    const previousChildren = parent.dynamic[parent.meta.processingKey].children;
    if (previousChildren.has(key)) {
      const currentChild = previousChildren.get(key);
      parent.dynamic[parent.meta.processingKey].nextChildren.set(key, currentChild as T);
      return currentChild as T;
    }
  }
  const orb: Orb = {
    parent,
    subscriptions: new Set(),
    state: {},
    dynamic: {},
    meta: {
      path: [],
      original: orbDef,
      options: options || {},
    }
  };
  orb.root = parent && parent.root || orb,
  orb.meta.path = parent && key ? parent.meta.path.concat([parent.meta.processingKey || '', key]) : [ ];
  orb.meta.initialState = options && options.state || orb.root.meta.initialState;
  deserialize(orb, orb.meta.initialState);
  parent && parent.meta.processingKey && key && parent.dynamic[parent!.meta.processingKey!].nextChildren.set(key, orb as T);
  return orb as T;
};

export function destroyOrb(orb: Orb) {
  orb.subscriptions.clear();
  values(orb.state).forEach((state) => {
    state.subscriptions.clear();
  });
  keys(orb.dynamic)
    .map((key) => orb.dynamic[key].children)
    .forEach((children) => {
      children.forEach((child) => {
        destroyOrb(child);
      });
    });
  orb.root!.meta.immutableState = generateNextState(orb.root!.meta.immutableState || {}, orb.meta.path);
  const augmenters = orb.root && orb.root.meta && orb.root.meta.options && orb.root.meta.options.augmenters;
  augmenters && augmenters.forEach(augmenter => {
    augmenter.onDestory(orb);
  });
  keys(orb.dynamic)
    .map((key) => orb.dynamic[key].depSubscriptions)
    .forEach((depSubscription) => {
      depSubscription.forEach((subscription) => {
        subscription.state.subscriptions.delete(subscription);
      });
    });
};

export function serialize(orb: Orb) {
  return JSON.stringify(orb.root!.meta.immutableState);
}

export function deserialize(orb: Orb, state: any) {
  const orbDef = orb.meta.original;
  orb.meta.initialState = state;
  bindStatic(orb, orbDef);
  bindState(orb, orbDef, orb.meta.initialState && resolve(orb.meta.initialState, orb.meta.path));
  const augmenters = orb.root && orb.root.meta && orb.root.meta.options && orb.root.meta.options.augmenters;
  augmenters && augmenters.forEach(augmenter => {
    augmenter.onCreate(orb, orbDef);
  });
  bindDynamic(orb, orbDef);
  augmenters && augmenters.forEach(augmenter => {
    augmenter.postCreate(orb);
  });
  orb.meta.initialState = undefined;
}

export function subscribe(orb: Orb, update: () => void) {
  orb.subscriptions.add(update);
  const unsubscribe = () => {
    orb.subscriptions.delete(update);
  }
  return unsubscribe;
};