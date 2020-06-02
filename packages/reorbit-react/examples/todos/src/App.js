import React from 'react';
import { createOrb } from 'reorbit';
import { useOrb } from 'reorbit-react';
import './App.css';

const TodoListOrbDef = {
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
      combiner(orb, filterOrb) {
        const { todoList } = orb;
        const { visibilityFilter } = filterOrb
        switch (visibilityFilter) {
          case VisibilityFilters.SHOW_ALL:
            return todoList
          case VisibilityFilters.SHOW_COMPLETED:
            return todoList.filter(t => t.completed)
          case VisibilityFilters.SHOW_ACTIVE:
            return todoList.filter(t => !t.completed)
          default:
            throw new Error('Unknown filter: ' + visibilityFilter)
        }
      }
    }
  }
}

const VisibilityFilters = {
  SHOW_ALL: 'SHOW_ALL',
  SHOW_COMPLETED: 'SHOW_COMPLETED',
  SHOW_ACTIVE: 'SHOW_ACTIVE'
}

const FilterOrbDef = {
  state: {
    visibilityFilter: {
      default: VisibilityFilters.SHOW_ALL,
      transitions: {
        setVisibilityFilter(state, filter) {
          return filter
        }
      }
    }
  }
}

const AddTodoOrbDef = {
  state: {
    todoText: {
      default: '',
      transitions: {
        update(state, newText) {
          return newText;
        }
      }
    }
  },
  static: {
    addTodo(orb, todoText) {
      orb.parent.todoListOrb.state.todoList.addTodo(todoText);
    }
  }
}

const AppOrbDef = {
  state: {
    identity: {},
  },
  dynamic: {
    addTodoOrb: {
      dependencies: [
        (orb) => orb.state.identity,
      ],
      combiner(orb) {
        return createOrb(AddTodoOrbDef, orb, '0');
      }
    },
    filterOrb: {
      dependencies: [
        (orb) => orb.state.identity,
      ],
      combiner(orb) {
        return createOrb(FilterOrbDef, orb, '0');
      }
    },
    todoListOrb: {
      dependencies: [
        (orb) => orb.state.identity,
      ],
      combiner(orb) {
        return createOrb(TodoListOrbDef, orb, '0');
      }
    },
  }
}

const appOrb = createOrb(AppOrbDef);

const AddTodo = () => {
  const { addTodoOrb } = appOrb;
  const { todoText, state, addTodo } = addTodoOrb;
  useOrb(addTodoOrb)

  const onChange = e => state.todoText.update(e.target.value)

  return (
    <div>
      <form
        onSubmit={e => {
          e.preventDefault()
          if (!todoText.trim()) {
            return
          }
          addTodo(addTodoOrb, todoText)
          state.todoText.update('')
        }}
      >
        <input value={todoText} onChange={onChange} />
        <button type="submit">Add Todo</button>
      </form>
    </div>
  )
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

const VisibleTodoList = () => {
  const { todoListOrb } = appOrb;
  const { visibleTodoList, state } = todoListOrb;
  useOrb(todoListOrb)

  return (
    <TodoList todos={visibleTodoList} toggleTodo={state.todoList.toggleTodo} />
  )
}

const FilterLink = ({ children, filter }) => {
  const { filterOrb } = appOrb;
  const { visibilityFilter, state } = filterOrb;
  useOrb(filterOrb)
  return (
    <button
    onClick={() => state.visibilityFilter.setVisibilityFilter(filter)}
    disabled={filter === visibilityFilter}
    style={{
      marginLeft: '4px'
    }}
  >
    {children}
  </button>
  )
}

const Footer = () => (
  <div>
    <span>Show: </span>
    <FilterLink filter={VisibilityFilters.SHOW_ALL}>All</FilterLink>
    <FilterLink filter={VisibilityFilters.SHOW_ACTIVE}>Active</FilterLink>
    <FilterLink filter={VisibilityFilters.SHOW_COMPLETED}>Completed</FilterLink>
  </div>
)

function App() {
  return (
    <div>
      <AddTodo />
      <VisibleTodoList />
      <Footer />
    </div>
  );
}

export default App;
