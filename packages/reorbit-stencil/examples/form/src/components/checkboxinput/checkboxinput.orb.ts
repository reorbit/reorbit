import { Orb, OrbDef } from "reorbit";

export interface CheckboxInputOrb extends Orb {
  value: boolean,
  update: (alue: boolean) => boolean,
}

export const CheckboxInputOrbDef: OrbDef = {
  state: {
    value: {
      default: false,
      transitions: {
        update(_: any, value: boolean) {
          return value;
        },
      }
    }
  },
};
