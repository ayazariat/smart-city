"""
AI Services Main Entry Point
============================

Runs all AI services using uvicorn.

Usage:
    python main.py

This will start:
- Category Predictor: http://localhost:8001
- Keyword Extractor: http://localhost:8002
- SLA Calculator: http://localhost:8003
"""

import subprocess
import sys
import os
import signal
import time

# ANSI colors for terminal output
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
RESET = "\033[0m"

services = []


def start_service(script_path: str, port: int, name: str):
    """Start a service using subprocess"""
    print(f"{GREEN}Starting {name} on port {port}...{RESET}")
    
    proc = subprocess.Popen(
        [sys.executable, script_path],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    services.append({
        "process": proc,
        "name": name,
        "port": port
    })
    
    return proc


def main():
    """Start all AI services"""
    print(f"{GREEN}=== Smart City Tunisia AI Services ==={RESET}\n")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    try:
        # Start Category Predictor
        start_service(
            os.path.join(base_dir, "services/category_predictor.py"),
            8001,
            "Category Predictor"
        )
        time.sleep(1)
        
        # Start Keyword Extractor
        start_service(
            os.path.join(base_dir, "services/keyword_extractor.py"),
            8002,
            "Keyword Extractor"
        )
        time.sleep(1)
        
        # Start SLA Calculator
        start_service(
            os.path.join(base_dir, "services/sla_calculator.py"),
            8003,
            "SLA Calculator"
        )
        
        print(f"\n{GREEN}All services started successfully!{RESET}")
        print(f"\n{YELLOW}Service URLs:{RESET}")
        print(f"  - Category Predictor: http://localhost:8001")
        print(f"  - Keyword Extractor:  http://localhost:8002")
        print(f"  - SLA Calculator:     http://localhost:8003")
        print(f"\n{YELLOW}Press Ctrl+C to stop all services{RESET}\n")
        
        # Wait for all processes
        while True:
            time.sleep(1)
            
            # Check if any process died
            for svc in services:
                retcode = svc["process"].poll()
                if retcode is not None:
                    print(f"{RED}Service {svc['name']} died with code {retcode}{RESET}")
                    
    except KeyboardInterrupt:
        print(f"\n{RED}Shutting down services...{RESET}")
        
        # Stop all services
        for svc in services:
            print(f"Stopping {svc['name']}...")
            svc["process"].terminate()
            try:
                svc["process"].wait(timeout=5)
            except subprocess.TimeoutExpired:
                svc["process"].kill()
        
        print(f"{GREEN}All services stopped.{RESET}")


if __name__ == "__main__":
    main()
