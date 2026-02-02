import redis
from rq import Queue
import os

def check_queue():
    # Use the REDIS_URL from Cloud Run (found in describe output)
    redis_url = "rediss://default:AUTyAAIncDE1MjZmMTI2Yjg2ZGE0NTZmYThkMjA1ZmQ0NDJlOWIxMHAxMTc2NTA@dominant-crayfish-17650.upstash.io:6379"
    try:
        conn = redis.from_url(redis_url)
        q = Queue("video-jobs", connection=conn)
        print(f"Queue 'video-jobs' length: {len(q)}")
        
        # Check for failed jobs
        from rq.registry import FailedJobRegistry
        failed_registry = FailedJobRegistry("video-jobs", connection=conn)
        print(f"Failed jobs count: {len(failed_registry)}")
        
        # Check for jobs in registry
        from rq.registry import StartedJobRegistry
        started_registry = StartedJobRegistry("video-jobs", connection=conn)
        print(f"Started jobs count: {len(started_registry)}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_queue()
