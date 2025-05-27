// tailwind.config.ts
import type { Config } from 'tailwindcss'; 

const config: Config = { // Declare config as type Config
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config; 