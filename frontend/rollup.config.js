import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: './index.ts',
  output: {
    dir: 'build/server',
  },
  plugins: [commonjs(), resolve({ preferBuiltins: true }), json(), typescript({ tsconfig: 'tsconfig.server.json' })]
};
