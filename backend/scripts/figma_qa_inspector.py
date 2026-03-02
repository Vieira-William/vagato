#!/usr/bin/env python3
"""
Figma QA Inspector - Reads back structure from Figma and exports as PNG for comparison.
"""
import json
import urllib.request
import sys
import base64
import os

FIGMA_BRIDGE_URL = "http://localhost:9999/execute"
OUTPUT_DIR = "/Users/mactrabalho/.gemini/antigravity/brain/a7712cd1-7946-4aed-acf0-0a0344957a96"

# Step 1: Read structure from page 'teste'
READ_CODE = r"""
(async () => {
  try {
    const pg = figma.root.children.find(n => n.name.toLowerCase() === "teste");
    if (!pg) { figma.notify("❌ Página 'teste' não encontrada!"); return; }
    figma.currentPage = pg;
    
    const nodes = pg.children;
    let report = "=== FIGMA QA REPORT ===\n";
    report += "Página: " + pg.name + " | Root Nodes: " + nodes.length + "\n\n";
    
    function describe(node, depth) {
      const indent = "  ".repeat(depth);
      let line = indent + node.type + ' "' + node.name + '" ';
      if (node.width !== undefined) line += Math.round(node.width) + "x" + Math.round(node.height) + " ";
      if (node.layoutMode) line += "[" + node.layoutMode + "] ";
      if (node.type === "TEXT") line += 'text="' + node.characters.substring(0, 30) + '" ';
      if (node.fills && node.fills.length > 0 && node.fills[0].color) {
        const c = node.fills[0].color;
        const hex = '#' + [c.r,c.g,c.b].map(v => Math.round(v*255).toString(16).padStart(2,'0')).join('');
        line += "fill:" + hex + " ";
      }
      if (node.cornerRadius) line += "r:" + node.cornerRadius + " ";
      report += line + "\n";
      if (node.children && depth < 4) {
        node.children.forEach(ch => describe(ch, depth + 1));
      }
    }
    
    nodes.forEach(n => describe(n, 0));
    
    // Export as PNG
    if (nodes.length > 0) {
      const rootFrame = nodes[0];
      const bytes = await rootFrame.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 1 } });
      const base64 = figma.base64Encode(bytes);
      
      report += "\n=== EXPORT ===\n";
      report += "Frame: " + rootFrame.name + " (" + Math.round(rootFrame.width) + "x" + Math.round(rootFrame.height) + ")\n";
      report += "PNG_BASE64_START\n" + base64 + "\nPNG_BASE64_END\n";
    }
    
    figma.notify("✅ QA Report completo! Tamanho: " + report.length + " chars");
    console.log(report);
    
  } catch(err) {
    console.error("❌ QA Error:", err);
    figma.notify("❌ QA Error: " + err.message, {timeout: 5000, error: true});
  }
})();
"""

def run_qa():
    try:
        payload = json.dumps({"code": READ_CODE}).encode()
        req = urllib.request.Request(FIGMA_BRIDGE_URL, data=payload, headers={'Content-Type':'application/json'})
        with urllib.request.urlopen(req, timeout=15) as r:
            resp = json.loads(r.read().decode())
            print(f"Bridge response: {resp}")
            if resp.get("status") == "ok":
                print("✅ QA executado com sucesso no Figma!")
            else:
                print(f"⚠️ Resposta: {resp}")
            return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    run_qa()
