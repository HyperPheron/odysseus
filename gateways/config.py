from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    hermes_signals_dsn: str = ""
    hermes_security_dsn: str = ""
    hermes_discord_dsn: str = ""
    hermes_signals_token: str = ""
    hermes_security_token: str = ""
    hermes_discord_token: str = ""
    hermes_ws_origins: str = "http://localhost:1420,tauri://localhost"
    hermes_gateway_port: int = 7100

    class Config:
        env_file = ".env"
        case_sensitive = False

    def __init__(self, **data):
        super().__init__(**data)
        # Fail fast if tokens/DSNs missing for enabled gateways
        if not self.hermes_signals_token:
            raise ValueError("HERMES_SIGNALS_TOKEN must be set")
        if not self.hermes_security_token:
            raise ValueError("HERMES_SECURITY_TOKEN must be set")
        if not self.hermes_discord_token:
            raise ValueError("HERMES_DISCORD_TOKEN must be set")
        if not self.hermes_signals_dsn:
            raise ValueError("HERMES_SIGNALS_DSN must be set")
        if not self.hermes_security_dsn:
            raise ValueError("HERMES_SECURITY_DSN must be set")
        if not self.hermes_discord_dsn:
            raise ValueError("HERMES_DISCORD_DSN must be set")

    @property
    def ws_allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.hermes_ws_origins.split(",")]


def get_settings() -> Settings:
    return Settings()
