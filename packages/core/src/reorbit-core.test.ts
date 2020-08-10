import {
  createOrb,
  cacheSet,
  serialize,
  subscribe,
  Orb,
  destroyOrb,
  deserialize,
  Extendables,
  OrbDef,
  cacheGet,
  cacheClear,
} from "./reorbit-core";

interface CounterOrb extends Orb {
  count: number;
  increment: (value: number) => number;
}

describe("cacheSet", () => {
  const orb = createOrb({});
  const key = Symbol("key");
  cacheSet(orb, key, "value");
  expect(
    orb.meta.nonSerializableCache!.get(JSON.stringify(orb.meta.path))!.get(key)
  ).toMatchInlineSnapshot(`"value"`);
});

describe("cacheGet", () => {
  const orb = createOrb({});
  const key = Symbol("key");
  cacheSet(orb, key, "value");
  expect(cacheGet(orb, key)).toMatchInlineSnapshot(`"value"`);
});

describe("cacheClear", () => {
  const orb = createOrb({});
  const key = Symbol("key");
  cacheClear(orb);
  expect(cacheGet(orb, key)).toMatchInlineSnapshot(`undefined`);
});

describe("serialize", () => {
  it("can serialize an orb", () => {
    const orb = createOrb({});
    expect(serialize(orb)).toMatchInlineSnapshot(`"{}"`);
  });
});

describe("createOrb", () => {
  it("can create an orb", () => {
    const orb = createOrb({});
    expect(orb).toMatchInlineSnapshot(`
      Object {
        "dynamic": Object {},
        "meta": Object {
          "extendables": Object {
            "augmenters": Object {
              "dynamic": [Function],
              "state": [Function],
              "static": [Function],
            },
            "destroyOrb": [Function],
          },
          "immutableState": Object {},
          "initialState": undefined,
          "nonSerializableCache": Map {
            "[]" => Map {
              Symbol(reorbit/subscriptions) => Set {},
            },
          },
          "options": Object {},
          "original": Object {},
          "path": Array [],
        },
        "parent": undefined,
        "root": [Circular],
        "state": Object {},
        "subscriptions": Set {},
      }
    `);
  });
});

describe("subscribe", () => {
  it("should call subscribe callback", () => {
    const orb = createOrb<CounterOrb>({
      state: {
        count: {
          default: 0,
          transitions: {
            increment(state: number, value: number) {
              return state + value;
            },
          },
        },
      },
    });
    const cb = jest.fn();
    subscribe(orb, cb);
    orb.increment(1);
    expect(cb).toHaveBeenCalled();
  });
  it("should call subscribe callback with updated values", () => {
    const orb = createOrb<CounterOrb>({
      state: {
        count: {
          default: 0,
          transitions: {
            increment(state: number, value: number) {
              return state + value;
            },
          },
        },
      },
    });
    subscribe(orb, () => {
      expect(orb.count).toMatchInlineSnapshot(`1`);
    });
    orb.increment(1);
  });
});

describe("Functionality", () => {
  it("Should create orb with state", () => {
    const orb = createOrb<CounterOrb>({
      state: {
        count: {
          default: 0,
          transitions: {
            increment(state: number, value: number) {
              return state + value;
            },
          },
        },
      },
    });
    subscribe(orb, () => {
      expect(orb.count).toMatchInlineSnapshot(`1`);
    });
    orb.increment(1);
  });
  it("Should create orb with transition functions that modify state", () => {
    const orb = createOrb<CounterOrb>({
      state: {
        count: {
          default: 0,
          transitions: {
            increment(state: number, value: number) {
              return state + value;
            },
          },
        },
      },
    });
    subscribe(orb, () => {
      expect(orb.count).toMatchInlineSnapshot(`1`);
    });
    orb.increment(1);
  });
  it("Should not update subscribers if state has not transitioned", () => {
    const orb = createOrb<CounterOrb>({
      state: {
        count: {
          default: 0,
          transitions: {
            increment(state: number, value: number) {
              return state + value;
            },
          },
        },
      },
    });
    subscribe(orb, () => {
      expect(orb.count).toMatchInlineSnapshot(`0`);
    });
    orb.increment(0);
  });
  it("Should create orb with static properties", () => {
    const orb = createOrb<CounterOrb>({
      static: {
        count: 1,
        increment: (value: number) => {
          return value + 1;
        },
      },
    });
    expect(orb.count).toMatchInlineSnapshot(`1`);
    expect(orb.increment(1)).toMatchInlineSnapshot(`2`);
  });
  it("Should create orb with dynamic properties that update when state is updated", () => {
    interface DynamicCounter extends Orb {
      count: number;
      increment: (value: number) => number;
      countPlusOne: number;
    }
    const orb = createOrb<DynamicCounter>({
      state: {
        count: {
          default: 0,
          transitions: {
            increment(state: number, value: number) {
              return state + value;
            },
          },
        },
      },
      dynamic: {
        countPlusOne: {
          dependencies: [(orb) => orb.state.count],
          derive(orb: DynamicCounter) {
            return orb.count + 1;
          },
        },
      },
    });
    expect(orb.count).toMatchInlineSnapshot(`0`);
    orb.increment(1);
    expect(orb.count).toMatchInlineSnapshot(`1`);
    expect(orb.countPlusOne).toMatchInlineSnapshot(`2`);
  });
  it("Should be able to destory an orb", () => {
    interface DynamicCounter extends Orb {
      count: number;
      increment: (value: number) => number;
      countPlusOne: number;
    }
    const orb = createOrb<DynamicCounter>({
      state: {
        count: {
          default: 0,
          transitions: {
            increment(state: number, value: number) {
              return state + value;
            },
          },
        },
      },
      dynamic: {
        countPlusOne: {
          dependencies: [(orb) => orb.state.count],
          derive(orb: DynamicCounter) {
            return orb.count + 1;
          },
        },
      },
    });
    subscribe(orb, () => {
      throw new Error("Should not call this");
    });
    destroyOrb(orb);
    orb.increment(1);
  });
  it("Should be able to destory orb children", () => {
    interface ParentOrb extends Orb {
      count: number;
      increment: (value: number) => number;
      subOrb: ChildOrb;
    }
    interface ChildOrb extends Orb {
      count: number;
      increment: (value: number) => number;
    }
    const parentOrb = createOrb<ParentOrb>({
      state: {
        count: {
          default: 0,
          transitions: {
            increment(state: number, value: number) {
              return state + value;
            },
          },
        },
      },
      dynamic: {
        subOrb: {
          derive(orb: ParentOrb) {
            return createOrb<ChildOrb>(
              {
                state: {
                  count: {
                    default: 0,
                    transitions: {
                      increment(state: number, value: number) {
                        return state + value;
                      },
                    },
                  },
                },
              },
              orb,
              "1"
            );
          },
        },
      },
    });
    subscribe(parentOrb.subOrb, () => {
      throw new Error("Should not call this");
    });
    destroyOrb(parentOrb);
    parentOrb.subOrb.increment(1);
  });
  it("Should not update dependant children if the value is not updated", () => {
    interface ParentOrb extends Orb {
      count: number;
      increment: (value: number) => number;
      subOrb: ChildOrb;
    }
    interface ChildOrb extends Orb {
      count: number;
      increment: (value: number) => number;
      parentValue: number;
    }
    const parentOrb = createOrb<ParentOrb>({
      state: {
        count: {
          default: 0,
          transitions: {
            increment(state: number, value: number) {
              return state + value;
            },
          },
        },
      },
      dynamic: {
        subOrb: {
          derive(orb: ParentOrb) {
            return createOrb<ChildOrb>(
              {
                state: {
                  count: {
                    default: 0,
                    transitions: {
                      increment(state: number, value: number) {
                        return state + value;
                      },
                    },
                  },
                },
                dynamic: {
                  parentValue: {
                    dependencies: [(orb: ChildOrb) => orb.parent!.state.count],
                    derive() {
                      return 0;
                    },
                  },
                },
              },
              orb,
              "1"
            );
          },
        },
      },
    });
    subscribe(parentOrb.subOrb, () => {
      throw new Error("Should not call this");
    });
    parentOrb.increment(1);
  });
  it("Should not update dependant children if the value is not updated", () => {
    interface ParentOrb extends Orb {
      count: number;
      increment: (value: number) => number;
      subOrb: ChildOrb;
      subOrb2: ChildOrb;
    }
    interface ChildOrb extends Orb {
      count: number;
      increment: (value: number) => number;
      parentValue: number;
    }
    const parentOrb = createOrb<ParentOrb>({
      state: {
        count: {
          default: 0,
          transitions: {
            increment(state: number, value: number) {
              return state + value;
            },
          },
        },
      },
      dynamic: {
        subOrb: {
          derive(orb: ParentOrb) {
            return createOrb<ChildOrb>(
              {
                state: {
                  count: {
                    default: 0,
                    transitions: {
                      increment(state: number, value: number) {
                        return state + value;
                      },
                    },
                  },
                },
                dynamic: {
                  parentValue: {
                    dependencies: [(orb: ChildOrb) => orb.parent!.state.count],
                    derive() {
                      return 0;
                    },
                  },
                },
              },
              orb,
              "1"
            );
          },
        },
        subOrb2: {
          derive(orb: ParentOrb) {
            return createOrb<ChildOrb>(
              {
                state: {
                  count: {
                    default: 0,
                    transitions: {
                      increment(state: number, value: number) {
                        return state + value;
                      },
                    },
                  },
                },
                dynamic: {
                  parentValue: {
                    dependencies: [(orb: ChildOrb) => orb.parent!.state.count],
                    derive(_: ChildOrb, parentOrb: ParentOrb) {
                      return parentOrb.count;
                    },
                  },
                },
              },
              orb,
              "1"
            );
          },
        },
      },
    });
    subscribe(parentOrb.subOrb, () => {
      throw new Error("Should not call this");
    });
    const cb = jest.fn();
    subscribe(parentOrb.subOrb2, cb);
    parentOrb.increment(1);
    expect(cb).toBeCalled();
  });
  it("Should destroy stale children", () => {
    interface ParentOrb extends Orb {
      count: number;
      increment: (value: number) => number;
      subOrb: ChildOrb;
    }
    interface ChildOrb extends Orb {
      count: number;
      increment: (value: number) => number;
      parentValue: number;
    }
    const parentOrb = createOrb<ParentOrb>({
      state: {
        count: {
          default: 0,
          transitions: {
            increment(state: number, value: number) {
              return state + value;
            },
          },
        },
      },
      dynamic: {
        subOrb: {
          dependencies: [(orb: ParentOrb) => orb.state.count],
          derive(orb: ParentOrb) {
            return createOrb<ChildOrb>(
              {
                state: {
                  count: {
                    default: 0,
                    transitions: {
                      increment(state: number, value: number) {
                        return state + value;
                      },
                    },
                  },
                },
                dynamic: {
                  parentValue: {
                    dependencies: [(orb: ChildOrb) => orb.parent!.state.count],
                    derive() {
                      return 0;
                    },
                  },
                },
              },
              orb,
              orb.count.toString()
            );
          },
        },
      },
    });
    parentOrb.subOrb.increment(1);
    expect(parentOrb.subOrb.count).toMatchInlineSnapshot(`1`);
    parentOrb.increment(1);
    expect(parentOrb.subOrb.count).toMatchInlineSnapshot(`0`);
  });
  it("Should use cached children", () => {
    interface ParentOrb extends Orb {
      count: number;
      increment: (value: number) => number;
      subOrb: ChildOrb;
    }
    interface ChildOrb extends Orb {
      count: number;
      increment: (value: number) => number;
      parentValue: number;
    }
    const parentOrb = createOrb<ParentOrb>({
      state: {
        count: {
          default: 0,
          transitions: {
            increment(state: number, value: number) {
              return state + value;
            },
          },
        },
      },
      dynamic: {
        subOrb: {
          dependencies: [(orb: ParentOrb) => orb.state.count],
          derive(orb: ParentOrb) {
            return createOrb<ChildOrb>(
              {
                state: {
                  count: {
                    default: 0,
                    transitions: {
                      increment(state: number, value: number) {
                        return state + value;
                      },
                    },
                  },
                },
                dynamic: {
                  parentValue: {
                    dependencies: [(orb: ChildOrb) => orb.parent!.state.count],
                    derive() {
                      return 0;
                    },
                  },
                },
              },
              orb,
              "1"
            );
          },
        },
      },
    });
    parentOrb.subOrb.increment(1);
    expect(parentOrb.subOrb.count).toMatchInlineSnapshot(`1`);
    parentOrb.increment(1);
    expect(parentOrb.subOrb.count).toMatchInlineSnapshot(`1`);
  });
  it("Should be able to searialize an orb", () => {
    interface ParentOrb extends Orb {
      count: number;
      increment: (value: number) => number;
      subOrb: ChildOrb;
    }
    interface ChildOrb extends Orb {
      count: number;
      increment: (value: number) => number;
    }
    const parentOrb = createOrb<ParentOrb>({
      state: {
        count: {
          default: 0,
          transitions: {
            increment(state: number, value: number) {
              return state + value;
            },
          },
        },
      },
      dynamic: {
        subOrb: {
          derive(orb: ParentOrb) {
            return createOrb<ChildOrb>(
              {
                state: {
                  count: {
                    default: 0,
                    transitions: {
                      increment(state: number, value: number) {
                        return state + value;
                      },
                    },
                  },
                },
              },
              orb,
              "1"
            );
          },
        },
      },
    });
    expect(serialize(parentOrb)).toMatchInlineSnapshot(
      `"{\\"count\\":0,\\"subOrb\\":{\\"1\\":{\\"count\\":0}}}"`
    );
  });
  it("Should be able to deserialize an orb", () => {
    interface ParentOrb extends Orb {
      count: number;
      increment: (value: number) => number;
      subOrb: ChildOrb;
    }
    interface ChildOrb extends Orb {
      count: number;
      increment: (value: number) => number;
    }
    const parentOrb = createOrb<ParentOrb>({
      state: {
        count: {
          default: 0,
          transitions: {
            increment(state: number, value: number) {
              return state + value;
            },
          },
        },
      },
      dynamic: {
        subOrb: {
          derive(orb: ParentOrb) {
            return createOrb<ChildOrb>(
              {
                state: {
                  count: {
                    default: 0,
                    transitions: {
                      increment(state: number, value: number) {
                        return state + value;
                      },
                    },
                  },
                },
              },
              orb,
              "1"
            );
          },
        },
      },
    });
    deserialize(parentOrb, { count: 0, subOrb: { "1": { count: 1 } } });
    expect(parentOrb.subOrb.count).toMatchInlineSnapshot(`1`);
  });
  it("Should be able to deserialize an orb and preserve subscriptions", () => {
    interface ParentOrb extends Orb {
      count: number;
      increment: (value: number) => number;
      subOrb: ChildOrb;
    }
    interface ChildOrb extends Orb {
      count: number;
      increment: (value: number) => number;
    }
    const parentOrb = createOrb<ParentOrb>({
      state: {
        count: {
          default: 0,
          transitions: {
            increment(state: number, value: number) {
              return state + value;
            },
          },
        },
      },
      dynamic: {
        subOrb: {
          derive(orb: ParentOrb) {
            return createOrb<ChildOrb>(
              {
                state: {
                  count: {
                    default: 0,
                    transitions: {
                      increment(state: number, value: number) {
                        return state + value;
                      },
                    },
                  },
                },
              },
              orb,
              "1"
            );
          },
        },
      },
    });
    const cb = jest.fn();
    const cb2 = jest.fn();
    subscribe(parentOrb, cb);
    subscribe(parentOrb.subOrb, cb2);
    deserialize(parentOrb, { count: 0, subOrb: { "1": { count: 1 } } });
    parentOrb.increment(1);
    expect(cb).toBeCalled();
    parentOrb.subOrb.increment(1);
    expect(cb2).toBeCalled();
  });
  it("Should be able to unsubscribe from an orb", () => {
    interface DynamicCounter extends Orb {
      count: number;
      increment: (value: number) => number;
      countPlusOne: number;
    }
    const orb = createOrb<DynamicCounter>({
      state: {
        count: {
          default: 0,
          transitions: {
            increment(state: number, value: number) {
              return state + value;
            },
          },
        },
      },
      dynamic: {
        countPlusOne: {
          dependencies: [(orb) => orb.state.count],
          derive(orb: DynamicCounter) {
            return orb.count + 1;
          },
        },
      },
    });
    const unsubscribe = subscribe(orb, () => {
      throw new Error("Should not call this");
    });
    unsubscribe();
    orb.increment(1);
  });
  it("Should be able to exentend and orb", () => {
    const cb = jest.fn();
    function extension({ augmenters }: Extendables): Extendables {
      return {
        augmenters: {
          static: augmenters?.static!,
          state: (orb: Orb, orbDef: OrbDef<any>) => {
            const state = orbDef.state || {};
            Object.keys(state).forEach((stateKey) => {
              const transitions = state[stateKey].transitions || {};
              Object.keys(transitions).forEach((transitionKey) => {
                const transitionDefinition = transitions[transitionKey];
                transitions[transitionKey] = (state: any, ...args: any[]) => {
                  cb();
                  transitionDefinition(state, ...args);
                };
              });
            });
            augmenters?.state(orb, orbDef);
          },
          dynamic: augmenters?.dynamic!,
        },
      };
    }

    const orb = createOrb<CounterOrb>(
      {
        state: {
          count: {
            default: 0,
            transitions: {
              increment(state: number, value: number) {
                return state + value;
              },
            },
          },
        },
      },
      undefined,
      undefined,
      {
        extensions: [extension],
      }
    );
    orb.increment(1);
    expect(cb).toBeCalled();
  });
});
