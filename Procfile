web: gunicorn --worker-tmp-dir /dev/shm --worker-class gevent --timeout 120 app:app
worker: python worker.py  # Your worker process