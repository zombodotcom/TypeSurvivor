import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'src/**/*.test.{js,ts,jsx,tsx}',
      'tests/**/*.test.{js,ts,jsx,tsx}'
    ],
    setupFiles: [],
  },
}); 