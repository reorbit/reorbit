import React from 'react';
import { createOrb } from '@reorbit/core';
import { useOrb } from '@reorbit/react';
import { AddTodoOrbDef, AddTodo } from './app/AddTodo';
import { FilterOrbDef, Footer } from './app/Footer';
import { TodoListOrbDef, VisibleTodoList } from './app/VisibleTodoList';

const AppOrbDef = {
  dynamic: {
    addTodoOrb: {
      derive: orb => createOrb(AddTodoOrbDef, orb),
    },
    filterOrb: {
      derive: orb => createOrb(FilterOrbDef, orb),
    },
    todoListOrb: {
      derive: orb => createOrb(TodoListOrbDef, orb),
    },
  }
}

const orb = createOrb(AppOrbDef);

function App() {
  useOrb(orb);
  const { addTodoOrb, todoListOrb, filterOrb } = orb;
  return (
    <div>
      <AddTodo orb={addTodoOrb} />
      <VisibleTodoList orb={todoListOrb} />
      <Footer orb={filterOrb} />
    </div>
  );
}

export default App;
