from fastapi import FastAPI, WebSocket, Request
from fastapi.responses import JSONResponse
import json
import uvicorn
import asyncio
from typing import List, Optional
from datetime import datetime

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.last_result: Optional[dict] = None
        self.last_logs: List[str] = []
        self.last_exec_time: Optional[str] = None
        self.exec_count: int = 0
        self.plugin_connected: bool = False

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if len(self.active_connections) == 0:
            self.plugin_connected = False

    async def broadcast(self, message: str):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

@app.websocket("/")
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            # Parse messages FROM the plugin (handshake, exec results)
            try:
                data = json.loads(raw)
                if data.get("type") == "HANDSHAKE":
                    manager.plugin_connected = True
                    print(f"🟢 Figma Plugin conectado! Client: {data.get('client')}")
                elif data.get("type") == "EXEC_RESULT":
                    manager.last_result = data
                    manager.last_logs = data.get("logs", [])
                    manager.last_exec_time = datetime.now().isoformat()
                    status = "✅ SUCESSO" if data.get("success") else f"❌ ERRO: {data.get('error', 'unknown')}"
                    print(f"📋 Exec Result #{data.get('execId', '?')}: {status}")
                    if manager.last_logs:
                        print(f"📝 Logs ({len(manager.last_logs)} lines):")
                        for log_line in manager.last_logs[:20]:
                            print(f"   {log_line[:200]}")
            except json.JSONDecodeError:
                pass  # Keep-alive or non-JSON message
    except Exception as e:
        manager.disconnect(websocket)

@app.get("/status")
async def status():
    """Health check - mostra se o plugin está conectado e último resultado."""
    return {
        "bridge_online": True,
        "plugin_connected": manager.plugin_connected,
        "websocket_clients": len(manager.active_connections),
        "total_executions": manager.exec_count,
        "last_result": manager.last_result,
        "last_exec_time": manager.last_exec_time,
    }

@app.post("/execute")
async def execute(request: Request):
    try:
        if len(manager.active_connections) == 0:
            return JSONResponse(
                status_code=503,
                content={"status": "error", "message": "Nenhum plugin Figma conectado via WebSocket! Abra o plugin no Figma."}
            )
        
        data = await request.json()
        code = data.get("code", "")
        
        manager.exec_count += 1
        manager.last_result = None  # Reset
        
        msg = json.dumps({"type": "EVAL_CODE", "code": code})
        await manager.broadcast(msg)
        
        # Espera até 8 segundos pelo resultado do plugin
        for _ in range(16):
            await asyncio.sleep(0.5)
            if manager.last_result is not None:
                result = manager.last_result
                if result.get("success"):
                    return {"status": "ok", "message": "✅ Design criado com sucesso no Figma!", "exec_id": manager.exec_count}
                else:
                    return {"status": "error", "message": f"❌ Plugin reportou erro: {result.get('error', 'unknown')}", "exec_id": manager.exec_count}
        
        return {"status": "warning", "message": "⚠️ Código enviado mas sem confirmação do plugin em 8s. Verifique o Figma.", "exec_id": manager.exec_count}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9999)
