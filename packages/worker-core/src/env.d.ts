declare module '*.wasm?url' {
  const url: string;
  export default url;
}

declare module '*.wasm' {
  const init: any;
  export default init;
}
