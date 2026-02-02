import redis
from rq import Queue
import os

def check_failed_jobs():
    redis_url = "rediss://default:AUTyAAIncDE1MjZmMTI2Yjg2ZGE0NTZmYThkMjA1ZmQ0NDJlOWIxMHAxMTc2NTA@dominant-crayfish-17650.upstash.io:6379"
    try:
        conn = redis.from_url(redis_url)
        from rq.registry import FailedJobRegistry
        failed_registry = FailedJobRegistry("video-jobs", connection=conn)
        
        job_ids = failed_registry.get_job_ids()
        print(f"Total failed jobs: {len(job_ids)}")
        
        # Look at the last 5 failed jobs
        for job_id in job_ids[-5:]:
            job = failed_registry.get_job(job_id)
            if job:
                print(f"Job ID: {job.id}")
                print(f"Exc info: {job.exc_info}")
                print("---")
            else:
                print(f"Could not find job info for {job_id}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_failed_jobs()
