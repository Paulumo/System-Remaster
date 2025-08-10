# HOGE Chart Background Setup

To use the actual PDF as a background for the HOGE chart generator, you need to convert the PDF to a PNG image.

## Option 1: Manual Conversion (Recommended)

1. Open `Figure S5-32 HOGE.pdf` in a PDF viewer
2. Export/Save as PNG with these settings:
   - Resolution: 300 DPI or higher
   - Size: A4 (595 x 842 pixels at 72 DPI)
   - Format: PNG
3. Save the file as `Figure_S5-32_HOGE.png` in this same directory

## Option 2: Automated Conversion (Experimental)

Run the conversion script:
```bash
npm run convert:pdf
```

## Fallback

If no PNG background is found, the chart generator will create a synthetic background that closely matches the original PDF chart.

## File Structure

```
HOGE/
├── Figure S5-32 HOGE.pdf          # Original RFM chart (required)
├── Figure_S5-32_HOGE.png          # Converted background (optional)
└── README.md                      # This file
```