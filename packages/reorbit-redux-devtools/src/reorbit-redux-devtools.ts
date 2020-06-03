import { Orb } from "reorbit";

export default function reduxDevtools() {
  return {
    name: 'redux-devtools',
    onCreate(orb: Orb) {
      console.log(orb);
    },
    postCreate(orb: Orb) {
      console.log(orb);
    },
    onDestory(orb: Orb) {
      console.log(orb);
    }
  }
}