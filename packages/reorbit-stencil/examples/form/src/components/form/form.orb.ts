import { Orb, createOrb, OrbDef } from "reorbit";
import { TextInputOrbDef, TextInputOrb } from "../textinput/textinput.orb";
import { CheckboxInputOrbDef, CheckboxInputOrb } from "../checkboxinput/checkboxinput.orb";

const delay = (time: number) => new Promise(res=>setTimeout(()=>res(),time));

interface FormOrb extends Orb {
  inputChildren: {
    [key: string]: TextInputOrb | CheckboxInputOrb,
  },
}

export interface FormParam {
  tag: string,
  key: string,
  state: any,
  label: string,
}

const update = (state: any, value: string) => {
  return {
    ...state,
    value,
  };
};

const updateError = (state: any, error: string) => {
  return {
    ...state,
    error,
  };
};

const validate = (value: string) => {
  if (value) {
    return null;
  }
  return {
    message: 'Must provide a value',
  }
}

export const FormOrb = (formParams: FormParam[]): OrbDef => ({
  state: {
    identity: {
      default: formParams,
    },
    readOnly: {
      default: true,
      transitions: {
        toggleMode(state: boolean) {
          return !state;
        },
      }
    },
    ...formParams.reduce((acc, formParam) => {
      return {...acc, ...{
        [formParam.key]: {
          default: formParam.state,
          transitions: {
            update: update,
            validate: validate,
            updateError: updateError,
          },
        }
      }}
    }, {}),
  },
  static: {
    formParams,
    async cancel(instance: FormOrb) {
      const { state, inputChildren } = instance;
      const { readOnly } = state;
      formParams.forEach(formParam => {
        const { key } = formParam;
        inputChildren[key].state.value.update(instance[key].value);
        state[key].updateError('');
      });
      readOnly.toggleMode();
    },
    async submit(instance: FormOrb) {
      const { state, inputChildren } = instance;
      const { readOnly } = state;
      const valid = formParams.reduce((acc, formParam) => {
        const { key } = formParam;
        let error
        if (formParam.tag === 'app-text-input') {
          error = validate(inputChildren[key].value as string);
        }
        if (error) {
          state[key].updateError(error.message);
          return acc && false;
        }
        state[key].updateError('');
        return acc && true;
      }, true);
      if (!valid) {
        return;
      }
      await delay(1000);
      const inputStrings = formParams.map(formParam => {
        const { key } = formParam;
        return inputChildren[key].value;
      }).join(' ');
      alert(inputStrings);
      formParams.forEach(formParam => {
        const { key } = formParam;
        state[key].update(inputChildren[key].value);
      });
      readOnly.toggleMode();
    },
  },
  dynamic: {
    inputChildren: {
      dependencies: [
        (instance: FormOrb) => instance.state.identity,
      ],
      combiner(instance: FormOrb) {
        instance.inputChildren = instance.inputChildren || {};
        const inputChildrenMap = formParams.reduce((acc, formParam) => {
          let def;
          if (formParam.tag === 'app-text-input') {
            def = {
              ...TextInputOrbDef,
              state: {
                ...TextInputOrbDef.state,
                value: {
                  ...TextInputOrbDef.state.value,
                  default: formParam.state.value,
                }
              }
            };
          } else {
            def = CheckboxInputOrbDef;
          }
          return {...acc, ...{
            [formParam.key]: instance.inputChildren[formParam.key] || createOrb(def, instance),
          }}
        }, {});
        return inputChildrenMap;
      }
    },
  }
});
