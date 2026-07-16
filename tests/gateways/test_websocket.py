import pytest
from fastapi import WebSocketDisconnect, status
from starlette.testclient import TestClient

from gateways.app import create_app


@pytest.fixture
def client():
    app = create_app(test_mode=True)
    return TestClient(app)


class TestWebSocketAuth:
    def test_ws_rejects_unauthenticated(self, client):
        """WS connect with no/wrong token is rejected (never accepted)"""
        with pytest.raises(WebSocketDisconnect) as exc_info:
            with client.websocket_connect(
                "/ws/signals",
                subprotocols=["hermes-bearer"]
            ):
                pass
        # Rejected with 1008 policy violation, never accepted
        assert exc_info.value.code == 1008

    def test_ws_rejects_cross_origin(self, client):
        """WS connect with valid token but cross-origin is rejected"""
        # Simulate evil origin
        with pytest.raises(WebSocketDisconnect) as exc_info:
            with client.websocket_connect(
                "/ws/signals",
                subprotocols=["hermes-bearer", "test-signals-token"],
                headers={"origin": "https://evil.example"}
            ):
                pass
        # Rejected with 1008 policy violation, never accepted
        assert exc_info.value.code == 1008

    def test_ws_accepts_valid_token_allowed_origin(self, client):
        """WS connect with valid token + allowed origin → accepted"""
        with client.websocket_connect(
            "/ws/signals",
            subprotocols=["hermes-bearer", "test-signals-token"],
            headers={"origin": "http://localhost:1420"}
        ) as ws:
            # Should receive snapshot frame
            data = ws.receive_json()
            assert data["type"] == "snapshot"
            assert "signals" in data
            assert "series" in data

    def test_ws_happy_path(self, client):
        """WS happy path: valid token, snapshot, then polling"""
        with client.websocket_connect(
            "/ws/signals",
            subprotocols=["hermes-bearer", "test-signals-token"]
        ) as ws:
            # First message should be snapshot
            msg = ws.receive_json()
            assert msg["type"] == "snapshot"
            assert isinstance(msg.get("signals"), list)
            assert isinstance(msg.get("series"), dict)

    def test_ws_rate_limiting_concurrent_connections(self, client):
        """Rate limit: 9th concurrent connection rejected with code 1013"""
        connections = []
        try:
            # Open 8 connections (should succeed)
            for i in range(8):
                ws = client.websocket_connect(
                    "/ws/signals",
                    subprotocols=["hermes-bearer", "test-signals-token"]
                )
                ws = ws.__enter__()
                connections.append(ws)

            # 9th should fail with code 1013 (service restart)
            with pytest.raises(WebSocketDisconnect) as exc_info:
                with client.websocket_connect(
                    "/ws/signals",
                    subprotocols=["hermes-bearer", "test-signals-token"]
                ):
                    pass
            assert exc_info.value.code == 1013

        finally:
            # Clean up
            for ws in connections:
                try:
                    ws.__exit__(None, None, None)
                except Exception:
                    pass
