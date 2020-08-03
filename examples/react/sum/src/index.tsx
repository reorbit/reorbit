import React from 'react';
import ReactDOM from 'react-dom';
import { createOrb } from 'reorbit';
import './index.css';
import { Sum, SumOrb, SumOrbDef } from './Sum';

const orb = createOrb<SumOrb>(SumOrbDef);

ReactDOM.render(<Sum orb={orb} />, document.getElementById('root'));