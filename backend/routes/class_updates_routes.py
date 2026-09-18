import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from sqlalchemy import text
from db import get_db

class_updates_bp = Blueprint('class_updates', __name__)
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'doc', 'ppt', 'pptx', 'txt', 'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@class_updates_bp.route('/publish', methods=['POST'])
def publish_class_update():
    db = next(get_db())
    try:
        faculty_name = request.form.get('faculty_name', 'Dr. Arvind Swaminathan').strip()
        department = request.form.get('department', 'Information Technology').strip()
        subject = request.form.get('subject', '').strip()
        update_date = request.form.get('update_date')
        topic = request.form.get('topic', '').strip()
        description = request.form.get('description', '').strip()

        if not (subject and update_date and topic):
            return jsonify({'success': False, 'message': 'Subject, Date, and Topic are mandatory.'}), 400

        doc_path = None
        if 'document' in request.files:
            file = request.files['document']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = f"notes_{uuid.uuid4().hex[:8]}_{secure_filename(file.filename)}"
                upload_folder = current_app.config['UPLOAD_FOLDER']
                file_dest = os.path.join(upload_folder, filename)
                file.save(file_dest)
                doc_path = f"/uploads/{filename}"

        insert_query = text("""
            INSERT INTO class_updates (faculty_name, department, subject, update_date, topic, description, document_path)
            VALUES (:fname, :dept, :subj, :udate, :topic, :desc, :doc)
        """)
        db.execute(insert_query, {
            'fname': faculty_name,
            'dept': department,
            'subj': subject,
            'udate': update_date,
            'topic': topic,
            'desc': description,
            'doc': doc_path
        })
        db.commit()

        return jsonify({'success': True, 'message': 'General Class Update published successfully for all students.'})
    finally:
        db.close()

@class_updates_bp.route('/all', methods=['GET'])
def get_all_class_updates():
    db = next(get_db())
    try:
        query = text("""
            SELECT id, faculty_name, department, subject, update_date, topic, description, document_path, created_at
            FROM class_updates
            ORDER BY update_date DESC, id DESC
        """)
        rows = db.execute(query).fetchall()
        updates = [{
            'id': r[0],
            'faculty_name': r[1],
            'department': r[2],
            'subject': r[3],
            'update_date': str(r[4]),
            'topic': r[5],
            'description': r[6],
            'document_path': r[7],
            'created_at': str(r[8])
        } for r in rows]

        return jsonify({'success': True, 'class_updates': updates})
    finally:
        db.close()
