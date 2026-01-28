import os
import redis
from rq import Worker, Queue

from app.core.config import settings

REDIS_URL = settings.REDIS_URL

conn = redis.from_url(REDIS_URL)


# Cloud Run requires the container to listen on PORT (default 8080)
from threading import Thread
from http.server import HTTPServer, BaseHTTPRequestHandler

class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")

def start_health_server():
    port = int(os.getenv("PORT", 8080))
    server = HTTPServer(("0.0.0.0", port), HealthCheckHandler)
    server.serve_forever()

if __name__ == "__main__":
    # Start health check server in background
    t = Thread(target=start_health_server, daemon=True)
    t.start()
    print("Health check server started.")

    queue = Queue("video-jobs", connection=conn, default_timeout=3600)
    worker = Worker([queue], connection=conn, default_worker_ttl=3600, job_monitoring_interval=5)
    worker.work()
