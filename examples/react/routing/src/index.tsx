import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import { App, RouterOrb, RouterOrbDef } from './App';
import * as serviceWorker from './serviceWorker';
import { createOrb } from '@reorbit/core';

export const orb = createOrb<RouterOrb>(RouterOrbDef);

ReactDOM.render(
  <App orb={orb} />,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
