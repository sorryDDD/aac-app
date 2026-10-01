"""Serve synthetic AAC validation assets on a disposable loopback origin."""
import argparse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse
import socket

parser = argparse.ArgumentParser()
parser.add_argument('--baseline', type=Path, required=True)
parser.add_argument('--current', type=Path, required=True)
parser.add_argument('--checks', type=Path, required=True)
parser.add_argument('--port', type=int, default=49176)
parser.add_argument('--initial-mode', choices=['baseline', 'current'], default='baseline')
args = parser.parse_args()
args.checks.mkdir(parents=True, exist_ok=True)
mode_file = args.checks / 'mode'
mode_file.write_text(args.initial_mode)

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if mode_file.read_text().strip() == 'offline' and not urlparse(self.path).path.startswith('/checks/'):
            self.close_connection = True
            self.connection.shutdown(socket.SHUT_RDWR)
            self.connection.close()
            return
        super().do_GET()

    def translate_path(self, path):
        name = urlparse(path).path
        if name.startswith('/checks/'):
            root = args.checks
            name = name.removeprefix('/checks/')
        else:
            root = args.baseline if mode_file.read_text().strip() == 'baseline' else args.current
            name = name.lstrip('/')
        if '..' in Path(name).parts:
            return str(root / 'invalid')
        return str(root / name)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *_args):
        pass

print(f'Local-only validation server: http://127.0.0.1:{args.port}/checks/', flush=True)
print(f'Mode file: {mode_file}; values: baseline, current, offline', flush=True)
ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
