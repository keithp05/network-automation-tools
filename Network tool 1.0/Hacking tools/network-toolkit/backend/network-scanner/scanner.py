#!/usr/bin/env python3

import asyncio
import ipaddress
import socket
import struct
import time
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import aiohttp
import aiodns
import logging

logger = logging.getLogger(__name__)

class ScanType(Enum):
    PING = "ping"
    TCP_SYN = "tcp_syn"
    TCP_CONNECT = "tcp_connect"
    UDP = "udp"
    SERVICE = "service"
    OS_DETECT = "os_detect"

@dataclass
class ScanResult:
    ip: str
    hostname: Optional[str] = None
    mac_address: Optional[str] = None
    open_ports: List[int] = None
    services: Dict[int, str] = None
    os_guess: Optional[str] = None
    response_time: Optional[float] = None
    timestamp: float = None

class NetworkScanner:
    """High-performance async network scanner"""
    
    def __init__(self, max_concurrent: int = 100):
        self.max_concurrent = max_concurrent
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.resolver = aiodns.DNSResolver()
        
    async def scan_network(self, 
                          target: str, 
                          scan_types: List[ScanType],
                          ports: Optional[List[int]] = None) -> List[ScanResult]:
        """Scan network with specified scan types"""
        try:
            network = ipaddress.ip_network(target, strict=False)
        except ValueError:
            network = [ipaddress.ip_address(target)]
        
        tasks = []
        for ip in network:
            task = self._scan_host(str(ip), scan_types, ports)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        return [r for r in results if isinstance(r, ScanResult)]
    
    async def _scan_host(self, 
                        ip: str, 
                        scan_types: List[ScanType],
                        ports: Optional[List[int]]) -> Optional[ScanResult]:
        """Scan individual host"""
        async with self.semaphore:
            start_time = time.time()
            result = ScanResult(ip=ip, timestamp=time.time())
            
            if ScanType.PING in scan_types:
                is_alive = await self._ping_scan(ip)
                if not is_alive:
                    return None
            
            result.response_time = time.time() - start_time
            
            try:
                result.hostname = await self._reverse_dns(ip)
            except Exception:
                pass
            
            if ScanType.TCP_CONNECT in scan_types and ports:
                result.open_ports = await self._tcp_connect_scan(ip, ports)
            
            if ScanType.SERVICE in scan_types and result.open_ports:
                result.services = await self._service_detection(ip, result.open_ports)
            
            if ScanType.OS_DETECT in scan_types and result.open_ports:
                result.os_guess = await self._os_fingerprint(ip, result.open_ports)
            
            return result
    
    async def _ping_scan(self, ip: str) -> bool:
        """Check if host is alive using multiple methods"""
        methods = [
            self._tcp_ping(ip, 80),
            self._tcp_ping(ip, 443),
            self._tcp_ping(ip, 22),
            self._tcp_ping(ip, 445),
        ]
        
        results = await asyncio.gather(*methods, return_exceptions=True)
        return any(r for r in results if r is True)
    
    async def _tcp_ping(self, ip: str, port: int) -> bool:
        """TCP ping to check host"""
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(ip, port),
                timeout=2.0
            )
            writer.close()
            await writer.wait_closed()
            return True
        except Exception:
            return False
    
    async def _tcp_connect_scan(self, ip: str, ports: List[int]) -> List[int]:
        """TCP connect scan for open ports"""
        open_ports = []
        
        async def check_port(port: int) -> Optional[int]:
            try:
                reader, writer = await asyncio.wait_for(
                    asyncio.open_connection(ip, port),
                    timeout=1.0
                )
                writer.close()
                await writer.wait_closed()
                return port
            except Exception:
                return None
        
        tasks = [check_port(port) for port in ports]
        results = await asyncio.gather(*tasks)
        
        return [p for p in results if p is not None]
    
    async def _service_detection(self, ip: str, ports: List[int]) -> Dict[int, str]:
        """Detect services on open ports"""
        services = {}
        
        service_probes = {
            21: (b"", "ftp"),
            22: (b"", "ssh"),
            25: (b"HELO test\\r\\n", "smtp"),
            80: (b"GET / HTTP/1.0\\r\\n\\r\\n", "http"),
            110: (b"", "pop3"),
            143: (b"", "imap"),
            443: (b"", "https"),
            3306: (b"", "mysql"),
            5432: (b"", "postgresql"),
        }
        
        for port in ports:
            if port in service_probes:
                probe, default_service = service_probes[port]
                service = await self._grab_banner(ip, port, probe)
                services[port] = service or default_service
            else:
                services[port] = "unknown"
        
        return services
    
    async def _grab_banner(self, ip: str, port: int, probe: bytes) -> Optional[str]:
        """Grab service banner"""
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(ip, port),
                timeout=2.0
            )
            
            if probe:
                writer.write(probe)
                await writer.drain()
            
            data = await asyncio.wait_for(reader.read(1024), timeout=2.0)
            writer.close()
            await writer.wait_closed()
            
            banner = data.decode('utf-8', errors='ignore').strip()
            
            if 'SSH' in banner:
                return f"ssh ({banner.split()[0]})"
            elif 'HTTP' in banner:
                return "http"
            elif 'FTP' in banner or '220' in banner:
                return "ftp"
            elif 'SMTP' in banner or '220' in banner:
                return "smtp"
            
            return banner[:50] if banner else None
            
        except Exception:
            return None
    
    async def _os_fingerprint(self, ip: str, open_ports: List[int]) -> Optional[str]:
        """Basic OS fingerprinting based on port signatures"""
        port_signatures = {
            (22, 80, 443): "Linux/Unix",
            (135, 139, 445): "Windows",
            (22, 111, 2049): "Linux NFS Server",
            (80, 443, 3306): "Linux Web Server",
            (135, 445, 3389): "Windows Server",
            (22, 548): "macOS",
        }
        
        open_set = set(open_ports)
        
        for ports, os_type in port_signatures.items():
            if all(p in open_set for p in ports):
                return os_type
        
        if 22 in open_set:
            return "Unix-like"
        elif 135 in open_set or 445 in open_set:
            return "Windows"
        
        return "Unknown"
    
    async def _reverse_dns(self, ip: str) -> Optional[str]:
        """Perform reverse DNS lookup"""
        try:
            result = await self.resolver.gethostbyaddr(ip)
            return result.name
        except Exception:
            return None

class ThroughputTester:
    """Network throughput testing using iperf3 protocol concepts"""
    
    def __init__(self):
        self.test_duration = 10
        self.parallel_streams = 5
        
    async def bandwidth_test(self, 
                            server: str, 
                            port: int = 5201,
                            duration: int = 10) -> Dict[str, Any]:
        """Perform bandwidth test"""
        results = {
            'server': server,
            'port': port,
            'duration': duration,
            'timestamp': time.time(),
            'upload': {},
            'download': {}
        }
        
        try:
            upload_result = await self._test_upload(server, port, duration)
            download_result = await self._test_download(server, port, duration)
            
            results['upload'] = upload_result
            results['download'] = download_result
            
        except Exception as e:
            results['error'] = str(e)
        
        return results
    
    async def _test_upload(self, server: str, port: int, duration: int) -> Dict[str, float]:
        """Test upload bandwidth"""
        total_bytes = 0
        start_time = time.time()
        test_data = b'X' * 8192
        
        try:
            reader, writer = await asyncio.open_connection(server, port)
            
            while time.time() - start_time < duration:
                writer.write(test_data)
                await writer.drain()
                total_bytes += len(test_data)
            
            writer.close()
            await writer.wait_closed()
            
            elapsed = time.time() - start_time
            bandwidth_mbps = (total_bytes * 8) / (elapsed * 1_000_000)
            
            return {
                'bandwidth_mbps': round(bandwidth_mbps, 2),
                'bytes_sent': total_bytes,
                'duration': elapsed
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    async def _test_download(self, server: str, port: int, duration: int) -> Dict[str, float]:
        """Test download bandwidth"""
        total_bytes = 0
        start_time = time.time()
        
        try:
            reader, writer = await asyncio.open_connection(server, port)
            
            writer.write(b'DOWNLOAD_TEST\\n')
            await writer.drain()
            
            while time.time() - start_time < duration:
                data = await reader.read(8192)
                if not data:
                    break
                total_bytes += len(data)
            
            writer.close()
            await writer.wait_closed()
            
            elapsed = time.time() - start_time
            bandwidth_mbps = (total_bytes * 8) / (elapsed * 1_000_000)
            
            return {
                'bandwidth_mbps': round(bandwidth_mbps, 2),
                'bytes_received': total_bytes,
                'duration': elapsed
            }
            
        except Exception as e:
            return {'error': str(e)}