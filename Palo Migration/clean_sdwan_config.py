#!/usr/bin/env python3
"""
Script to remove SD-WAN configurations from Palo Alto candidate config XML
"""
import xml.etree.ElementTree as ET
import sys
from copy import deepcopy

def remove_sdwan_elements(element, parent=None):
    """
    Recursively remove SD-WAN related elements from XML tree
    """
    # List of elements to remove
    elements_to_remove = []
    
    # Check current element
    if element.tag in ['sdwan-link-settings', 'sdwan-interface-profile', 'sdwan', 
                       'sdwan-traffic-distribution', 'sdwan-path-quality', 
                       'sdwan-saas-quality', 'sdwan-error-correction']:
        if parent is not None:
            return True  # Signal parent to remove this element
    
    # Check for SD-WAN related entries by name
    if element.tag == 'entry' and 'name' in element.attrib:
        name = element.attrib['name'].lower()
        if 'sdwan' in name or 'sd-wan' in name:
            if parent is not None:
                return True
    
    # Check for vsys with SD-WAN in display-name
    if element.tag == 'entry' and 'name' in element.attrib:
        for child in element:
            if child.tag == 'display-name' and child.text and 'sdwan' in child.text.lower():
                # This is likely vsys8 (LSC-SDWAN-DNG)
                if parent is not None:
                    return True
    
    # Clean up text content and comments with SD-WAN references
    if element.text and 'sdwan' in element.text.lower():
        element.text = element.text.replace('sdwan', '').replace('SDWAN', '').replace('-', '')
        element.text = element.text.strip()
        if not element.text:
            element.text = None
    
    # Remove comments containing SD-WAN
    if element.tag == 'comment' and element.text and 'sdwan' in element.text.lower():
        if parent is not None:
            return True
    
    # Recursively process children
    for child in list(element):
        if remove_sdwan_elements(child, element):
            elements_to_remove.append(child)
    
    # Remove marked elements
    for child in elements_to_remove:
        element.remove(child)
    
    return False

def clean_sdwan_config(input_file, output_file):
    """
    Main function to clean SD-WAN configurations from XML file
    """
    print(f"Reading configuration from: {input_file}")
    
    # Parse XML
    tree = ET.parse(input_file)
    root = tree.getroot()
    
    # Create a backup of the original
    original_tree = deepcopy(tree)
    
    # Remove SD-WAN elements
    print("Removing SD-WAN configurations...")
    remove_sdwan_elements(root)
    
    # Additional cleanup for specific elements
    # Remove tunnel entries with sdwan in name
    for tunnels in root.iter('tunnel'):
        if tunnels.tag == 'tunnel':
            ipsec = tunnels.find('ipsec')
            if ipsec is not None:
                for entry in list(ipsec.findall('entry')):
                    if 'name' in entry.attrib and 'sdwan' in entry.attrib['name'].lower():
                        ipsec.remove(entry)
                        print(f"Removed tunnel: {entry.attrib['name']}")
    
    # Remove IKE gateways with sdwan in name
    for gateways in root.iter('ike'):
        if gateways.tag == 'ike':
            gateway = gateways.find('gateway')
            if gateway is not None:
                for entry in list(gateway.findall('entry')):
                    if 'name' in entry.attrib and 'sdwan' in entry.attrib['name'].lower():
                        gateway.remove(entry)
                        print(f"Removed IKE gateway: {entry.attrib['name']}")
    
    # Remove IPSec crypto profiles with sdwan in name
    for crypto in root.iter('ipsec-crypto-profiles'):
        if crypto.tag == 'ipsec-crypto-profiles':
            for profile_type in ['ike-crypto-profiles', 'ipsec-crypto-profiles']:
                profiles = crypto.find(profile_type)
                if profiles is not None:
                    for entry in list(profiles.findall('entry')):
                        if 'name' in entry.attrib and 'sdwan' in entry.attrib['name'].lower():
                            profiles.remove(entry)
                            print(f"Removed crypto profile: {entry.attrib['name']}")
    
    # Write cleaned configuration
    print(f"Writing cleaned configuration to: {output_file}")
    tree.write(output_file, encoding='utf-8', xml_declaration=True)
    
    # Verify changes
    print("\nVerification:")
    print("- Checking for remaining SD-WAN references...")
    
    # Read the output file and check for SD-WAN references
    with open(output_file, 'r') as f:
        content = f.read()
        sdwan_count = content.lower().count('sdwan')
        if sdwan_count > 0:
            print(f"  WARNING: Found {sdwan_count} remaining SD-WAN references")
        else:
            print("  SUCCESS: No SD-WAN references found in cleaned config")
    
    print("\nCleaning complete!")
    print(f"Original file: {input_file}")
    print(f"Cleaned file: {output_file}")

if __name__ == "__main__":
    input_file = "candidate-config.xml"
    output_file = "candidate-config-cleaned.xml"
    
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    
    try:
        clean_sdwan_config(input_file, output_file)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)