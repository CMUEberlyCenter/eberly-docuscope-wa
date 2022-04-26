declare module '*.png' {
  const value: any;
  export = value;
}

declare module '*.txt' {
  const content: string;
  export default content;
}
