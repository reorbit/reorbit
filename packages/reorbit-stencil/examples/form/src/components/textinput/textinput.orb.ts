import { Orb, OrbDef } from "reorbit";

export interface TextInputOrb extends Orb {
  value: string,
  update: (value: string) => string,
}

export const TextInputOrbDef: OrbDef = {
  state: {
    value: {
      default: '',
      transitions: {
        update(_: any, value: string) {
          return value;
        },
      }
    }
  },
};
