import pytest
from fastapi import status
from starlette.testclient import TestClient

from gateways.app import create_app


@pytest.fixture
def client():
    app = create_app(test_mode=True)
    return TestClient(app)


class TestBearerAuth:
    def test_get_healthz_no_auth(self, client):
        """GET /healthz works without auth"""
        response = client.get("/healthz")
        assert response.status_code == status.HTTP_200_OK

    def test_security_feed_missing_token(self, client):
        """Security feed rejects missing token"""
        response = client.get("/api/security/alerts")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_security_feed_wrong_token(self, client):
        """Security feed rejects wrong token"""
        response = client.get(
            "/api/security/alerts",
            headers={"Authorization": "Bearer wrong-token"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_security_feed_correct_token(self, client):
        """Security feed accepts correct token"""
        response = client.get(
            "/api/security/alerts",
            headers={"Authorization": "Bearer test-security-token"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

    def test_discord_feed_missing_token(self, client):
        """Discord feed rejects missing token"""
        response = client.get("/api/discord/recaps")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_discord_feed_wrong_token(self, client):
        """Discord feed rejects wrong token"""
        response = client.get(
            "/api/discord/recaps",
            headers={"Authorization": "Bearer wrong-token"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_discord_feed_correct_token(self, client):
        """Discord feed accepts correct token"""
        response = client.get(
            "/api/discord/recaps",
            headers={"Authorization": "Bearer test-discord-token"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
