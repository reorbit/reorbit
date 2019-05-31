import React from 'react';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';
import { devToolsEnhancer } from 'redux-devtools-extension';
import { createOrb } from 'reorbit';
import './index.css';
import { Fractal, FractalOrb, FractalOrbDef } from './Fractal';
import redux, { reducer } from 'reorbit-redux';

const store = createStore(reducer(FractalOrbDef), devToolsEnhancer({}));

const orb = createOrb<FractalOrb>(FractalOrbDef, undefined, undefined, {
  augmenters: [
    redux({
      store,
    }),
  ],
});

ReactDOM.render(<Fractal orb={orb} />, document.getElementById('root'));