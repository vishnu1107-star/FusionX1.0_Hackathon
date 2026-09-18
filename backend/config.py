import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'edushield-hackathon-secret-key-2026')
    UPLOAD_FOLDER = UPLOAD_FOLDER
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max file size
    
    # PostgreSQL Configuration
    PG_USER = os.environ.get('PGUSER', 'postgres')
    PG_PASSWORD = os.environ.get('PGPASSWORD', 'postgres')
    PG_HOST = os.environ.get('PGHOST', 'localhost')
    PG_PORT = os.environ.get('PGPORT', '5432')
    PG_DATABASE = os.environ.get('PGDATABASE', 'edushield')
    
    PG_URL = f"postgresql://{PG_USER}:{PG_PASSWORD}@{PG_HOST}:{PG_PORT}/{PG_DATABASE}"
    DATABASE_URL = os.environ.get('DATABASE_URL', PG_URL)
    FALLBACK_SQLITE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'edushield.db')}"
