import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, send_file
from flask_cors import CORS
from src.models.user import db
from src.routes.user import user_bp
from src.routes.assets import assets_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

# تمكين CORS لجميع المصادر
CORS(app)

app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(assets_bp, url_prefix='/api/assets')

# Route to serve external import files (audio, etc.)
@app.route('/external-import/<path:filename>')
def serve_external_import(filename):
    # Fix the path to point to the correct external-import directory
    external_import_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'public', 'external-import')
    file_path = os.path.join(external_import_dir, filename)
    
    print(f"DEBUG: Requested filename: {filename}")
    print(f"DEBUG: External import dir: {external_import_dir}")
    print(f"DEBUG: Full file path: {file_path}")
    print(f"DEBUG: File exists: {os.path.exists(file_path)}")
    
    # Check if file exists
    if not os.path.exists(file_path):
        print(f"DEBUG: File not found at {file_path}")
        return "File not found", 404
    
    # Set proper MIME types for binary files
    mime_types = {
        '.glb': 'model/gltf-binary',
        '.gltf': 'model/gltf+json',
        '.obj': 'text/plain',
        '.mtl': 'text/plain',
        '.babylon': 'application/json',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.ogg': 'audio/ogg',
        '.webm': 'audio/webm'
    }
    
    # Get file extension
    _, ext = os.path.splitext(filename.lower())
    mime_type = mime_types.get(ext, 'application/octet-stream')
    
    print(f"DEBUG: Serving file with MIME type: {mime_type}")
    
    # Serve file with proper MIME type and binary mode
    return send_file(
        file_path,
        mimetype=mime_type,
        as_attachment=False,
        conditional=True
    )

# uncomment if you need to use database
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
with app.app_context():
    db.create_all()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # Skip external-import paths - let the specific route handle them
    if path.startswith('external-import/'):
        return "Not found", 404
        
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
