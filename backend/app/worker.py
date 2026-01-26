import os
import redis
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from rq import Worker, Queue

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

# ---------------------------------------------------------
# Cloud Run Requirement: Container must listen on $PORT
# We start a dummy HTTP server in a thread to keep it happy.
# ---------------------------------------------------------
class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")

def start_health_server():
    port = int(os.getenv("PORT", 8080))
    server = HTTPServer(("0.0.0.0", port), HealthCheckHandler)
    print(f"Health check running on port {port}")
    server.serve_forever()

if __name__ == "__main__":
    conn = redis.from_url(REDIS_URL)
    
    # Start the dummy server in background
    t = threading.Thread(target=start_health_server, daemon=True)
    t.start()
    
    # Start the real work
    print("Starting RQ Worker...")
    queue = Queue("video-jobs", connection=conn)
    worker = Worker([queue], connection=conn)
    worker.work()
