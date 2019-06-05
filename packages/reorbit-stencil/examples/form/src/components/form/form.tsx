import { Component, Prop, State, h } from '@stencil/core';
import { subscribe } from 'reorbit';
import { FormParam } from './form.orb';

@Component({
  tag: 'app-form',
  shadow: false
})
export class Form {
  @Prop() orb: any;
  @Prop() formParams: any;
  @State() state: any;
  componentWillLoad() {
    subscribe(this.orb, () => this.state = {});
  }
  render() {
    const { readOnly, submit, cancel, state, inputChildren, formParams } = this.orb;
    const { readOnly: { toggleMode } }= state;
    return (
      <div style={{margin: '16px'}}>
        <div style={{ height: '20px' }}>
          {readOnly && <button onClick={() => toggleMode(this.orb)}>Edit</button>}
        </div>
        {
          formParams.map((formParam: FormParam) => {
            const { key, label, tag } = formParam;
            const Input: any = tag;
            return (<Input
              readOnly={readOnly} 
              label={label} 
              orb={inputChildren[key]} 
              persistedValue={this.orb[key].value}
              error={this.orb[key].error}
              style={{margin: '8px'}}/>)
          })
        }
        <div style={{ height: '20px' }}>
          {!readOnly && 
            <div>
              <button onClick={() => cancel(this.orb)}>Cancel</button>
              &nbsp;
              <button onClick={() => submit(this.orb)}>Submit</button>
            </div>
          }
        </div>
      </div>
    );
  }
}
