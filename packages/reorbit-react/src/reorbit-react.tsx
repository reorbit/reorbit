import React, { useEffect, useState, ComponentType } from "react";
import { subscribe, Orb } from "reorbit";

export function getOrb<T extends Orb, U extends Orb>(orb: U, selector: (root: U) => T): T {
  return selector(orb);
}

export const useOrb = <T extends Orb>(orb: T) => {
  const update = useState({})[1];
  const [mouted] = useState();
  useEffect(() => {
    const unsubscribe = subscribe(orb, () => update({}));
    return () => {
      unsubscribe();
    }
  }, [mouted]);
};

interface OrbProps {
  orb: Orb;
}

export function withOrb<T extends OrbProps>(Wrapped: ComponentType<any>) {
  return (props: T) => {
    useOrb(props.orb);
    return <Wrapped {...props.orb} {...props} />;
  }
}
