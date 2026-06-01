import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // Bump up base sizes slightly
        xs:   ['0.75rem',  { lineHeight: '1.125rem' }],
        sm:   ['0.875rem', { lineHeight: '1.375rem' }],
        base: ['1rem',     { lineHeight: '1.625rem' }],
        lg:   ['1.125rem', { lineHeight: '1.75rem'  }],
        xl:   ['1.25rem',  { lineHeight: '1.875rem' }],
        '2xl':['1.5rem',   { lineHeight: '2rem'     }],
        '3xl':['1.875rem', { lineHeight: '2.375rem' }],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
