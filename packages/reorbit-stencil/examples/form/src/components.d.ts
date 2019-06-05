/* tslint:disable */
/**
 * This is an autogenerated file created by the Stencil compiler.
 * It contains typing information for all components that exist in this project.
 */


import { HTMLStencilElement, JSXBase } from '@stencil/core/internal';
import {
  CheckboxInputOrb,
} from './components/checkboxinput/checkboxinput.orb';
import {
  TextInputOrb,
} from './components/textinput/textinput.orb';


export namespace Components {
  interface AppCheckboxInput {
    'error': string;
    'label': string;
    'orb': CheckboxInputOrb;
    'persistedValue': boolean;
    'readOnly': boolean;
  }
  interface AppForm {
    'formParams': any;
    'orb': any;
  }
  interface AppRoot {}
  interface AppTextInput {
    'error': string;
    'label': string;
    'orb': TextInputOrb;
    'persistedValue': string;
    'readOnly': boolean;
  }
}

declare global {


  interface HTMLAppCheckboxInputElement extends Components.AppCheckboxInput, HTMLStencilElement {}
  var HTMLAppCheckboxInputElement: {
    prototype: HTMLAppCheckboxInputElement;
    new (): HTMLAppCheckboxInputElement;
  };

  interface HTMLAppFormElement extends Components.AppForm, HTMLStencilElement {}
  var HTMLAppFormElement: {
    prototype: HTMLAppFormElement;
    new (): HTMLAppFormElement;
  };

  interface HTMLAppRootElement extends Components.AppRoot, HTMLStencilElement {}
  var HTMLAppRootElement: {
    prototype: HTMLAppRootElement;
    new (): HTMLAppRootElement;
  };

  interface HTMLAppTextInputElement extends Components.AppTextInput, HTMLStencilElement {}
  var HTMLAppTextInputElement: {
    prototype: HTMLAppTextInputElement;
    new (): HTMLAppTextInputElement;
  };
  interface HTMLElementTagNameMap {
    'app-checkbox-input': HTMLAppCheckboxInputElement;
    'app-form': HTMLAppFormElement;
    'app-root': HTMLAppRootElement;
    'app-text-input': HTMLAppTextInputElement;
  }
}

declare namespace LocalJSX {
  interface AppCheckboxInput extends JSXBase.HTMLAttributes<HTMLAppCheckboxInputElement> {
    'error'?: string;
    'label'?: string;
    'orb'?: CheckboxInputOrb;
    'persistedValue'?: boolean;
    'readOnly'?: boolean;
  }
  interface AppForm extends JSXBase.HTMLAttributes<HTMLAppFormElement> {
    'formParams'?: any;
    'orb'?: any;
  }
  interface AppRoot extends JSXBase.HTMLAttributes<HTMLAppRootElement> {}
  interface AppTextInput extends JSXBase.HTMLAttributes<HTMLAppTextInputElement> {
    'error'?: string;
    'label'?: string;
    'orb'?: TextInputOrb;
    'persistedValue'?: string;
    'readOnly'?: boolean;
  }

  interface IntrinsicElements {
    'app-checkbox-input': AppCheckboxInput;
    'app-form': AppForm;
    'app-root': AppRoot;
    'app-text-input': AppTextInput;
  }
}

export { LocalJSX as JSX };


declare module "@stencil/core" {
  export namespace JSX {
    interface IntrinsicElements extends LocalJSX.IntrinsicElements {}
  }
}

