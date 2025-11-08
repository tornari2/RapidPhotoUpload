#!/usr/bin/env python3
"""
Generate 100 sample photos with varying file sizes averaging 2MB.
Supports JPEG, PNG, and WebP formats.
"""

import os
import random
import math
from PIL import Image, ImageDraw, ImageFont
import numpy as np

def generate_image_with_target_size(target_size_bytes, output_path, format='JPEG'):
    """
    Generate an image that approximates the target file size.
    
    Args:
        target_size_bytes: Target file size in bytes
        output_path: Path to save the image
        format: Image format ('JPEG', 'PNG', 'WEBP')
    """
    # Estimate dimensions needed for target size
    # JPEG: roughly 0.5-2 bytes per pixel depending on quality
    # PNG: varies widely, typically 1-4 bytes per pixel
    # WebP: similar to JPEG
    
    if format == 'JPEG':
        # JPEG compression: quality affects size significantly
        # Start with reasonable dimensions and adjust quality
        base_width = 2000
        base_height = 2000
        
        # Try different quality levels
        for quality in range(95, 60, -5):
            img = Image.new('RGB', (base_width, base_height))
            draw = ImageDraw.Draw(img)
            
            # Create a colorful pattern to increase file size
            for i in range(0, base_width, 50):
                for j in range(0, base_height, 50):
                    color = (
                        random.randint(0, 255),
                        random.randint(0, 255),
                        random.randint(0, 255)
                    )
                    draw.rectangle([i, j, i+50, j+50], fill=color)
            
            # Add some text/graphics to increase complexity
            for _ in range(20):
                x1 = random.randint(0, base_width - 100)
                y1 = random.randint(0, base_height - 100)
                x2 = x1 + random.randint(50, 200)
                y2 = y1 + random.randint(50, 200)
                color = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
                draw.ellipse([x1, y1, x2, y2], fill=color)
            
            temp_path = output_path + '.tmp'
            img.save(temp_path, format='JPEG', quality=quality, optimize=False)
            
            file_size = os.path.getsize(temp_path)
            
            # If we're close enough (within 10%), use it
            if abs(file_size - target_size_bytes) / target_size_bytes < 0.1:
                os.rename(temp_path, output_path)
                return file_size
            
            # If too small, increase dimensions
            if file_size < target_size_bytes * 0.9:
                scale_factor = math.sqrt(target_size_bytes / file_size)
                base_width = int(base_width * scale_factor)
                base_height = int(base_height * scale_factor)
                continue
            
            # If too large but close, adjust quality more finely
            if file_size > target_size_bytes:
                # Try slightly lower quality
                for q in range(quality - 1, max(60, quality - 6), -1):
                    img.save(temp_path, format='JPEG', quality=q, optimize=False)
                    file_size = os.path.getsize(temp_path)
                    if file_size <= target_size_bytes * 1.1:
                        os.rename(temp_path, output_path)
                        return file_size
                # If still too large, reduce dimensions
                scale_factor = math.sqrt(target_size_bytes / file_size)
                base_width = int(base_width * scale_factor)
                base_height = int(base_height * scale_factor)
        
        # Final attempt with calculated dimensions
        img = Image.new('RGB', (base_width, base_height))
        draw = ImageDraw.Draw(img)
        for i in range(0, base_width, 50):
            for j in range(0, base_height, 50):
                color = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
                draw.rectangle([i, j, min(i+50, base_width), min(j+50, base_height)], fill=color)
        
        # Add complexity with ellipses
        for _ in range(20):
            x1 = random.randint(0, max(1, base_width - 100))
            y1 = random.randint(0, max(1, base_height - 100))
            x2 = min(x1 + random.randint(50, 200), base_width)
            y2 = min(y1 + random.randint(50, 200), base_height)
            color = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
            draw.ellipse([x1, y1, x2, y2], fill=color)
        
        img.save(output_path, format='JPEG', quality=85, optimize=False)
        return os.path.getsize(output_path)
    
    elif format == 'PNG':
        # PNG is less compressible, needs more pixels
        base_width = 1500
        base_height = 1500
        
        img = Image.new('RGB', (base_width, base_height))
        draw = ImageDraw.Draw(img)
        
        # Create complex pattern
        for i in range(0, base_width, 30):
            for j in range(0, base_height, 30):
                color = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
                draw.rectangle([i, j, i+30, j+30], fill=color)
        
        img.save(output_path, format='PNG', optimize=False)
        file_size = os.path.getsize(output_path)
        
        # Adjust if needed
        if file_size < target_size_bytes:
            scale = math.sqrt(target_size_bytes / file_size)
            new_width = int(base_width * scale)
            new_height = int(base_height * scale)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            img.save(output_path, format='PNG', optimize=False)
        
        return os.path.getsize(output_path)
    
    elif format == 'WEBP':
        # WebP similar to JPEG
        base_width = 2000
        base_height = 2000
        
        img = Image.new('RGB', (base_width, base_height))
        draw = ImageDraw.Draw(img)
        
        for i in range(0, base_width, 50):
            for j in range(0, base_height, 50):
                color = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
                draw.rectangle([i, j, min(i+50, base_width), min(j+50, base_height)], fill=color)
        
        # Add complexity
        for _ in range(20):
            x1 = random.randint(0, max(1, base_width - 100))
            y1 = random.randint(0, max(1, base_height - 100))
            x2 = min(x1 + random.randint(50, 200), base_width)
            y2 = min(y1 + random.randint(50, 200), base_height)
            color = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
            draw.ellipse([x1, y1, x2, y2], fill=color)
        
        # Try different quality levels
        for quality in range(95, 60, -5):
            img.save(output_path, format='WEBP', quality=quality, method=6)
            file_size = os.path.getsize(output_path)
            if abs(file_size - target_size_bytes) / target_size_bytes < 0.15:
                return file_size
        
        return os.path.getsize(output_path)


def generate_sample_photos(output_dir='sample_photos', num_photos=100, avg_size_mb=2):
    """
    Generate sample photos with varying sizes averaging to the target.
    
    Args:
        output_dir: Directory to save photos
        num_photos: Number of photos to generate
        avg_size_mb: Average file size in MB
    """
    os.makedirs(output_dir, exist_ok=True)
    
    avg_size_bytes = avg_size_mb * 1024 * 1024
    total_size_bytes = avg_size_bytes * num_photos
    
    # Generate sizes using a normal distribution around the average
    # with some variation (std dev of 30% of average)
    std_dev = avg_size_bytes * 0.3
    sizes = np.random.normal(avg_size_bytes, std_dev, num_photos)
    
    # Clamp sizes to reasonable bounds (0.5MB to 4MB to stay within 10MB limit)
    min_size = 0.5 * 1024 * 1024
    max_size = 4 * 1024 * 1024
    sizes = np.clip(sizes, min_size, max_size)
    
    # Adjust to ensure exact average
    current_avg = np.mean(sizes)
    adjustment_factor = avg_size_bytes / current_avg
    sizes = sizes * adjustment_factor
    
    # Format distribution: 70% JPEG, 20% PNG, 10% WebP
    formats = ['JPEG'] * 70 + ['PNG'] * 20 + ['WEBP'] * 10
    random.shuffle(formats)
    
    total_generated = 0
    file_sizes = []
    
    print(f"Generating {num_photos} sample photos averaging {avg_size_mb}MB...")
    print(f"Output directory: {output_dir}\n")
    
    for i in range(num_photos):
        target_size = int(sizes[i])
        format_type = formats[i]
        
        # Determine file extension
        ext_map = {'JPEG': 'jpg', 'PNG': 'png', 'WEBP': 'webp'}
        ext = ext_map[format_type]
        
        filename = f"sample_photo_{i+1:03d}.{ext}"
        output_path = os.path.join(output_dir, filename)
        
        print(f"Generating {i+1}/{num_photos}: {filename} (target: {target_size/1024/1024:.2f}MB, format: {format_type})", end='')
        
        try:
            actual_size = generate_image_with_target_size(target_size, output_path, format_type)
            file_sizes.append(actual_size)
            total_generated += actual_size
            
            actual_mb = actual_size / 1024 / 1024
            print(f" -> {actual_mb:.2f}MB")
        except Exception as e:
            print(f" -> ERROR: {e}")
            if os.path.exists(output_path):
                os.remove(output_path)
    
    # Summary
    print("\n" + "="*60)
    print("Generation Summary:")
    print(f"  Total photos generated: {len(file_sizes)}")
    print(f"  Total size: {total_generated / 1024 / 1024:.2f} MB")
    print(f"  Average size: {np.mean(file_sizes) / 1024 / 1024:.2f} MB")
    print(f"  Min size: {min(file_sizes) / 1024 / 1024:.2f} MB")
    print(f"  Max size: {max(file_sizes) / 1024 / 1024:.2f} MB")
    print(f"  Std deviation: {np.std(file_sizes) / 1024 / 1024:.2f} MB")
    print("="*60)


if __name__ == '__main__':
    import sys
    
    output_dir = sys.argv[1] if len(sys.argv) > 1 else 'sample_photos'
    num_photos = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    avg_size_mb = float(sys.argv[3]) if len(sys.argv) > 3 else 2.0
    
    generate_sample_photos(output_dir, num_photos, avg_size_mb)

