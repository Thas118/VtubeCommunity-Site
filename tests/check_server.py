"""Временная проверка: все ресурсы сайта отдаются сервером с кодом 200."""
import functools
import http.server
import socket
import threading
import time

DIRECTORY = r"c:\Users\Radmir\Documents\GitHub\VtubeCommunity-Site"
PORT = 8767


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass


handler = functools.partial(QuietHandler, directory=DIRECTORY)
server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
time.sleep(0.3)

paths = [
    "/",
    "/index.html",
    "/css/styles.css",
    "/js/utils.js",
    "/js/data.js",
    "/js/cart.js",
    "/js/calculator.js",
    "/js/app.js",
    "/assets/favicon.svg",
    "/assets/avatar-placeholder.png",
    "/robots.txt",
]

all_ok = True
for path in paths:
    try:
        with socket.create_connection(("127.0.0.1", PORT), timeout=3) as sock:
            sock.sendall(
                ("GET %s HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n" % path)
                .encode("ascii")
            )
            sock.settimeout(3)
            chunks = []
            while True:
                data = sock.recv(4096)
                if not data:
                    break
                chunks.append(data)
            head = b"".join(chunks).split(b"\r\n", 1)[0].decode("ascii", "replace")
            ok = "200" in head
            all_ok = all_ok and ok
            print(("OK  " if ok else "ERR "), head, path)
    except Exception as error:  # noqa: BLE001
        all_ok = False
        print("ERROR", path, error)

server.shutdown()
print("ALL_OK" if all_ok else "SOME_RESOURCES_MISSING")
