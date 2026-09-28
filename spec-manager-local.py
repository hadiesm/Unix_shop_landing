"""
Unix Shop - Local Spec Manager Server

Run:
    py -3 spec-manager-local.py

URL:
    http://127.0.0.1:8765/spec-manager.html

API:
    data/product-specs.json
"""

from __future__ import annotations

import json
import os
import threading
import time
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


HOST = "127.0.0.1"
PORT = 8765

ROOT = Path(__file__).resolve().parent
SPECS_FILE = ROOT / "data" / "product-specs.json"

API_PATH = "/__spec_manager__/product-specs"
HEARTBEAT_PATH = "/__spec_manager__/heartbeat"

# -------------------------------------------------------------
# SERVER LIFECYCLE SETTINGS
# -------------------------------------------------------------

# Give the browser a few seconds to load before heartbeat
# monitoring is allowed to shut down the server.
STARTUP_GRACE_PERIOD = 5

# If no heartbeat is received for this long, assume the
# Spec Manager page has been closed.
HEARTBEAT_TIMEOUT = 10

# How often the server checks the last heartbeat.
HEARTBEAT_CHECK_INTERVAL = 2


server = None

server_started_at = time.monotonic()

# Updated every time the browser sends a heartbeat.
last_heartbeat = time.monotonic()

shutdown_started = False

heartbeat_lock = threading.Lock()


class SpecManagerHandler(SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(
            *args,
            directory=str(ROOT),
            **kwargs
        )

    def _send_json(self, status: int, payload) -> None:

        body = json.dumps(
            payload,
            ensure_ascii=False,
            indent=2
        ).encode("utf-8")

        self.send_response(status)

        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )

        self.send_header(
            "Content-Length",
            str(len(body))
        )

        self.send_header(
            "Cache-Control",
            "no-store, no-cache, must-revalidate"
        )

        self.end_headers()

        try:
            self.wfile.write(body)

        except (
            BrokenPipeError,
            ConnectionResetError
        ):
            pass

    # ---------------------------------------------------------
    # GET
    # ---------------------------------------------------------

    def do_GET(self):

        path = self.path.split("?", 1)[0]

        # -----------------------------------------------------
        # HEARTBEAT
        # -----------------------------------------------------

        if path == HEARTBEAT_PATH:

            global last_heartbeat

            with heartbeat_lock:
                last_heartbeat = time.monotonic()

            self._send_json(
                200,
                {"ok": True}
            )

            return

        # -----------------------------------------------------
        # LOAD JSON
        # -----------------------------------------------------

        if path == API_PATH:

            try:

                with SPECS_FILE.open(
                    "r",
                    encoding="utf-8"
                ) as file:

                    data = json.load(file)

                self._send_json(
                    200,
                    data
                )

            except FileNotFoundError:

                self._send_json(
                    404,
                    {
                        "error":
                        "product-specs.json not found"
                    }
                )

            except json.JSONDecodeError as exc:

                self._send_json(
                    500,
                    {
                        "error":
                        f"Invalid JSON: {exc}"
                    }
                )

            except Exception as exc:

                self._send_json(
                    500,
                    {
                        "error": str(exc)
                    }
                )

            return

        super().do_GET()

    # ---------------------------------------------------------
    # POST
    # ---------------------------------------------------------

    def do_POST(self):

        path = self.path.split("?", 1)[0]

        # -----------------------------------------------------
        # SAVE JSON
        # -----------------------------------------------------

        if path != API_PATH:

            self.send_error(404)

            return

        try:

            content_length = int(
                self.headers.get(
                    "Content-Length",
                    "0"
                )
            )

            if (
                content_length <= 0
                or content_length > 10 * 1024 * 1024
            ):

                self._send_json(
                    400,
                    {
                        "error":
                        "Invalid request size"
                    }
                )

                return

            raw = self.rfile.read(
                content_length
            )

            data = json.loads(
                raw.decode("utf-8")
            )

            if (
                not isinstance(data, dict)
                or not isinstance(
                    data.get("products"),
                    dict
                )
            ):

                self._send_json(
                    400,
                    {
                        "error":
                        "Invalid product-specs structure"
                    }
                )

                return

            SPECS_FILE.parent.mkdir(
                parents=True,
                exist_ok=True
            )

            # -------------------------------------------------
            # ATOMIC WRITE
            # -------------------------------------------------

            temp_file = SPECS_FILE.with_suffix(
                ".json.tmp"
            )

            with temp_file.open(
                "w",
                encoding="utf-8",
                newline="\n"
            ) as file:

                json.dump(
                    data,
                    file,
                    ensure_ascii=False,
                    indent=2
                )

                file.write("\n")

            os.replace(
                temp_file,
                SPECS_FILE
            )

            print(
                "[Spec Manager] JSON saved successfully."
            )

            self._send_json(
                200,
                {
                    "ok": True,
                    "file": str(SPECS_FILE),
                    "updated_at":
                    data.get("updated_at")
                }
            )

        except json.JSONDecodeError:

            self._send_json(
                400,
                {
                    "error":
                    "Invalid JSON"
                }
            )

        except Exception as exc:

            self._send_json(
                500,
                {
                    "error": str(exc)
                }
            )

    def log_message(self, format, *args):

        print(
            f"[Spec Manager] "
            f"{self.address_string()} - "
            f"{format % args}"
        )


# =============================================================
# HEARTBEAT MONITOR
# =============================================================

def monitor_heartbeat():

    global shutdown_started

    while True:

        time.sleep(
            HEARTBEAT_CHECK_INTERVAL
        )

        # Server may already have been stopped.
        if server is None:
            return

        # Don't check heartbeat during startup.
        elapsed_since_start = (
            time.monotonic()
            - server_started_at
        )

        if elapsed_since_start < STARTUP_GRACE_PERIOD:
            continue

        # Read the last heartbeat safely.
        with heartbeat_lock:
            heartbeat_age = (
                time.monotonic()
                - last_heartbeat
            )

        if heartbeat_age >= HEARTBEAT_TIMEOUT:

            if shutdown_started:
                return

            shutdown_started = True

            print(
                "\n[Spec Manager] "
                f"No heartbeat for {heartbeat_age:.1f}s."
            )

            print(
                "[Spec Manager] "
                "Spec Manager appears to be closed."
            )

            threading.Thread(
                target=shutdown_server,
                daemon=True
            ).start()

            return


# =============================================================
# SERVER SHUTDOWN
# =============================================================

def shutdown_server():

    global server

    # Allow any pending HTTP response to finish.
    time.sleep(0.5)

    if server is not None:

        print(
            "[Spec Manager] "
            "Stopping local server..."
        )

        server.shutdown()


# =============================================================
# MAIN
# =============================================================

def main():

    global server
    global server_started_at
    global last_heartbeat

    os.chdir(ROOT)

    server = ThreadingHTTPServer(
        (HOST, PORT),
        SpecManagerHandler
    )

    server_started_at = time.monotonic()

    # Initially consider the server alive.
    with heartbeat_lock:
        last_heartbeat = server_started_at

    url = (
        f"http://{HOST}:{PORT}"
        f"/spec-manager.html"
    )

    print("=" * 60)
    print("Unix Shop - Local Spec Manager")
    print(f"Project: {ROOT}")
    print(f"JSON:    {SPECS_FILE}")
    print(f"Open:    {url}")
    print("Local server is running.")
    print("=" * 60)

    # ---------------------------------------------------------
    # START HEARTBEAT MONITOR
    # ---------------------------------------------------------

    threading.Thread(
        target=monitor_heartbeat,
        daemon=True
    ).start()

    # ---------------------------------------------------------
    # OPEN BROWSER
    # ---------------------------------------------------------

    threading.Timer(
        0.8,
        lambda: webbrowser.open(url)
    ).start()

    try:

        server.serve_forever()

    except KeyboardInterrupt:

        print(
            "\nStopping local Spec Manager..."
        )

    finally:

        server.server_close()

        print(
            "Local Spec Manager server stopped."
        )


if __name__ == "__main__":
    main()