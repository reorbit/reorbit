import React from 'react';
import { VisibilityFilters } from './Footer';
import { useOrb } from 'reorbit-react';

export const TodoListOrbDef = {
  state: {
    todoList: {
      default: [],
      transitions: {
        addTodo(state, newText) {
          return [...state].concat({
            text: newText,
            completed: false,
            id: state.length,
          });
        },
        toggleTodo(state, todoId) {
          const newState = [...state];
          newState[todoId] = {
            ...newState[todoId],
            completed: !newState[todoId].completed
          };
          return newState;
        }
      }
    }
  },
  dynamic: {
    visibleTodoList: {
      dependencies: [
        (orb) => orb.state.todoList,
        (orb) => orb.parent.filterOrb.state.visibilityFilter,
      ],
      derive(...[orb, , filterOrb]) {
        const { todoList } = orb;
        const { visibilityFilter } = filterOrb
        switch (visibilityFilter) {
          case VisibilityFilters.SHOW_ALL:
            return todoList
          case VisibilityFilters.SHOW_COMPLETED:
            const completed = todoList.filter(t => t.completed);
            return completed.length === todoList.length ? todoList : completed;
          case VisibilityFilters.SHOW_ACTIVE:
            const uncompleted = todoList.filter(t => !t.completed);
            return uncompleted.length === todoList.length ? todoList : uncompleted;
          default:
            throw new Error('Unknown filter: ' + visibilityFilter)
        }
      }
    }
  }
}

const Todo = ({ onClick, completed, text }) => (
  <li
    onClick={onClick}
    style={{
      textDecoration: completed ? 'line-through' : 'none'
    }}
  >
    {text}
  </li>
)

const TodoList = ({ todos, toggleTodo }) => (
  <ul>
    {todos.map(todo => (
      <Todo key={todo.id} {...todo} onClick={() => toggleTodo(todo.id)} />
    ))}
  </ul>
)

export const VisibleTodoList = ({ orb }) => {
  useOrb(orb)
  const { visibleTodoList, toggleTodo } = orb;

  return (
    <TodoList todos={visibleTodoList} toggleTodo={toggleTodo} />
  )
}
