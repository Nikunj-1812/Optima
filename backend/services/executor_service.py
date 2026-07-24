import time
import requests
from config import Config

# Piston language/version map (subset) — extend as needed
PISTON_VERSIONS = {
    "python": "3.10.0",
    "javascript": "18.15.0",
    "java": "15.0.2",
    "cpp": "10.2.0",
    "c": "10.2.0",
    "go": "1.16.2",
}

# Judge0 language ID map (subset)
JUDGE0_LANGUAGE_IDS = {
    "python": 71,
    "javascript": 63,
    "java": 62,
    "cpp": 54,
    "c": 50,
    "go": 60,
}

def run_code(language, code, stdin=""):
    language = language.lower()
    if Config.EXECUTOR_PROVIDER == "judge0":
        return _run_judge0(language, code, stdin)
    return _run_piston(language, code, stdin)

def _run_piston(language, code, stdin):
    version = PISTON_VERSIONS.get(language, "*")
    payload = {
        "language": language,
        "version": version,
        "files": [{"content": code}],
        "stdin": stdin,
    }
    resp = requests.post(Config.PISTON_URL, json=payload, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    run = data.get("run", {})
    return {
        "stdout": run.get("stdout", ""),
        "stderr": run.get("stderr", ""),
        "exit_code": run.get("code"),
        "time_ms": None,  # Piston doesn't report timing by default
    }

def _run_judge0(language, code, stdin):
    language_id = JUDGE0_LANGUAGE_IDS.get(language)
    if language_id is None:
        raise ValueError(f"Unsupported language for Judge0: {language}")
    headers = {"Content-Type": "application/json"}
    if Config.JUDGE0_API_KEY:
        headers["X-RapidAPI-Key"] = Config.JUDGE0_API_KEY

    submit_resp = requests.post(
        f"{Config.JUDGE0_URL}/submissions?base64_encoded=false&wait=false",
        json={"source_code": code, "language_id": language_id, "stdin": stdin},
        headers=headers,
        timeout=15,
    )
    submit_resp.raise_for_status()
    token = submit_resp.json()["token"]
    
        # Poll for result
    for _ in range(10):
        result_resp = requests.get(
            f"{Config.JUDGE0_URL}/submissions/{token}?base64_encoded=false",
            headers=headers,
            timeout=15,
        )
        result_resp.raise_for_status()
        result = result_resp.json()
        if result.get("status", {}).get("id", 0) >= 3:  # finished (>=3 means done)
            return {
                "stdout": result.get("stdout", ""),
                "stderr": result.get("stderr", "") or result.get("compile_output", ""),
                "exit_code": result.get("status", {}).get("id"),
                "time_ms": result.get("time"),
            }
        time.sleep(1)
    return {"stdout": "", "stderr": "Execution timed out", "exit_code": None, "time_ms": None}
    