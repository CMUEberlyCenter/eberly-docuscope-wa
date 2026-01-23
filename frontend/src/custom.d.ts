/// <reference types="vite-plugin-svgr/client" />

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.txt' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: Element<SVGElement>;
  export default content;
}

declare module '*.module.css';
declare module '*.module.scss' {
  const content: Record<string, string>;
  export default content;
}
declare module '*.scss';

declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;
