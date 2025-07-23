# WebP Image Conversion Guide

## Overview
The checkout page is configured to use WebP images for better performance, but the actual WebP files need to be generated from the PNG source images.

## Current Setup
- HTML includes `<picture>` elements with WebP sources
- Placeholder WebP files have been created to prevent 404 errors
- Service Worker is configured to cache both PNG and WebP versions

## To Generate Real WebP Images

### Option 1: Using cwebp (Recommended)
```bash
# Install webp tools
brew install webp  # macOS
# or
sudo apt-get install webp  # Linux

# Run the conversion script
cd /Users/nova/Sites/webseeds-checkout/public
./convert-to-webp.sh
```

### Option 2: Using an Online Converter
1. Visit https://cloudconvert.com/png-to-webp
2. Upload these PNG files:
   - assets/images/6-bottles.png
   - assets/images/bonus-ebooks.png
   - assets/images/bonus-call.png
   - assets/images/olivia.png
   - assets/images/emily.png
   - assets/images/money-back.png
3. Set quality to 85%
4. Download and place in assets/images/ with same names but .webp extension

### Option 3: Using ImageMagick
```bash
# Install ImageMagick
brew install imagemagick

# Convert images
cd /Users/nova/Sites/webseeds-checkout/public/assets/images
for img in *.png; do
    convert "$img" -quality 85 "${img%.png}.webp"
done
```

### Option 4: Using Node.js Package
```bash
# Install sharp
npm install -g sharp-cli

# Convert images
cd /Users/nova/Sites/webseeds-checkout/public/assets/images
for img in *.png; do
    sharp -i "$img" -o "${img%.png}.webp" -q 85
done
```

## Expected File Sizes
- 6-bottles.png (20.3KB) → ~4KB WebP
- olivia.png (35.2KB) → ~5KB WebP
- money-back.png (40.6KB) → ~10KB WebP
- emily.png (31.4KB) → ~4KB WebP
- bonus-ebooks.png → ~3-5KB WebP
- bonus-call.png → ~3-5KB WebP

## Benefits
- 80-90% file size reduction
- Faster page loads
- Better PageSpeed scores
- Automatic fallback to PNG for older browsers

## Note
The placeholder WebP files currently in place are empty (0 bytes). They prevent 404 errors but don't provide the performance benefits. Replace them with properly converted WebP images for full optimization.