#!/usr/bin/env python3
"""
Live signals feeder: inserts one signal every 2s, occasional security alert.
Ctrl+C for clean exit.
"""
import asyncio
import asyncpg
import os
import random
import signal
import sys
from datetime import datetime

DSN = os.getenv("HERMES_SIGNALS_DSN", "postgresql://hermes_admin@localhost:5433/hermes")
SYMBOLS = ["AAPL", "MSFT", "TSLA", "GOOGL", "NVDA"]
SIDES = ["buy", "sell", "hold"]

running = True


def signal_handler(sig, frame):
    global running
    running = False
    print("\nShutting down...")
    sys.exit(0)


async def main():
    global running
    signal.signal(signal.SIGINT, signal_handler)

    pool = await asyncpg.create_pool(DSN)
    alert_counter = 0

    try:
        while running:
            async with pool.acquire() as conn:
                # Insert signal
                symbol = random.choice(SYMBOLS)
                price = random.uniform(100, 1000)
                side = random.choice(SIDES)
                strength = random.uniform(0, 1)

                await conn.execute(
                    "INSERT INTO signals.signals (ts, symbol, price, side, strength) "
                    "VALUES (NOW(), $1, $2, $3, $4)",
                    symbol, price, side, strength
                )
                print(f"[{datetime.now().isoformat()}] Signal: {symbol} {side} @ {price:.2f}")

                # Occasional alert (~every 15 inserts)
                alert_counter += 1
                if alert_counter % 15 == 0:
                    severity = random.choice(["info", "low", "medium", "high"])
                    message = f"Auto-generated alert {alert_counter}"
                    await conn.execute(
                        "INSERT INTO security.alerts (ts, severity, source, message) "
                        "VALUES (NOW(), $1, 'seed_script', $2)",
                        severity, message
                    )
                    print(f"  Alert: {severity} - {message}")

            await asyncio.sleep(2)

    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
