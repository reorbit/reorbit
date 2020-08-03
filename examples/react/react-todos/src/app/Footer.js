
import React from 'react';
import { useOrb } from 'react-reorbit';

export const VisibilityFilters = {
  SHOW_ALL: 'SHOW_ALL',
  SHOW_COMPLETED: 'SHOW_COMPLETED',
  SHOW_ACTIVE: 'SHOW_ACTIVE'
}

export const FilterOrbDef = {
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

export const FilterLink = ({ children, filter, orb }) => {
  useOrb(orb)
  const { visibilityFilter, setVisibilityFilter } = orb;
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

export const Footer = ({ orb }) => (
  <div>
    <span>Show: </span>
    <FilterLink orb={orb} filter={VisibilityFilters.SHOW_ALL}>All</FilterLink>
    <FilterLink orb={orb} filter={VisibilityFilters.SHOW_ACTIVE}>Active</FilterLink>
    <FilterLink orb={orb} filter={VisibilityFilters.SHOW_COMPLETED}>Completed</FilterLink>
  </div>
)
