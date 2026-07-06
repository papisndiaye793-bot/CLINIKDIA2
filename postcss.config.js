import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const here = dirname(fileURLToPath(import.meta.url));

export default {
  plugins: {
    tailwindcss: { config: resolve(here, 'tailwind.config.js') },
    autoprefixer: {},
  },
};
