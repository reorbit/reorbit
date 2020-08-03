import React from 'react';
import { createOrb } from 'reorbit';
import { useOrb } from 'react-reorbit';
import { reduxDevtools } from 'reorbit-redux-devtools';
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
        setVisibilityFilter(...[,filter]) {
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
  extensions: [reduxDevtools],
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
