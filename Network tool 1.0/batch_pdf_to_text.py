#!/usr/bin/env python3

import PyPDF2
import os
import sys
import glob

def convert_pdf_to_text(pdf_path, output_dir="converted_texts"):
    """Convert a single PDF to text"""
    try:
        # Create output directory if it doesn't exist
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        # Get the base filename without extension
        base_name = os.path.splitext(os.path.basename(pdf_path))[0]
        output_path = os.path.join(output_dir, f"{base_name}.txt")
        
        print(f"\n📄 Converting: {os.path.basename(pdf_path)}")
        
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            
            print(f"   Processing {len(pdf_reader.pages)} pages...")
            
            for page_num, page in enumerate(pdf_reader.pages, 1):
                if page_num % 10 == 0:  # Progress indicator every 10 pages
                    print(f"   Page {page_num}/{len(pdf_reader.pages)}...")
                
                text += f"\n--- Page {page_num} ---\n"
                try:
                    text += page.extract_text()
                except Exception as e:
                    text += f"[Error extracting page {page_num}: {e}]"
                text += "\n"
            
            with open(output_path, 'w', encoding='utf-8') as output_file:
                output_file.write(text)
            
            print(f"   ✅ Saved to: {output_path}")
            return True
            
    except Exception as e:
        print(f"   ❌ Error converting {pdf_path}: {e}")
        return False

def main():
    # Base directory
    base_dir = "/Users/keithperez/Documents/Claud/Network tool 1.0"
    
    # Find all PDF files
    pdf_files = []
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.lower().endswith('.pdf'):
                pdf_files.append(os.path.join(root, file))
    
    print(f"🔍 Found {len(pdf_files)} PDF files to convert:")
    for pdf in pdf_files:
        print(f"   - {os.path.basename(pdf)}")
    
    if not pdf_files:
        print("No PDF files found!")
        return
    
    # Create output directory
    output_dir = os.path.join(base_dir, "converted_texts")
    
    print(f"\n🚀 Starting batch conversion...")
    print(f"📁 Output directory: {output_dir}")
    
    successful = 0
    failed = 0
    
    for pdf_path in pdf_files:
        if convert_pdf_to_text(pdf_path, output_dir):
            successful += 1
        else:
            failed += 1
    
    print(f"\n📊 Conversion Summary:")
    print(f"   ✅ Successful: {successful}")
    print(f"   ❌ Failed: {failed}")
    print(f"   📁 Text files saved in: {output_dir}")

if __name__ == "__main__":
    main()