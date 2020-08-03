import React from 'react';
import ReactDOM from 'react-dom';
import { createOrb } from '@reorbit/core';
import './index.css';
import { Fractal, FractalOrb, FractalOrbDef } from './Fractal';

const orb = createOrb<FractalOrb>(FractalOrbDef);

ReactDOM.render(<Fractal orb={orb} />, document.getElementById('root'));
