import os
import sys
import subprocess
import time

def main():
    print("=" * 60)
    print("   HH GOA 2026 — VOICE-ENABLED RAG APPLICATION LAUNCHER")
    print("=" * 60)

    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    if not os.path.exists(venv_python):
        venv_python = sys.executable

    vector_pkl = os.path.join(backend_dir, "data", "vector_store.pkl")
    if not os.path.exists(vector_pkl):
        print("\n1. Vector store index not found. Running one-time ingestion script...")
        ingest_script = os.path.join(backend_dir, "scripts", "ingest.py")
        subprocess.run([venv_python, ingest_script], cwd=backend_dir, check=False)
    else:
        print("\n1. Persisted vector store index verified.")

    print("\n2. Starting FastAPI Backend Server on http://127.0.0.1:8000 ...")
    backend_cmd = [venv_python, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"]
    backend_process = subprocess.Popen(backend_cmd, cwd=backend_dir)

    print("\n3. Starting Vite Frontend Dev Server on http://localhost:3000 ...")
    frontend_cmd = "cmd /c \"cd frontend && npm run dev\""
    frontend_process = subprocess.Popen(frontend_cmd, cwd=root_dir, shell=True)

    print("\n" + "=" * 60)
    print(" APPLICATION IS LIVE:")
    print(" - Frontend UI : http://localhost:3000")
    print(" - Backend API : http://127.0.0.1:8000")
    print(" - Swagger Docs: http://127.0.0.1:8000/docs")
    print("=" * 60 + "\n")

    try:
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\nShutting down services...")
        backend_process.terminate()
        frontend_process.terminate()

if __name__ == "__main__":
    main()
