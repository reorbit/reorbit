import React from 'react';
import ReactDOM from 'react-dom';
import { createOrb } from 'reorbit';
import './index.css';
import { Counter, CounterOrb, CounterOrbDef } from './Counter';

const orb = createOrb<CounterOrb>(CounterOrbDef);

ReactDOM.render(<Counter orb={orb} />, document.getElementById('root'));