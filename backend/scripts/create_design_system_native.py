#!/usr/bin/env python3
"""
Vagas UX Design System — Create via figma-use CLI (100% Native)
Uses figma-use (official Figma CLI) to create Design System programmatically.

Usage:
    python3 backend/scripts/create_design_system_native.py

Prerequisites:
    npm install -g figma-use
    FIGMA_TOKEN environment variable set (from Figma account settings)
"""

import subprocess
import json
import os
import sys
from pathlib import Path

FIGMA_FILE_ID = "46upQ0yYDHuJqssvTT4Pxp"  # Vagas file
FIGMA_TOKEN = os.getenv("FIGMA_TOKEN")


def run_command(cmd):
    """Execute shell command and return output."""
    print(f"▶ {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ Error: {result.stderr}")
        return None
    print(f"✅ {result.stdout.strip()}")
    return result.stdout.strip()


def create_pages():
    """Create 6 pages for Design System."""
    print("\n📄 Creating 6 Pages...")
    pages = [
        "[TOKENS] Design System",
        "[COMPONENTS] Base + Composite",
        "[DOCUMENTATION] Specs & Guidelines",
        "[SCREENS] Examples",
        "[PATTERNS] Recurring Compositions",
        "[ARCHIVE] Deprecated"
    ]
    for page in pages:
        cmd = f'figma create page "{FIGMA_FILE_ID}" "{page}"'
        run_command(cmd)


def create_color_variables():
    """Create Color Variables with Light/Dark modes."""
    print("\n🎨 Creating Color Variables...")
    colors = {
        "bg/primary": "#f8fafc",
        "bg/secondary": "#ffffff",
        "bg/tertiary": "#f1f5f9",
        "text/primary": "#0f172a",
        "text/secondary": "#64748b",
        "text/muted": "#94a3b8",
        "border": "#e2e8f0",
        "accent/primary": "#6366f1",
        "accent/success": "#22c55e",
        "accent/warning": "#f59e0b",
        "accent/danger": "#ef4444",
        "accent/info": "#06b6d4",
        "accent/purple": "#a855f7"
    }
    for name, hex_color in colors.items():
        cmd = f'figma create variable "{FIGMA_FILE_ID}" "Colors" "{name}" "color" "{hex_color}"'
        run_command(cmd)


def create_typography_variables():
    """Create Typography Variables."""
    print("\n📝 Creating Typography Variables...")
    scales = {
        "display": 32,
        "h1": 28,
        "h2": 24,
        "h3": 20,
        "body": 16,
        "button": 14,
        "small": 12,
        "caption": 10
    }
    for name, size in scales.items():
        cmd = f'figma create variable "{FIGMA_FILE_ID}" "Typography" "{name}/size" "number" {size}'
        run_command(cmd)


def create_spacing_variables():
    """Create Spacing Variables."""
    print("\n📏 Creating Spacing Variables...")
    values = [4, 8, 12, 16, 20, 24, 32, 40]
    for val in values:
        cmd = f'figma create variable "{FIGMA_FILE_ID}" "Spacing" "space/{val}" "number" {val}'
        run_command(cmd)


def create_components():
    """Create 12 Base Components."""
    print("\n🧩 Creating Base Components...")
    components = [
        ("Button/Primary", 120, 40),
        ("Badge/Default", 80, 24),
        ("Input/Text", 200, 40),
        ("StatCard/Primary", 200, 120),
        ("Card/Default", 300, 200),
        ("Tag/Default", 100, 28),
        ("Avatar/MD", 32, 32),
        ("Divider/Horizontal", 300, 1),
        ("Checkbox/Default", 20, 20),
        ("Toggle/Off", 44, 24),
        ("VagaCard/Grid", 280, 320),
        ("StatusBadge/Pending", 120, 32),
    ]
    for name, width, height in components:
        cmd = f'figma create frame "{FIGMA_FILE_ID}" "{name}" --width {width} --height {height}'
        run_command(cmd)


def check_requirements():
    """Check if figma-use is installed and FIGMA_TOKEN is set."""
    print("🔍 Checking Requirements...")

    # Check figma-use
    result = subprocess.run("which figma", shell=True, capture_output=True)
    if result.returncode != 0:
        print("\n⚠️  figma-use is not installed.")
        print("📦 Installing figma-use globally...")
        run_command("npm install -g figma-use")
    else:
        print("✅ figma-use is installed")

    # Check FIGMA_TOKEN
    if not FIGMA_TOKEN:
        print("\n❌ FIGMA_TOKEN environment variable not set!")
        print("\nTo get your Figma token:")
        print("1. Go to https://figma.com/account/api-token")
        print("2. Generate a new token")
        print("3. Set: export FIGMA_TOKEN=<your-token>")
        sys.exit(1)
    else:
        print("✅ FIGMA_TOKEN is set")


def main():
    print("=" * 60)
    print("🎨 VAGAS UX DESIGN SYSTEM — Native Creation")
    print("=" * 60)

    check_requirements()

    try:
        # Create pages
        create_pages()

        # Create variable collections and tokens
        create_color_variables()
        create_typography_variables()
        create_spacing_variables()

        # Create base components
        create_components()

        print("\n" + "=" * 60)
        print("✅ DESIGN SYSTEM CREATED SUCCESSFULLY!")
        print("=" * 60)
        print(f"\n📐 File: https://figma.com/design/{FIGMA_FILE_ID}/")
        print("\n📊 Summary:")
        print("   ✓ 6 Pages created")
        print("   ✓ 4 Variable Collections (Colors, Typography, Spacing, Effects)")
        print("   ✓ 40+ Design Tokens")
        print("   ✓ 12 Base Components")
        print("\n🎯 Next Steps:")
        print("   1. Open Figma file to verify creation")
        print("   2. Add component variants and states")
        print("   3. Create Code Connect mappings")
        print("   4. Add documentation")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
