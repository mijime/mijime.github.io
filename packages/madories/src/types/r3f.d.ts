/* eslint-disable @typescript-eslint/no-empty-interface, @typescript-eslint/no-empty-object-type */
import type { ReactThreeFiber } from "@react-three/fiber";

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements extends ReactThreeFiber.ThreeElements {}
  }
}
