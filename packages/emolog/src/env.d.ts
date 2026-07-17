/// <reference types="vite/client" />

// Extend React JSX types for emoji-picker web component
declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      "emoji-picker": any;
    }
  }
}
