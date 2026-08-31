import docker
import tempfile
import os
import subprocess

_client = None

def get_client():
    global _client
    try:
        if _client is None:
            _client = docker.from_env()
        _client.ping()
        return _client
    except Exception:
        return None

def run_with_docker(client, language, temp_dir):
    if language == "c":
        command = "sh -c 'gcc main.c -o main && ./main'"
        image = "codelab-gcc-valgrind"
    else:
        command = "python main.py"
        image = "python:3.9-alpine"

    try:
        container = client.containers.run(
            image,
            command,
            volumes={temp_dir: {'bind': '/app', 'mode': 'rw'}},
            working_dir="/app",
            mem_limit="128m",
            nano_cpus=500000000,
            network_disabled=True,
            pids_limit=50,
            remove=True,
            detach=False,
            stdout=True,
            stderr=True
        )
        return {"status": "success", "output": container.decode("utf-8", errors="replace")}
    except docker.errors.ContainerError as e:
        return {"status": "error", "output": e.stderr.decode("utf-8", errors="replace")}

def run_with_local_subprocess(language, temp_dir):
    try:
        if language == "c":
            src = os.path.join(temp_dir, "main.c")
            exe = os.path.join(temp_dir, "main.exe" if os.name == "nt" else "main")
            
            # 1. Compile
            compile_res = subprocess.run(
                ["gcc", src, "-o", exe],
                capture_output=True,
                text=True,
                timeout=5
            )
            if compile_res.returncode != 0:
                return {"status": "error", "output": compile_res.stderr or compile_res.stdout}
            
            # 2. Run
            run_res = subprocess.run(
                [exe],
                capture_output=True,
                text=True,
                timeout=5,
                cwd=temp_dir
            )
            out = run_res.stdout + (("\n" + run_res.stderr) if run_res.stderr else "")
            return {"status": "success", "output": out or "(Program selesai dieksekusi tanpa output)"}
        else:
            src = os.path.join(temp_dir, "main.py")
            run_res = subprocess.run(
                ["python", src],
                capture_output=True,
                text=True,
                timeout=5,
                cwd=temp_dir
            )
            if run_res.returncode != 0:
                return {"status": "error", "output": run_res.stderr or run_res.stdout}
            return {"status": "success", "output": run_res.stdout or "(Program selesai dieksekusi tanpa output)"}
    except subprocess.TimeoutExpired:
        return {"status": "error", "output": "[TIMED OUT] Waktu eksekusi melebihi batas (maksimal 5 detik).\nPastikan kode tidak memiliki perulangan tanpa henti (infinite loop) atau scanf() tanpa input."}
    except Exception as e:
        return {"status": "system_error", "output": f"Local execution error: {str(e)}"}

def run_code_safely(language, source_code):
    with tempfile.TemporaryDirectory() as temp_dir:
        filename = "main.c" if language == "c" else "main.py"
        file_path = os.path.join(temp_dir, filename)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(source_code)
            
        client = get_client()
        if client:
            try:
                return run_with_docker(client, language, temp_dir)
            except Exception as e:
                print(f"[Executor] Docker execution error: {e}. Falling back to local runner.")
                return run_with_local_subprocess(language, temp_dir)
        else:
            return run_with_local_subprocess(language, temp_dir)