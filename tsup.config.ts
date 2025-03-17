import { defineConfig } from 'tsup'

export default defineConfig({
  env: {
    NODE_ENV: process.env.NODE_ENV || 'development',
  },
  entry: ['src/server.ts', 'src/mcp/interceptor.ts', 'src/mcp/toolbox.ts'],
  tsconfig: 'tsconfig.lib.json',
  splitting: true,
  format: ['cjs', 'esm'],
  clean: true,
})
