import React from 'react';
import { createOrb } from 'reorbit';
import { useOrb } from 'react-reorbit';
import { immer } from 'reorbit-immer';

const TodoListOrbDef = {
  state: {
    todoList: {
      default: [],
      transitions: {
        addTodo(state, newText) {
          state.push({
            text: newText,
            completed: false,
            id: state.length,
          });
        },
        toggleTodo(state, todoId) {
          state[todoId].completed = !state[todoId].completed;
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
            return todoList.filter(t => t.completed);
          case VisibilityFilters.SHOW_ACTIVE:
            return todoList.filter(t => !t.completed);
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
          return filter;
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
      orb.parent.todoListOrb.addTodo(todoText);
    }
  }
}

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

const appOrb = createOrb(AppOrbDef, undefined, undefined, {
  extensions: [immer],
});

const AddTodo = () => {
  const { addTodoOrb } = appOrb;
  const { todoText, update, addTodo } = addTodoOrb;
  useOrb(addTodoOrb)

  const onChange = e => update(e.target.value)

  return (
    <div>
      <form
        onSubmit={e => {
          e.preventDefault()
          if (!todoText.trim()) {
            return
          }
          addTodo(addTodoOrb, todoText)
          update('')
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
  const { visibleTodoList, toggleTodo } = todoListOrb;
  useOrb(todoListOrb)

  return (
    <TodoList todos={visibleTodoList} toggleTodo={toggleTodo} />
  )
}

const FilterLink = ({ children, filter }) => {
  const { filterOrb } = appOrb;
  const { visibilityFilter, setVisibilityFilter } = filterOrb;
  useOrb(filterOrb)
  return (
    <button
    onClick={() => setVisibilityFilter(filter)}
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
  useOrb(appOrb);
  return (
    <div>
      <AddTodo />
      <VisibleTodoList />
      <Footer />
    </div>
  );
}

export default App;
