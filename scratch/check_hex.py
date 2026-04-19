
import sys

with open('src/lib/o2d-sheets.ts', 'rb') as f:
    content = f.read()
    print(f"File size: {len(content)} bytes")
    # Check for BOM
    if content.startswith(b'\xef\xbb\xbf'):
        print("BOM detected")
    
    # Print lines 60-70 with hex representation
    lines = content.split(b'\n')
    for i in range(58, 68):
        if i < len(lines):
            print(f"Line {i+1}: {repr(lines[i])}")
