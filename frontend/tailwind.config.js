/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "tertiary-container": "#8592a3",
        "surface-container-high": "#232a34",
        "on-tertiary-fixed-variant": "#3c4857",
        "surface-variant": "#2e353f",
        "primary": "#b8c4ff",
        "outline": "#8e90a0",
        "secondary-container": "#2aa196",
        "error": "#ffb4ab",
        "secondary-fixed": "#89f5e8",
        "surface-bright": "#333a44",
        "inverse-on-surface": "#2a313b",
        "tertiary": "#bbc7da",
        "on-secondary": "#003733",
        "tertiary-fixed-dim": "#bbc7da",
        "primary-fixed": "#dde1ff",
        "surface-container-highest": "#2e353f",
        "on-primary-fixed": "#001453",
        "on-primary-container": "#001f75",
        "on-surface-variant": "#c4c5d6",
        "on-surface": "#dce3f0",
        "surface-dim": "#0d141d",
        "on-primary-fixed-variant": "#0337b8",
        "surface-container": "#192029",
        "primary-fixed-dim": "#b8c4ff",
        "on-tertiary-fixed": "#101c2a",
        "on-error-container": "#ffdad6",
        "secondary": "#6cd8cc",
        "on-secondary-fixed": "#00201d",
        "inverse-primary": "#2f52d0",
        "on-secondary-fixed-variant": "#00504a",
        "outline-variant": "#444654",
        "error-container": "#93000a",
        "on-error": "#690005",
        "on-tertiary-container": "#1f2b39",
        "on-background": "#dce3f0",
        "inverse-surface": "#dce3f0",
        "primary-container": "#6b89ff",
        "secondary-fixed-dim": "#6cd8cc",
        "background": "#0d141d",
        "tertiary-fixed": "#d7e3f7",
        "surface-container-lowest": "#080f17",
        "on-tertiary": "#253140",
        "on-primary": "#002585",
        "on-secondary-container": "#00302c",
        "surface-container-low": "#151c25",
        "surface": "#0d141d",
        "surface-tint": "#b8c4ff",
        // Keep old midnight for compatibility during migration
        midnight: {
          bg: '#0d141d',
          surface: '#192029',
          border: '#2a313c',
          text: '#e2e8f0',
          muted: '#94a3b8'
        }
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      spacing: {
        "container-max": "1440px",
        "gutter": "1.5rem",
        "unit": "4px",
        "margin": "2rem"
      },
      fontFamily: {
        "plus-jakarta": ["Plus Jakarta Sans", "sans-serif"],
        "label-md": ["Plus Jakarta Sans"],
        "label-sm": ["Plus Jakarta Sans"],
        "headline-sm": ["Plus Jakarta Sans"],
        "body-lg": ["Plus Jakarta Sans"],
        "headline-lg": ["Plus Jakarta Sans"],
        "body-md": ["Plus Jakarta Sans"],
        "headline-md": ["Plus Jakarta Sans"]
      },
      fontSize: {
        "label-md": ["12px", { "lineHeight": "16px", "letterSpacing": "0.02em", "fontWeight": "600" }],
        "label-sm": ["11px", { "lineHeight": "14px", "letterSpacing": "0.03em", "fontWeight": "500" }],
        "headline-sm": ["20px", { "lineHeight": "28px", "fontWeight": "600" }],
        "body-lg": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
        "headline-lg": ["30px", { "lineHeight": "38px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "body-md": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
        "headline-md": ["24px", { "lineHeight": "32px", "letterSpacing": "-0.01em", "fontWeight": "600" }]
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
