import React from 'react';
import { useOrb } from 'reorbit-react';

export const AddTodoOrbDef = {
  state: {
    todoText: {
      default: '',
      transitions: {
        update(...[,newText]) {
          return newText;
        }
      }
    }
  },
  static: {
    addTodo(orb, todoText) {
      orb.parent.todoListOrb.addTodo(todoText);
    }
  }
}

export const AddTodo = ({ orb }) => {
  useOrb(orb)
  const { todoText, update, addTodo } = orb;

  const onChange = e => update(e.target.value)

  return (
    <div>
      <form
        onSubmit={e => {
          e.preventDefault()
          if (!todoText.trim()) {
            return
          }
          addTodo(orb, todoText)
          update('')
        }}
      >
        <input value={todoText} onChange={onChange} />
        <button type="submit">Add Todo</button>
      </form>
    </div>
  )
}
