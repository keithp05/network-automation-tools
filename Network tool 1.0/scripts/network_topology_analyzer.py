#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Script Metadata
# @name: Network Topology Analyzer
# @description: Analyze network topology and find critical paths
# @author: System
# @version: 1.0
# @tags: topology, analysis, paths
# @requires: networkx
# @parameters: []


# @name: Network Topology Analyzer
# @description: Analyze network topology and find critical paths
# @author: System
# @version: 1.0
# @tags: topology, analysis, paths
# @requires: networkx
# @parameters: []

import json

def analyze_topology():
    topology = get_network_topology()
    log_message("Analyzing network topology...")
    
    nodes = topology.get('nodes', [])
    links = topology.get('links', [])
    
    log_message(f"Topology contains {len(nodes)} nodes and {len(links)} links")
    
    # Find nodes with most connections (potential bottlenecks)
    node_connections = {}
    for link in links:
        source = link.get('source')
        target = link.get('target')
        
        node_connections[source] = node_connections.get(source, 0) + 1
        node_connections[target] = node_connections.get(target, 0) + 1
    
    # Sort by connection count
    critical_nodes = sorted(node_connections.items(), key=lambda x: x[1], reverse=True)[:5]
    
    analysis = {
        'total_nodes': len(nodes),
        'total_links': len(links),
        'critical_nodes': [
            {'node': node, 'connections': count} 
            for node, count in critical_nodes
        ],
        'average_connections': sum(node_connections.values()) / len(node_connections) if node_connections else 0
    }
    
    log_message("Critical nodes (most connections):")
    for node, count in critical_nodes:
        log_message(f"  - {node}: {count} connections")
    
    save_result('topology_analysis', analysis)
    return analysis

# Execute analysis
analysis = analyze_topology()
print(f"\nTopology analysis completed. Average connections per node: {analysis['average_connections']:.1f}")
