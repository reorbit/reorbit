import { Component, Prop, State, h } from '@stencil/core';
import { subscribe } from 'reorbit';
import { TextInputOrb } from './textinput.orb';

@Component({
  tag: 'app-text-input',
  shadow: false
})
export class TextInput {
  @Prop() label: string = '';
  @Prop() readOnly: boolean = true;
  @Prop() persistedValue: string = '';
  @Prop() error: string = '';
  @Prop() orb: TextInputOrb = {} as TextInputOrb;
  @State() state: any;
  componentWillLoad() {
    subscribe(this.orb, () => this.state = {});
  }
  render() {
    const { label, readOnly, persistedValue } = this;
    const { value, state } = this.orb;
    const { value: { update } } = state;
    return (
      <div style={{ height: '20px' }} >
        <b>{label}{!readOnly ? '*' : ''}</b> {readOnly ? persistedValue : 
        <input type="text" value={value} onInput={
          (e) => update((e.target as HTMLTextAreaElement).value)
        }></input>}
        &nbsp;
        <span style={{color: 'red', fontSize: '10px'}}>{this.error}</span>
      </div>
    );
  }
}
