import os
import redis
from rq import Worker, Queue

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

conn = redis.from_url(REDIS_URL)

if __name__ == "__main__":
    queue = Queue("video-jobs", connection=conn)
    worker = Worker([queue], connection=conn)
    worker.work()
