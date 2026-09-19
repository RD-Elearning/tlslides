# Inter Font Files

This directory should contain the Inter font files for accurate text metrics.

## Required Files

Place one of the following font files in this directory:

1. **Option A: Variable Font (Recommended)**
   - `Inter-VariableFont_wght.woff2` - The variable font file

2. **Option B: Individual Weight Files**
   - `Inter-Regular.ttf`
   - `Inter-Medium.ttf`
   - `Inter-SemiBold.ttf`
   - `Inter-Bold.ttf`
   - `Inter-ExtraBold.ttf`

## Download Instructions

### From Google Fonts
1. Visit https://fonts.google.com/specimen/Inter
2. Click "Download family"
3. Extract the zip file
4. Copy the desired files to this directory

### From Official Repository
1. Visit https://github.com/rsms/inter
2. The `dist/ttf/` or `dist/woff2/` directories contain the font files

## Why This Matters

The block layout system uses per-character advance-width tables to calculate text dimensions.
For accurate measurements that match what browsers render, you need:

1. The actual glyph metrics from the font file
2. Running the generation script to create the advance-width table
3. Loading the same font in the browser so measurements match rendering

## Next Steps

After adding the font file:

1. Run the generation script:
   ```bash
   cd /home/bachx/workspace/vinhuni/tlslides
   node tools/fonts/gen-metrics.js examples/nextjs-sample/public/fonts/Inter-VariableFont_wght.woff2 \
     packages/tldraw/src/blocks/layout/inter-generated.ts
   ```

2. Update `layout.tsx` to load the font:
   ```typescript
   const inter = localFont({
     src: [
       { path: './fonts/Inter-VariableFont_wght.woff2', weight: '100 900', style: 'normal' },
     ],
     variable: '--font-inter',
     display: 'swap',
   })
   ```

3. Update `measure.ts` to import the generated table:
   ```typescript
   import { ADVANCE_WIDTH_TABLES } from './inter-generated'
   ```

## License

Inter is aISC licensed font (SIL Open Font License 1.1).
See: https://github.com/rsms/inter/blob/master/LICENSE