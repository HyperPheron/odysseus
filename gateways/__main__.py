import os
import uvicorn
from gateways.app import create_app

if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("HERMES_GATEWAY_PORT", "7100"))
    uvicorn.run(app, host="0.0.0.0", port=port)
