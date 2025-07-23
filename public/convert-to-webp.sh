#!/bin/bash

# Script to convert PNG images to WebP format for better performance
# Requires: webp tools (brew install webp on macOS, apt-get install webp on Linux)

echo "Converting PNG images to WebP format..."

# Check if cwebp is installed
if ! command -v cwebp &> /dev/null; then
    echo "cwebp command not found. Please install webp tools:"
    echo "  macOS: brew install webp"
    echo "  Linux: sudo apt-get install webp"
    exit 1
fi

# Convert images
cd assets/images/

# Convert PNG images with high quality
for file in olivia.png emily.png money-back.png 6-bottles.png bonus-ebooks.png bonus-call.png; do
    if [ -f "$file" ]; then
        echo "Converting $file..."
        cwebp -q 85 "$file" -o "${file%.png}.webp"
        
        # Show size comparison
        original_size=$(ls -lh "$file" | awk '{print $5}')
        webp_size=$(ls -lh "${file%.png}.webp" | awk '{print $5}')
        echo "  Original: $original_size → WebP: $webp_size"
    else
        echo "Warning: $file not found"
    fi
done

echo ""
echo "Conversion complete! WebP images created:"
ls -lh *.webp 2>/dev/null || echo "No WebP files created"

echo ""
echo "To use these images, the HTML already includes <picture> elements with WebP sources."
echo "Browsers that support WebP will automatically use the smaller files."