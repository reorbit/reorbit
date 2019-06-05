import { Component, h } from '@stencil/core';
import { createOrb } from 'reorbit';
import { FormOrb } from '../form/form.orb';

@Component({
  tag: 'app-root',
  styleUrl: 'app-root.css',
  shadow: true
})
export class AppRoot {
  render() {
    const FormParams = [
      {
        tag: 'app-text-input',
        key: 'firstName',
        label: 'First Name',
        state: {
          value: 'Bob',
          errors: '',
        },
      },
      {
        tag: 'app-text-input',
        key: 'lastName',
        label: 'Last Name',
        state: {
          value: 'Smith',
          errors: '',
        },
      },
      {
        tag: 'app-checkbox-input',
        key: 'readonly',
        label: 'Read Only',
        state: {
          value: false,
          errors: '',
        },
      },
    ];
    const formOrb = createOrb(FormOrb(FormParams));
    (window as any).orb = formOrb;
    return (
      <div>
        <header>
          <h1>Stencil App Starter</h1>
        </header>

        <main>
          <app-form orb={formOrb} />
        </main>

      </div>
    );
  }
}
