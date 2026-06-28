if (typeof window === 'undefined') {
  Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true });
}
