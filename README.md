# flooring-calculator-plugin

WordPress plugin that exposes the `[flooring_calculator]` shortcode.

## Build

The runtime uses Babel in the browser, but the repository includes a small build step that copies the source JSX into the enqueued asset file:

```bash
npm run build
```

This ensures `assets/flooring-calculator.js` is available for WordPress to load.
