import React from 'react';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';
import { devToolsEnhancer } from 'redux-devtools-extension';
import { createOrb } from '@reorbit/core';
import './index.css';
import { Fractal, FractalOrb, FractalOrbDef } from './Fractal';
import { reducer, redux } from '@reorbit/redux';

const key = 'FractalOrb';
const store = createStore(reducer(FractalOrbDef, key), devToolsEnhancer({}));

const orb = createOrb<FractalOrb>(FractalOrbDef, undefined, key, {
  extensions: [
    redux(store)
  ]
});

ReactDOM.render(<Fractal orb={orb} />, document.getElementById('root'));
