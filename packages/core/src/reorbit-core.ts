const { keys, values } = Object;

const SUBSCRIPTIONS = Symbol('reorbit/subscriptions');

export interface OrbDef<T extends Orb> {
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
      dependencies?: Array<(orb: T) => Subscribable>,
      derive: (orb: T, ...args: Array<any>) => any,
    },
  },
}

export interface Subscription {
  key: string,
  orb: Orb,
  subscribable: Subscribable,
}

export interface Subscribable {
  subscriptions: Set<Subscription>,
  orb: Orb,
}

export interface Dynamic extends Subscribable {
  dependencies: Array<(orb: Orb) => Subscribable>,
  derive: (orb: Orb, ...args: Orb[]) => any,
  depSubscriptions: Set<Subscription>,
  children: Map<string, Orb>,
  nextChildren: Map<string, Orb>,
}

export interface Augmenters {
  [key: string]: (orb: Orb, orbDef: OrbDef<any>) => void,
}

export interface Extendables {
  augmenters?: Augmenters,
  destroyOrb?: (orb: Orb) => void,
}

export interface Options {
  state?: any,
  extensions?: Array<(extensions: Extendables) => Extendables>,
}

export interface Meta {
  original: OrbDef<any>,
  path: string[],
  options?: Options,
  extendables?: Extendables,
  processingKey?: string,
  initialState?: any,
  immutableState?: any,
  nonSerializableCache?: Map<string, Map<Symbol, any>>,
}

export interface StateMap {
  [key: string]: Subscribable,
}

export interface DynamicMap {
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

function updateImmudatebleState(orb: Orb, path: string[], newValue?: any) {
  const { meta } = orb.root!;
  meta.immutableState = generateNextState(meta.immutableState || {}, path, newValue);
}

function bindStatic(orb: Orb, orbDef: OrbDef<any>) {
  const staticDef = orbDef.static || {};
  keys(staticDef).forEach(staticKey => {
    const newOrb = orb as any;
    newOrb[staticKey] = staticDef[staticKey];
  });
}

function bindState(orb: Orb, orbDef: OrbDef<any>) {
  const initialState = orb.meta.initialState && resolve(orb.meta.initialState, orb.meta.path);
  const state = orbDef.state || {};
  const newState: { [key: string]: any } = {};
  keys(state).forEach(stateKey => {
    orb.state[stateKey] = {
      orb: orb,
      subscriptions: new Set(),
    };
    const newOrb = orb as any;
    newOrb[stateKey] = initialState && initialState[stateKey] ?
      initialState[stateKey] : state[stateKey].default;
    newState[stateKey] = newOrb[stateKey];
    const transitions = state[stateKey].transitions || {};
    keys(transitions).forEach(transitionKey => {
      const transition = transitions[transitionKey];
      newOrb[transitionKey] = (...args: any[]) => {
        const prevState = newOrb[stateKey];
        newOrb[stateKey] = transition(newOrb[stateKey], ...args);
        if (newOrb[stateKey] === prevState) return;
        const path = orb.meta.path.concat(stateKey);
        updateImmudatebleState(orb, path, newOrb[stateKey]);
        const updatedSubscriptions = new Set<Subscription>();
        updateDependantValues(orb.state, stateKey, updatedSubscriptions);
        if (updatedSubscriptions.size !== 0) {
          callDependantSubscribers(orb.state, stateKey, updatedSubscriptions);
        }
        callOrbSubscribers(orb);
      };
    });
  });
  updateImmudatebleState(orb, orb.meta.path, newState)
}

export function updateDependantValues(
  subscribable: DynamicMap | StateMap,
  key: string,
  updatedSubscriptions: Set<Subscription>,
) {
  subscribable[key].subscriptions.forEach((depSub: Subscription) => {
    const valUpdated = updateDependantValue(depSub.orb, depSub.key);
    if (!valUpdated) return;
    updatedSubscriptions.add(depSub);
    updateDependantValues(depSub.orb.dynamic, depSub.key, updatedSubscriptions);
  });
}

export function callDependantSubscribers(
  subscribable: DynamicMap | StateMap,
  key: string,
  updatedSubscriptions: Set<Subscription>,
) {
  subscribable[key].subscriptions.forEach((depSub: Subscription) => {
    if (!updatedSubscriptions.has(depSub)) return;
    callOrbSubscribers(depSub.orb);
    callDependantSubscribers(depSub.orb.dynamic, depSub.key, updatedSubscriptions);
  });
}

function destoryStaleChildren(orb: Orb) {
  const key = orb.meta.processingKey!;
  const prevChildren = orb.dynamic[key].children;
  const prevChildrenKeys = Array.from(prevChildren.keys());
  const curChildren = orb.dynamic[key].nextChildren;
  const curChildrenKeysSet = new Set(curChildren.keys());
  const difference = new Set([...prevChildrenKeys].filter(key => !curChildrenKeysSet.has(key)));
  difference.forEach(key => {
    destroyOrb(prevChildren.get(key)!);
  });
  orb.dynamic[key].children = curChildren;
  orb.dynamic[key].nextChildren = new Map();
}

function updateDependantValue(orb: Orb, key: string): boolean {
  orb.meta.processingKey = key;
  const dynamicDef = orb.dynamic[key] || { dependencies: null };
  const derive = dynamicDef.derive;
  const selectors = dynamicDef.dependencies || [];
  const dependencyStates = selectors.map(dependency => {
    return dependency(orb);
  });
  const depdencyOrbs = dependencyStates.map(state => {
    return state.orb;
  });
  const combined = derive && derive(orb, ...depdencyOrbs);
  const newOrb = orb as any;
  const prevValue = newOrb[key];
  destoryStaleChildren(orb);
  newOrb[key] = combined;
  orb.meta.processingKey = undefined;
  return newOrb[key] !== prevValue;
}

export function callOrbSubscribers(orb: Orb) {
  orb.subscriptions.forEach((orbSubscription) => {
    orbSubscription();
  });
}

function bindDynamic(orb: Orb, orbDef: OrbDef<any>) {
  const dynamic = orbDef.dynamic || {};
  keys(dynamic).forEach(dynamicKey => {
    const dynamicDef = dynamic[dynamicKey];
    const selectors = [...(dynamicDef.dependencies || [])];
    orb.dynamic[dynamicKey] = {
      orb: orb,
      subscriptions: new Set(),
      dependencies: selectors,
      derive: dynamicDef.derive,
      depSubscriptions: new Set(),
      children: new Map(),
      nextChildren: new Map(),
    };
    const dependencies = selectors;
    const dependencySubscribables = dependencies.map(dependency => {
      return dependency(orb);
    });
    dependencySubscribables.forEach(dependencySubscribable => {
      subscribeDependency(orb, dynamicKey, dependencySubscribable);
    });
    updateDependantValue(orb, dynamicKey);
  });
}

function subscribeDependency(orb: Orb, key: string, dependencySub: Subscribable) {
  const dependencySubscription: Subscription = {
    key,
    orb: orb,
    subscribable: dependencySub,
  };
  dependencySub.subscriptions.add(dependencySubscription);
  orb.dynamic[key].depSubscriptions.add(dependencySubscription);
}

function resolve(state: any, path: string[]) {
  return path.reduce((acc, fragment) => {
    return acc && acc[fragment];
  }, state);
};

export function createOrb<T extends Orb>(orbDef: OrbDef<T>, parent?: Orb, key?: string, options?: Options): T {
  const cachedOrb = useCachedOrb<T>(parent, key);
  if (cachedOrb) return cachedOrb;
  const orb: Orb = {
    parent,
    subscriptions: new Set(),
    state: {},
    dynamic: {},
    meta: {
      path: [],
      original: orbDef,
      options: options || {},
      nonSerializableCache: new Map<string, Map<Symbol, any>>()
    },
  };
  orb.root = parent && parent.root || orb;
  orb.meta.path = parent ? parent.meta.path.concat(parent.meta.processingKey!) : [];
  key && orb.meta.path.push(key);
  orb.meta.initialState = options?.state || orb.root.meta.initialState;
  restoreSubscriptions(orb);
  processExtensions(orb, options);
  deserialize(orb, orb.meta.initialState);
  parent && parent.meta.processingKey && key &&
    parent.dynamic[parent!.meta.processingKey].nextChildren.set(key, orb as T);
  return orb as T;
}

function restoreSubscriptions(orb: Orb) {
  const cachedSubscriptionSet = cacheGet(orb, SUBSCRIPTIONS) as Set<() => void>;
  if (cachedSubscriptionSet) {
    cachedSubscriptionSet?.forEach(subscription => {
      orb.subscriptions.add(subscription);
    });
  } else {
    const newSet = new Set<() => void>();
    cacheSet(orb, SUBSCRIPTIONS, newSet);
  }
}

function useCachedOrb<T extends Orb>(parent?: Orb, key?: string): T | undefined {
  if (!(parent && parent.meta.processingKey && key)) return;
  const previousChildren = parent.dynamic[parent.meta.processingKey].children;
  if (!previousChildren.has(key)) return;
  const currentChild = previousChildren.get(key);
  parent.dynamic[parent.meta.processingKey].nextChildren.set(key, currentChild as T);
  return currentChild as T;
}

function processExtensions(orb: Orb, options?: Options) {
  if (orb.root!.meta.extendables) return;
  const augmenters: Augmenters = {
    static: bindStatic,
    state: bindState,
    dynamic: bindDynamic,
  };
  const processedAugmenters = options?.extensions?.reduce((acc, plugin) => {
    const extended = plugin(acc).augmenters;
    return extended ? { augmenters: extended } : acc;
  }, { augmenters: augmenters });
  const destroyOrb: { destroyOrb: (orb: Orb) => void } = { destroyOrb: destroyOrbBase };
  const processedDestroyOrb = options?.extensions?.reduce((acc, plugin) => {
    const extended = plugin(acc).destroyOrb;
    return extended ? { destroyOrb: extended } : acc;
  }, destroyOrb);
  orb.root!.meta.extendables = {
    augmenters: processedAugmenters?.augmenters ? processedAugmenters?.augmenters : augmenters,
    destroyOrb: processedDestroyOrb?.destroyOrb ? processedDestroyOrb?.destroyOrb : destroyOrbBase,
  };
}

function destroyOrbBase(orb: Orb) {
  orb.subscriptions.clear();
  cacheClear(orb);
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
  keys(orb.dynamic)
    .map((key) => orb.dynamic[key].depSubscriptions)
    .forEach((depSubscription) => {
      depSubscription.forEach((subscription) => {
        subscription.subscribable.subscriptions.delete(subscription);
      });
    });
  updateImmudatebleState(orb, orb.meta.path);
}

export function destroyOrb(orb: Orb) {
  const extendedDestroyOrb = orb.root?.meta.extendables?.destroyOrb!;
  extendedDestroyOrb(orb);
};

export function serialize(orb: Orb) {
  return JSON.stringify(orb.root!.meta.immutableState);
}

export function deserialize(orb: Orb, state: any) {
  const orbDef = orb.meta.original;
  orb.meta.initialState = state;
  const augmenters = orb.root?.meta.extendables?.augmenters!;
  keys(augmenters).forEach(augmenterKey => {
    augmenters[augmenterKey](orb, orbDef);
  });
  orb.meta.initialState = undefined;
}

export function subscribe(orb: Orb, update: () => void) {
  orb.subscriptions.add(update);
  const subscriptionSet = cacheGet(orb, SUBSCRIPTIONS) as Set<() => void> || new Set<() => void>();
  subscriptionSet.add(update);
  cacheSet(orb, SUBSCRIPTIONS, subscriptionSet);
  const unsubscribe = () => {
    orb.subscriptions.delete(update);
  }
  return unsubscribe;
};

export function cacheSet(orb: Orb, key: Symbol, value: any) {
  const path = JSON.stringify(orb.meta.path);
  const { nonSerializableCache } =  orb.root!.meta;
  const map = nonSerializableCache?.get(path) || new Map<Symbol, any>();
  map.set(key, value);
  nonSerializableCache?.set(path, map);
}

export function cacheGet(orb: Orb, key: Symbol) {
  const path = JSON.stringify(orb.meta.path);
  const { nonSerializableCache } = orb.root!.meta;
  return nonSerializableCache?.get(path)?.get(key);
}

export function cacheClear(orb: Orb) {
  const path = JSON.stringify(orb.meta.path);
  const { nonSerializableCache } = orb.root!.meta;
  nonSerializableCache?.delete(path);
}
