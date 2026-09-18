import os
import re
import sqlite3
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
from config import Config, BASE_DIR

Base = declarative_base()
engine = None
SessionLocal = None
DB_TYPE = "unknown"

def get_engine_and_session():
    global engine, SessionLocal, DB_TYPE
    
    # Try PostgreSQL first
    pg_url = Config.DATABASE_URL
    try:
        pg_engine = create_engine(pg_url, pool_pre_ping=True, connect_args={"connect_timeout": 2})
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine = pg_engine
        DB_TYPE = "postgresql"
        print("[EduShield DB] Successfully connected to PostgreSQL!")
    except Exception as e:
        print(f"[EduShield DB] PostgreSQL note: ({e}). Using SQLite engine.")
        engine = create_engine(Config.FALLBACK_SQLITE_URL, connect_args={"check_same_thread": False})
        DB_TYPE = "sqlite"

    SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
    return engine, SessionLocal

def get_db():
    if SessionLocal is None:
        get_engine_and_session()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def clean_sql_for_sqlite(sql_text):
    """Converts PostgreSQL specific syntax to SQLite compatible syntax for fallback"""
    sql = sql_text
    # Replace SERIAL with INTEGER PRIMARY KEY AUTOINCREMENT
    sql = re.sub(r'\bSERIAL\s+PRIMARY\s+KEY\b', 'INTEGER PRIMARY KEY AUTOINCREMENT', sql, flags=re.IGNORECASE)
    # Replace NUMERIC(x,y) with REAL
    sql = re.sub(r'\bNUMERIC\(\d+,\s*\d+\)', 'REAL', sql, flags=re.IGNORECASE)
    # Replace JSONB with TEXT
    sql = re.sub(r'\bJSONB\b', 'TEXT', sql, flags=re.IGNORECASE)
    # Replace CURRENT_TIMESTAMP with datetime('now')
    sql = re.sub(r'\bDEFAULT\s+CURRENT_TIMESTAMP\b', "DEFAULT CURRENT_TIMESTAMP", sql, flags=re.IGNORECASE)
    # Remove CASCADE from DROP TABLE
    sql = re.sub(r'\bDROP\s+TABLE\s+IF\s+EXISTS\s+(\w+)\s+CASCADE;', r'DROP TABLE IF EXISTS \1;', sql, flags=re.IGNORECASE)
    return sql

def init_db():
    eng, _ = get_engine_and_session()
    schema_path = os.path.join(BASE_DIR, '..', 'database', 'schema.sql')
    seed_path = os.path.join(BASE_DIR, '..', 'database', 'seed.sql')

    with eng.connect() as conn:
        # Check if students table already exists
        has_table = False
        try:
            if DB_TYPE == "postgresql":
                res = conn.execute(text("SELECT to_regclass('public.students');")).scalar()
                has_table = res is not None
            else:
                res = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='students';")).scalar()
                has_table = res is not None
        except Exception:
            has_table = False

        if not has_table:
            print(f"[EduShield DB] Initializing tables and seeding {DB_TYPE} database...")
            # Read schema
            if os.path.exists(schema_path):
                with open(schema_path, 'r', encoding='utf-8') as f:
                    schema_sql = f.read()
                if DB_TYPE == "sqlite":
                    schema_sql = clean_sql_for_sqlite(schema_sql)
                
                # Split statements and execute
                statements = [s.strip() for s in schema_sql.split(';') if s.strip()]
                for stmt in statements:
                    try:
                        conn.execute(text(stmt))
                    except Exception as ex:
                        print(f"Schema execution warning: {ex}")
                conn.commit()

            # Read and run seed
            if os.path.exists(seed_path):
                with open(seed_path, 'r', encoding='utf-8') as f:
                    seed_sql = f.read()
                statements = [s.strip() for s in seed_sql.split(';') if s.strip()]
                for stmt in statements:
                    try:
                        conn.execute(text(stmt))
                    except Exception as ex:
                        print(f"Seed execution warning: {ex}")
                conn.commit()
            print("[EduShield DB] Database initialized and sample seed data loaded successfully!")
        else:
            print(f"[EduShield DB] {DB_TYPE} database is already populated.")
