import { Component, Prop, State, h } from '@stencil/core';
import { subscribe } from 'reorbit';
import { CheckboxInputOrb } from './checkboxinput.orb';

@Component({
  tag: 'app-checkbox-input',
  shadow: false
})
export class TextInput {
  @Prop() label: string = '';
  @Prop() readOnly: boolean = true;
  @Prop() persistedValue: boolean = false;
  @Prop() error: string = '';
  @Prop() orb: CheckboxInputOrb = {} as CheckboxInputOrb;
  @State() state: any;
  componentWillLoad() {
    subscribe(this.orb, () => this.state = {});
  }
  render() {
    const { label, readOnly } = this;
    const { value, state } = this.orb;
    const { value: { update } } = state;
    return (
      <div style={{ height: '20px' }} >
        <b>{label}</b> {readOnly ? (this.persistedValue ? 'Yes' : 'No') : 
        <input type="checkbox" checked={value} onInput={
          (event) => update((event.target as HTMLInputElement).checked)
        }></input>}
        {this.error}
      </div>
    );
  }
}
