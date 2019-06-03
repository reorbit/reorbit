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
  children: Set<Orb>,
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
  for (let stateKeyIndex = 0; stateKeyIndex < stateKeys.length; stateKeyIndex += 1) {
    const stateKey = stateKeys[stateKeyIndex];
    orb.state[stateKey] = {
      orb: orb,
      subscriptions: new Set(),
    };
    const newOrb = orb as any;
    newOrb[stateKey] = initialState && initialState[stateKey] ? initialState[stateKey] : state[stateKey].default;
    const transitions = state[stateKey].transitions || {};
    const stateTransistionKeys = keys(transitions);
    for (let stateTransitionKeyIndex = 0; stateTransitionKeyIndex < stateTransistionKeys.length; stateTransitionKeyIndex += 1) {
      const stateTransitionKey = stateTransistionKeys[stateTransitionKeyIndex];
      orb.state[stateKey][stateTransitionKey] = (...args: any[]) => {
        newOrb[stateKey] = transitions[stateTransitionKey](newOrb[stateKey], ...args);
        updateDependantValues(orb.state, stateKey);
        callDependantSubscribers(orb.state, stateKey);
        callOrbSubscribers(orb);
      };
    }
  }
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

function deleteStaleChildren(orb: Orb, key: string, children: Set<Orb>) {
  let a = Array.from(orb.dynamic[key].children);
  let b = children;
  let difference = new Set(
      [...a].filter(x => !b.has(x)));
  difference.forEach(orb => {
    destroyOrb(orb);
  });
  orb.dynamic[key].children = children;
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
  if (combined && combined.data && combined.children) {
    deleteStaleChildren(orb, key, combined.children);
    newOrb[key] = combined.data;
  } else {
    newOrb[key] = combined;
  }
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
      children: new Set(),
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

function replacer(augmenterNames: string[]) {
  const restrictedKeys = ['parent', 'root', 'subscriptions', 'meta', 'state', 'dynamic'].concat(augmenterNames);
  return (key: string, value: any) => {
    return restrictedKeys.includes(key) ? undefined : value;
  }
}

export function serialize(orb: Orb) {
  const augmenters = orb && orb.root && orb.root.meta && orb.root.meta.options && orb.root.meta.options.augmenters || [];
  const augmenterNames = augmenters.map(augmenter => augmenter.name);
  return JSON.stringify(orb, replacer(augmenterNames));
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