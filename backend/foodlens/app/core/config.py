import os


BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS_DIR = os.path.join(BACKEND_DIR, "models")
ML_DIR = os.path.join(BACKEND_DIR, "ml")
ML_MODELS_DIR = os.path.join(ML_DIR, "models")
ML_TRAINING_DIR = os.path.join(ML_DIR, "training")
ENV_PATH = os.path.join(BACKEND_DIR, ".env")


def _load_dotenv(path: str) -> None:
    """
    Minimal .env loader to avoid extra dependency.
    Existing OS environment variables are not overwritten.
    """
    if not os.path.isfile(path):
        return
    try:
        with open(path, "r", encoding="utf-8") as f:
            for raw_line in f:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
    except Exception as e:
        print(f"Warning: could not load .env: {e}")


_load_dotenv(ENV_PATH)

API_HOST = "0.0.0.0"
API_PORT = 5001

OPENAI_API_KEY = (os.environ.get("OPENAI_API_KEY") or "").strip()
OPENAI_MODEL = (os.environ.get("OPENAI_MODEL") or "gpt-4o-mini").strip()
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
OPENAI_TIMEOUT_SEC = 25

# Log once at import so you can see if validation will run
if OPENAI_API_KEY:
    print("OpenAI: enabled (food validation & nutrition fallback will run)")
else:
    print("OpenAI: disabled — set OPENAI_API_KEY in backend/.env and restart server for validation")

CORS_ALLOW_ORIGINS = ["*"]
CORS_ALLOW_METHODS = ["*"]
CORS_ALLOW_HEADERS = ["*"]
