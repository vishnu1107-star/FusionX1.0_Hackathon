import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from config import Config, UPLOAD_FOLDER
from db import init_db

# Import Blueprints
from routes.auth_routes import auth_bp
from routes.student_routes import student_bp
from routes.faculty_routes import faculty_bp
from routes.application_routes import app_bp
from routes.class_updates_routes import class_updates_bp
from routes.extracurricular_routes import extracurricular_bp
from routes.bonafide_routes import bonafide_bp
from routes.attendance_routes import attendance_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for React frontend (Vite port 5173/3000/etc.)
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(student_bp, url_prefix='/api/student')
    app.register_blueprint(faculty_bp, url_prefix='/api/faculty')
    app.register_blueprint(app_bp, url_prefix='/api')
    app.register_blueprint(class_updates_bp, url_prefix='/api/class-updates')
    app.register_blueprint(extracurricular_bp, url_prefix='/api/extracurricular')
    app.register_blueprint(bonafide_bp, url_prefix='/api/bonafide')
    app.register_blueprint(attendance_bp, url_prefix='/api/attendance')

    # Serve uploaded documents/proofs
    @app.route('/uploads/<path:filename>')
    def serve_uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # Root Endpoint
    @app.route('/', methods=['GET'])
    def root_health():
        return jsonify({
            'status': 'ok',
            'message': 'EduShield AI Backend is running'
        })

    # Health Check
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'system': 'EduShield AI',
            'version': '1.0.0-hackathon-release'
        })

    # Initialize Database Schema & Seed Data
    with app.app_context():
        try:
            init_db()
        except Exception as e:
            print(f"[EduShield Init Warning] DB initialization note: {e}")

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    print(f"==================================================")
    print(f"  EduShield AI Backend API Server Starting on http://127.0.0.1:{port}")
    print(f"==================================================")
    app.run(host='0.0.0.0', port=port, debug=True)
