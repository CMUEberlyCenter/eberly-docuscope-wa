declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.txt' {
  const content: string;
  export default content;
}

declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;
