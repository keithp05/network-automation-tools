#!/usr/bin/env python3

import PyPDF2
import sys
import os

def pdf_to_text(pdf_path, output_path=None):
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            
            print(f"Processing {len(pdf_reader.pages)} pages...")
            
            for page_num, page in enumerate(pdf_reader.pages, 1):
                print(f"Extracting page {page_num}...")
                text += f"\n--- Page {page_num} ---\n"
                text += page.extract_text()
                text += "\n"
            
            if output_path:
                with open(output_path, 'w', encoding='utf-8') as output_file:
                    output_file.write(text)
                print(f"Text saved to: {output_path}")
            else:
                print(text)
                
    except Exception as e:
        print(f"Error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    pdf_file = "/Users/keithperez/Documents/Claud/Network tool 1.0/Network Documents /Arista/CloudEOS_vEOS_Router_Config_Guide.pdf"
    output_file = "/Users/keithperez/Documents/Claud/Network tool 1.0/CloudEOS_vEOS_Router_Config_Guide.txt"
    
    pdf_to_text(pdf_file, output_file)