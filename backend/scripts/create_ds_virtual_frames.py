#!/usr/bin/env python3
"""
Vagas UX Design System — Virtual Frames Generator
Creates placeholder frames that REPRESENT variables and components
in Figma, since actual Variable Collections API is blocked.

This approach:
1. Creates Frame group for each collection (Colors, Typography, etc)
2. Each frame shows the token name, type, and value
3. Can be easily converted to real Variables/Components later
4. 100% automated with Code to Canvas

Output: HTML that can be injected directly into Figma
"""

import json
import textwrap

# Color tokens
COLORS = {
    "light": {
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
    },
    "dark": {
        "bg/primary": "#0f0f12",
        "bg/secondary": "#1a1a1f",
        "bg/tertiary": "#252529",
        "text/primary": "#ffffff",
        "text/secondary": "#a1a1aa",
        "text/muted": "#71717a",
        "border": "#2e2e33"
    }
}

# Typography tokens
TYPOGRAPHY = {
    "display": 32,
    "h1": 28,
    "h2": 24,
    "h3": 20,
    "body": 16,
    "button": 14,
    "small": 12,
    "caption": 10
}

# Spacing tokens
SPACING = [4, 8, 12, 16, 20, 24, 32, 40]

# Effects
EFFECTS = {
    "shadow/glow-primary": "0 4px 8px rgba(0,0,0,0.1)",
    "shadow/glow-success": "0 4px 12px rgba(34,197,94,0.2)",
    "shadow/glow-info": "0 4px 12px rgba(6,182,212,0.2)"
}

# Components
COMPONENTS = [
    {"name": "Button/Primary", "w": 120, "h": 40, "color": "#6366f1"},
    {"name": "Badge/Default", "w": 80, "h": 24, "color": "#22c55e"},
    {"name": "Input/Text", "w": 200, "h": 40, "color": "#ffffff", "border": "#e2e8f0"},
    {"name": "StatCard/Primary", "w": 200, "h": 120, "color": "#f2f2f3"},
    {"name": "Card/Default", "w": 300, "h": 200, "color": "#ffffff"},
    {"name": "Tag/Default", "w": 100, "h": 28, "color": "#faf5f0"},
    {"name": "Avatar/MD", "w": 32, "h": 32, "color": "#6366f1"},
    {"name": "Divider/Horizontal", "w": 300, "h": 1, "color": "#e2e8f0"},
    {"name": "Checkbox/Default", "w": 20, "h": 20, "color": "#ffffff"},
    {"name": "Toggle/Off", "w": 44, "h": 24, "color": "#e2e8f0"},
    {"name": "VagaCard/Grid", "w": 280, "h": 320, "color": "#ffffff"},
    {"name": "StatusBadge/Pending", "w": 120, "h": 32, "color": "#f59e0b"}
]

def generate_color_frames_html():
    """Generate HTML frames for color tokens"""
    html = '<div style="padding: 20px;">\n'
    html += '<h2>🎨 Color Tokens (Variables)</h2>\n'
    html += '<h3>Light Mode</h3>\n'

    for name, color in COLORS["light"].items():
        html += f'''
<div style="display: flex; gap: 12px; margin: 8px 0; align-items: center;">
    <div style="width: 60px; height: 40px; background-color: {color}; border: 1px solid #ccc; border-radius: 4px;"></div>
    <div>
        <strong>{name}</strong>
        <br/>
        <code>{color}</code>
    </div>
</div>
'''

    html += '<h3>Dark Mode</h3>\n'
    for name, color in COLORS["dark"].items():
        html += f'''
<div style="display: flex; gap: 12px; margin: 8px 0; align-items: center;">
    <div style="width: 60px; height: 40px; background-color: {color}; border: 1px solid #666; border-radius: 4px;"></div>
    <div style="color: white;">
        <strong>{name}</strong>
        <br/>
        <code>{color}</code>
    </div>
</div>
'''

    html += '</div>'
    return html

def generate_typography_frames_html():
    """Generate HTML frames for typography tokens"""
    html = '<div style="padding: 20px;">\n'
    html += '<h2>📝 Typography Tokens (Variables)</h2>\n'

    for name, size in TYPOGRAPHY.items():
        html += f'''
<div style="margin: 16px 0;">
    <div style="font-size: {size}px; font-weight: 600; margin-bottom: 4px;">{name.upper()}</div>
    <code style="font-size: 12px; color: #666;">{size}px</code>
</div>
'''

    html += '</div>'
    return html

def generate_spacing_frames_html():
    """Generate HTML frames for spacing tokens"""
    html = '<div style="padding: 20px;">\n'
    html += '<h2>📏 Spacing Tokens (Variables)</h2>\n'
    html += '<div style="display: flex; flex-wrap: wrap; gap: 12px;">\n'

    for value in SPACING:
        html += f'''
<div style="display: flex; flex-direction: column; align-items: center;">
    <div style="width: {value * 2}px; height: {value * 2}px; background-color: #6366f1; margin-bottom: 8px;"></div>
    <code style="font-size: 12px;">{value}px</code>
</div>
'''

    html += '</div>\n</div>'
    return html

def generate_effects_frames_html():
    """Generate HTML frames for effect tokens"""
    html = '<div style="padding: 20px;">\n'
    html += '<h2>✨ Effect Tokens (Variables)</h2>\n'

    for name, shadow in EFFECTS.items():
        html += f'''
<div style="margin: 16px 0;">
    <div style="width: 200px; height: 40px; background-color: white; border-radius: 4px; box-shadow: {shadow}; margin-bottom: 8px;"></div>
    <strong>{name}</strong>
    <br/>
    <code style="font-size: 12px;">{shadow}</code>
</div>
'''

    html += '</div>'
    return html

def generate_components_frames_html():
    """Generate HTML frames for components"""
    html = '<div style="padding: 20px;">\n'
    html += '<h2>🔧 Components (Base + Composite)</h2>\n'
    html += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">\n'

    for comp in COMPONENTS:
        border_style = f"border: 1px solid {comp.get('border', '#ccc')};" if comp.get('border') else ""
        html += f'''
<div style="display: flex; flex-direction: column; align-items: center; padding: 12px; background-color: #f5f5f5; border-radius: 4px;">
    <div style="width: {comp['w']}px; height: {comp['h']}px; background-color: {comp['color']}; {border_style}border-radius: 4px; margin-bottom: 8px;"></div>
    <code style="font-size: 11px; text-align: center;">{comp['name']}</code>
    <code style="font-size: 10px; color: #999;">{comp['w']}×{comp['h']}</code>
</div>
'''

    html += '</div>\n</div>'
    return html

def main():
    print("=" * 70)
    print("🎨 VAGAS UX DESIGN SYSTEM — Virtual Frames HTML Generator")
    print("=" * 70)
    print("")
    print("Gerando frames virtuais para todo o Design System...")
    print("")

    # Generate all HTML sections
    html_all = f"""<!DOCTYPE html>
<html>
<head>
    <title>Vagas UX Design System — Virtual Tokens & Components</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #fafafa; }}
        h1 {{ text-align: center; color: #333; }}
        h2 {{ color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }}
        h3 {{ color: #666; }}
        code {{ background-color: #f0f0f0; padding: 2px 6px; border-radius: 2px; font-family: monospace; }}
        .section {{ background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
    </style>
</head>
<body>
    <h1>🎨 Vagas UX Design System — Virtual Frames</h1>
    <p style="text-align: center; color: #666;">
        Este documento contém frames que REPRESENTAM variáveis e componentes.
        <br/>
        <strong>Próximo passo:</strong> Converter para Variable Collections e Components oficiais no Figma.
    </p>

    <div class="section">
{generate_color_frames_html()}
    </div>

    <div class="section">
{generate_typography_frames_html()}
    </div>

    <div class="section">
{generate_spacing_frames_html()}
    </div>

    <div class="section">
{generate_effects_frames_html()}
    </div>

    <div class="section">
{generate_components_frames_html()}
    </div>

    <div class="section" style="background: #f0f7ff;">
        <h2>📊 Summary</h2>
        <ul>
            <li><strong>Color Tokens:</strong> 13 light mode + 8 dark mode = 21 variables</li>
            <li><strong>Typography Tokens:</strong> 8 scales</li>
            <li><strong>Spacing Tokens:</strong> 8 values</li>
            <li><strong>Effect Tokens:</strong> 3 shadows</li>
            <li><strong>Components:</strong> 12 base components</li>
            <li><strong>Total:</strong> 52 design system assets represented</li>
        </ul>

        <h3>Next Steps (Manual):</h3>
        <ol>
            <li>Abrir Figma Desktop</li>
            <li>Para cada frame acima, criar a Variable Collection ou Component oficial</li>
            <li>Ou: contatar Figma support para desbloquear remote debugging v126+</li>
            <li>Ou: esperar figma-use v0.14+ que tenha suporte para Figma 126+</li>
        </ol>
    </div>
</body>
</html>"""

    # Write to file
    output_file = "/Volumes/vagato/design_system_virtual_frames.html"
    with open(output_file, "w") as f:
        f.write(html_all)

    print(f"✅ HTML gerado: {output_file}")
    print("")
    print("📊 Summary:")
    print(f"  • Color Tokens: {len(COLORS['light'])} light + {len(COLORS['dark'])} dark = {len(COLORS['light']) + len(COLORS['dark'])} variables")
    print(f"  • Typography: {len(TYPOGRAPHY)} scales")
    print(f"  • Spacing: {len(SPACING)} values")
    print(f"  • Effects: {len(EFFECTS)} shadows")
    print(f"  • Components: {len(COMPONENTS)} base components")
    print(f"  • TOTAL: {len(COLORS['light']) + len(COLORS['dark']) + len(TYPOGRAPHY) + len(SPACING) + len(EFFECTS) + len(COMPONENTS)} design system assets")
    print("")
    print("📝 Este arquivo HTML pode ser:")
    print("   1. Aberto no navegador para visualizar tudo")
    print("   2. Injetado no Figma via Code to Canvas")
    print("   3. Servir como referência para criar as Variables/Components oficiais")
    print("")

if __name__ == "__main__":
    main()
