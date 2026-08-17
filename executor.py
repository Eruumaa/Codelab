import docker
import tempfile
import os

_client = None

def get_client():
    global _client
    if _client is None:
        _client = docker.from_env()
    return _client

def run_code_safely(language, source_code):
    with tempfile.TemporaryDirectory() as temp_dir:
        filename = "main.c" if language == "c" else "main.py"
        file_path = os.path.join(temp_dir, filename)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(source_code)
            
        if language == "c":
            command = "sh -c 'gcc main.c -o main && valgrind --leak-check=full ./main'"
            image = "codelab-gcc-valgrind"
        else:
            command = "python main.py"
            image = "python:3.9-alpine"

        try:
            container = get_client().containers.run(
                image,
                command,
                volumes={temp_dir: {'bind': '/app', 'mode': 'rw'}},
                working_dir="/app",
                mem_limit="128m",         
                nano_cpus=500000000,       
                network_disabled=True,      
                pids_limit=50,              
                remove=True,                
                detach=False
            )
            return {"status": "success", "output": container.decode("utf-8", errors="replace")}
        except docker.errors.ContainerError as e:
            return {"status": "error", "output": e.stderr.decode("utf-8", errors="replace")}
        except Exception as e:
             return {"status": "system_error", "output": str(e)}