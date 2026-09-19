# Font Metrics Generation

This directory contains tools for generating per-glyph advance-width tables from font files.

## Files

- `gen-metrics.js` - Node.js script using opentype.js
- `gen-metrics-py.py` - Python script using fonttools (more accurate)

## How to Generate Metrics

### Option 1: Using opentype.js (Node.js)

```bash
# Install opentype.js if not already installed
npm install opentype.js --save-dev

# Generate metrics from a font file
node tools/fonts/gen-metrics.js <path-to-font.ttf> \
  packages/tldraw/src/blocks/layout/inter-generated.ts
```

### Option 2: Using fonttools (Python) - Recommended

```bash
# Install fonttools
pip install fonttools

# Generate metrics
python tools/fonts/gen-metrics-py.py <path-to-font.ttf> \
  packages/tldraw/src/blocks/layout/inter-generated.ts
```

## Obtaining Inter Font

You can download the Inter font from:
- Google Fonts: https://fonts.google.com/specimen/Inter
- Official repo: https://github.com/rsms/inter

For self-hosting (recommended for the demo), download the woff2 files:
- Inter-VariableFont_wght.woff2
- Or individual weight files (Inter-Regular.ttf, Inter-Medium.ttf, etc.)

## Integration

Once generated, update `measure.ts` to import the generated table:

```typescript
import { ADVANCE_WIDTH_TABLES } from './inter-generated'

// Merge with existing tables (or replace the 'inter' key)
```

Or update `tableFaceKey()` in `measure.ts` to detect the font family and use the appropriate table.

## Target Characters

The generated table includes:
- A-Z, a-z, 0-9
- Common punctuation: . , : ; ! ? ' " - – — ( ) [ ] { } / \ @ # $ % & * + = < > ~ ^ _ | `
- Space character

## Notes

- The generated widths are in em units (relative to font size)
- Default width is the average of all characters
- Missing characters fall back to the default width