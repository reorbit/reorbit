import React from 'react';
import createRouter, { Router, State as RouterState } from 'router5';
import browserPlugin from 'router5-plugin-browser';
import { Orb } from 'reorbit';
import { useOrb } from 'react-reorbit';

import { orb } from './index';

import './App.css';

const { useEffect } = React;

export interface RouterOrb extends Orb {
  route: RouterState,
  routeChanged: (value: RouterState) => RouterState,
  startRouter: (orb: RouterOrb) => void,
  navigate: (orb: RouterOrb, path: string, params: object) => void,
  isActive: (orb: RouterOrb, route: string) => boolean,
  router: Router,
};

export const RouterOrbDef = {
  state: {
    route: {
      default: undefined,
      transitions: {
        routeChanged(state: object, value: object): object {
          return value;
        },
      },
    },
  },
  static: {
    startRouter(orb: RouterOrb) {
      orb.router.subscribe(obj => {
        orb.routeChanged(obj.route);
      })
      orb.router.start();
    },
    navigate(orb: RouterOrb, path: string, params: Record<string, any>) {
      orb.router.navigate(path, params);
    },
    isActive(orb: RouterOrb, route: string) {
      return orb.router.isActive(route);
    }
  },
  dynamic: {
    router: {
      derive() {
        const routes = [
          {
            name: 'home',
            path: '/'
          },
          {
            name: 'posts',
            path: '/posts',
            children: [
              {
                name: 'details',
                path: '/:id',
              },
            ],
          },
        ]
        const router = createRouter(routes, {
          allowNotFound: true
        })
        router.usePlugin(browserPlugin({
          useHash: false
        }));
        return router;
      }
    }
  }
};

function Home() {
  return (
    <div>
      <h2>Home</h2>
    </div>
  );
}

function Posts() {
  const { route, navigate } = orb;
  useOrb(orb);
  return (
    <div>
      <h2>Topics</h2>
      <button onClick={() => navigate(orb, 'posts.details', { id: 1 })}>Details 1</button>
      <button onClick={() => navigate(orb, 'posts.details', { id: 2 })}>Details 2</button>
      <button onClick={() => navigate(orb, 'posts.details', { id: 3 })}>Details 3</button>

      <Post id={route.params.id} />
    </div>
  );
}

function Post({ id }: { id: number }) {
  return (
    <div>
      <h3>{id}</h3>
    </div>
  );
}

export function App({ orb }: { orb: RouterOrb}) {
  const { startRouter, navigate, isActive } = orb;
  useOrb(orb);
  useEffect(() => {
    startRouter(orb);
  }, [orb, startRouter]);
  let content;
  if (orb.isActive(orb, 'home')) {
    content = <Home />;
  } else if (isActive(orb, 'posts')) {
    content = <Posts />;
  }
  return (
    <div className="App">
      <button onClick={() => navigate(orb, 'home', {})}>Home</button>
      <button onClick={() => navigate(orb, 'posts', {})}>Posts</button>
      <div>
        {content}
      </div>
    </div>
  );
}
