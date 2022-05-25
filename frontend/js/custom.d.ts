declare module '*.png' {
  const value: any;
  export = value;
}

declare module '*.txt' {
  const content: string;
  export default content;
}

type apiCall = (
  call: string,
  data: unknown,
  method: 'POST' | 'GET'
) => Promise<unknown>;
