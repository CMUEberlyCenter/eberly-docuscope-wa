declare module '*.png' {
  const value: string;
  export default value;
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

