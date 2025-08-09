from flask import Blueprint, request, jsonify, send_file
import os
import json
import base64
import shutil
from datetime import datetime
from werkzeug.utils import secure_filename

assets_bp = Blueprint('assets', __name__)

# مجلد حفظ الأصول
ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'assets')
MAPS_DIR = os.path.join(ASSETS_DIR, 'maps')
CHARACTERS_DIR = os.path.join(ASSETS_DIR, 'characters')
OBJECTS_DIR = os.path.join(ASSETS_DIR, 'objects')
SCENES_DIR = os.path.join(ASSETS_DIR, 'scenes')
FLOW_DIR = os.path.join(ASSETS_DIR, 'flows')
CODELIB_DIR = os.path.join(ASSETS_DIR, 'code-library')

# مجلد الاستيراد الخارجي المؤقت (في المجلد الجذر للمشروع)
EXTERNAL_IMPORT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'public', 'external-import')

# إنشاء المجلدات إذا لم تكن موجودة
for directory in [ASSETS_DIR, MAPS_DIR, CHARACTERS_DIR, OBJECTS_DIR, SCENES_DIR, FLOW_DIR, CODELIB_DIR]:
    os.makedirs(directory, exist_ok=True)

@assets_bp.route('/save', methods=['POST'])
def save_asset():
    """حفظ أصل (خريطة، شخصية، أو كائن)"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'لا توجد بيانات'}), 400
        
        asset_type = data.get('type')  # map, character, object, scene, flow, code
        asset_name = data.get('name')
        asset_code = data.get('code')
        
        if not all([asset_type, asset_name, asset_code]):
            return jsonify({'error': 'البيانات المطلوبة مفقودة'}), 400
        
        # تحديد المجلد المناسب
        if asset_type == 'map':
            target_dir = MAPS_DIR
        elif asset_type == 'character':
            target_dir = CHARACTERS_DIR
        elif asset_type == 'object':
            target_dir = OBJECTS_DIR
        elif asset_type == 'scene':
            target_dir = SCENES_DIR
        elif asset_type == 'flow':
            target_dir = FLOW_DIR
        elif asset_type == 'code':
            target_dir = CODELIB_DIR
        else:
            return jsonify({'error': 'نوع الأصل غير صحيح'}), 400
        
        # إنشاء بيانات الأصل
        asset_data = {
            'name': asset_name,
            'type': asset_type,
            'code': asset_code,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        # إنشاء مجلد فرعي للأصل
        asset_folder = os.path.join(target_dir, asset_name)
        os.makedirs(asset_folder, exist_ok=True)
        
        # حفظ الملف في المجلد الفرعي
        filename = f"{asset_name}.json"
        filepath = os.path.join(asset_folder, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(asset_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            'success': True,
            'message': f'تم حفظ {asset_type} بنجاح',
            'filename': filename
        })
        
    except Exception as e:
        return jsonify({'error': f'خطأ في الحفظ: {str(e)}'}), 500

@assets_bp.route('/load/<asset_type>/<asset_name>', methods=['GET'])
def load_asset(asset_type, asset_name):
    """تحميل أصل محفوظ"""
    try:
        # تحديد المجلد المناسب
        if asset_type == 'map':
            target_dir = MAPS_DIR
        elif asset_type == 'character':
            target_dir = CHARACTERS_DIR
        elif asset_type == 'object':
            target_dir = OBJECTS_DIR
        elif asset_type == 'scene':
            target_dir = SCENES_DIR
        elif asset_type == 'flow':
            target_dir = FLOW_DIR
        elif asset_type == 'code':
            target_dir = CODELIB_DIR
        else:
            return jsonify({'error': 'نوع الأصل غير صحيح'}), 400
        
        # البحث في المجلد الفرعي للأصل
        asset_folder = os.path.join(target_dir, asset_name)
        filename = f"{asset_name}.json"
        filepath = os.path.join(asset_folder, filename)
        
        if not os.path.exists(filepath):
            return jsonify({'error': 'الملف غير موجود'}), 404
        
        with open(filepath, 'r', encoding='utf-8') as f:
            asset_data = json.load(f)
        
        return jsonify({
            'success': True,
            'data': asset_data
        })
        
    except Exception as e:
        return jsonify({'error': f'خطأ في التحميل: {str(e)}'}), 500

@assets_bp.route('/list/<asset_type>', methods=['GET'])
def list_assets(asset_type):
    """قائمة بجميع الأصول من نوع معين"""
    try:
        # تحديد المجلد المناسب
        if asset_type == 'map':
            target_dir = MAPS_DIR
        elif asset_type == 'character':
            target_dir = CHARACTERS_DIR
        elif asset_type == 'object':
            target_dir = OBJECTS_DIR
        elif asset_type == 'scene':
            target_dir = SCENES_DIR
        elif asset_type == 'flow':
            target_dir = FLOW_DIR
        elif asset_type == 'code':
            target_dir = CODELIB_DIR
        else:
            return jsonify({'error': 'نوع الأصل غير صحيح'}), 400
        
        assets = []
        
        # البحث في المجلدات الفرعية
        if os.path.exists(target_dir):
            for folder_name in os.listdir(target_dir):
                folder_path = os.path.join(target_dir, folder_name)
                if os.path.isdir(folder_path):
                    json_file = os.path.join(folder_path, f"{folder_name}.json")
                    thumbnail_file = os.path.join(folder_path, f"{folder_name}_thumbnail.png")
                    
                    if os.path.exists(json_file):
                        try:
                            with open(json_file, 'r', encoding='utf-8') as f:
                                asset_data = json.load(f)
                            
                            assets.append({
                                'name': asset_data.get('name'),
                                'folder': folder_name,
                                'created_at': asset_data.get('created_at'),
                                'updated_at': asset_data.get('updated_at'),
                                'has_thumbnail': os.path.exists(thumbnail_file)
                            })
                        except:
                            continue
        
        return jsonify({
            'success': True,
            'assets': assets
        })
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب القائمة: {str(e)}'}), 500

@assets_bp.route('/delete/<asset_type>/<asset_name>', methods=['DELETE'])
def delete_asset(asset_type, asset_name):
    """حذف أصل محفوظ"""
    try:
        # تحديد المجلد المناسب
        if asset_type == 'map':
            target_dir = MAPS_DIR
        elif asset_type == 'character':
            target_dir = CHARACTERS_DIR
        elif asset_type == 'object':
            target_dir = OBJECTS_DIR
        elif asset_type == 'scene':
            target_dir = SCENES_DIR
        elif asset_type == 'flow':
            target_dir = FLOW_DIR
        elif asset_type == 'code':
            target_dir = CODELIB_DIR
        else:
            return jsonify({'error': 'نوع الأصل غير صحيح'}), 400
        
        # حذف المجلد الفرعي للأصل
        asset_folder = os.path.join(target_dir, asset_name)
        
        if not os.path.exists(asset_folder):
            return jsonify({'error': 'الملف غير موجود'}), 404
        
        # حذف جميع الملفات في المجلد الفرعي
        import shutil
        shutil.rmtree(asset_folder)
        
        return jsonify({
            'success': True,
            'message': f'تم حذف {asset_type} بنجاح'
        })
        
    except Exception as e:
        return jsonify({'error': f'خطأ في الحذف: {str(e)}'}), 500

@assets_bp.route('/save-thumbnail', methods=['POST'])
def save_thumbnail():
    """حفظ صورة مصغرة للأصل"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'لا توجد بيانات'}), 400
        
        asset_type = data.get('type')
        asset_name = data.get('name')
        thumbnail_data = data.get('thumbnail')  # base64 encoded image
        
        if not all([asset_type, asset_name, thumbnail_data]):
            return jsonify({'error': 'البيانات المطلوبة مفقودة'}), 400
        
        # تحديد المجلد المناسب
        if asset_type == 'map':
            target_dir = MAPS_DIR
        elif asset_type == 'character':
            target_dir = CHARACTERS_DIR
        elif asset_type == 'object':
            target_dir = OBJECTS_DIR
        elif asset_type == 'scene':
            target_dir = SCENES_DIR
        elif asset_type == 'flow':
            target_dir = FLOW_DIR
        elif asset_type == 'code':
            target_dir = CODELIB_DIR
        else:
            return jsonify({'error': 'نوع الأصل غير صحيح'}), 400
        
        # مجلد الأصل
        asset_folder = os.path.join(target_dir, asset_name)
        if not os.path.exists(asset_folder):
            return jsonify({'error': 'الأصل غير موجود'}), 404
        
        # إزالة البادئة من البيانات المرمزة بـ base64
        if thumbnail_data.startswith('data:image'):
            thumbnail_data = thumbnail_data.split(',')[1]
        
        # حفظ الصورة المصغرة
        thumbnail_filename = f"{asset_name}_thumbnail.png"
        thumbnail_path = os.path.join(asset_folder, thumbnail_filename)
        
        with open(thumbnail_path, 'wb') as f:
            f.write(base64.b64decode(thumbnail_data))
        
        return jsonify({
            'success': True,
            'message': 'تم حفظ الصورة المصغرة بنجاح'
        })
        
    except Exception as e:
        return jsonify({'error': f'خطأ في حفظ الصورة المصغرة: {str(e)}'}), 500

@assets_bp.route('/thumbnail/<asset_type>/<asset_name>', methods=['GET'])
def get_thumbnail(asset_type, asset_name):
    """الحصول على الصورة المصغرة للأصل"""
    try:
        # تحديد المجلد المناسب
        if asset_type == 'map':
            target_dir = MAPS_DIR
        elif asset_type == 'character':
            target_dir = CHARACTERS_DIR
        elif asset_type == 'object':
            target_dir = OBJECTS_DIR
        elif asset_type == 'scene':
            target_dir = SCENES_DIR
        else:
            return jsonify({'error': 'نوع الأصل غير صحيح'}), 400
        
        # مجلد الأصل
        asset_folder = os.path.join(target_dir, asset_name)
        thumbnail_path = os.path.join(asset_folder, f"{asset_name}_thumbnail.png")
        
        if not os.path.exists(thumbnail_path):
            return jsonify({'error': 'الصورة المصغرة غير موجودة'}), 404
        
        return send_file(thumbnail_path, mimetype='image/png')
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب الصورة المصغرة: {str(e)}'}), 500

@assets_bp.route('/import-external', methods=['POST'])
def import_external_assets():
    """استيراد أصول خارجية إلى مجلد مؤقت"""
    try:
        if 'files' not in request.files:
            return jsonify({'error': 'لا توجد ملفات للرفع'}), 400
        
        files = request.files.getlist('files')
        paths = request.form.getlist('paths')
        
        if not files:
            return jsonify({'error': 'لا توجد ملفات للرفع'}), 400
        
        # مسح المجلد المؤقت أولاً (في أول استيراد فقط)
        if os.path.exists(EXTERNAL_IMPORT_DIR):
            shutil.rmtree(EXTERNAL_IMPORT_DIR)
        os.makedirs(EXTERNAL_IMPORT_DIR, exist_ok=True)
        
        uploaded_files = []
        
        for i, file in enumerate(files):
            if file.filename == '':
                continue
                
            # الحصول على المسار النسبي إذا كان متوفراً
            relative_path = paths[i] if i < len(paths) else file.filename
            
            # تأمين اسم الملف والمسار
            if '/' in relative_path or '\\' in relative_path:
                # هذا ملف من مجلد، احتفظ بهيكل المجلد
                safe_path = os.path.normpath(relative_path)
                # إزالة أي مسارات خطرة
                safe_path = safe_path.replace('..', '').lstrip('/')
            else:
                # ملف فردي
                safe_path = secure_filename(file.filename)
            
            # إنشاء المسار الكامل
            full_path = os.path.join(EXTERNAL_IMPORT_DIR, safe_path)
            
            # إنشاء المجلدات الفرعية إذا لزم الأمر
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            # حفظ الملف
            file.save(full_path)
            
            uploaded_files.append({
                'name': safe_path,
                'size': os.path.getsize(full_path),
                'original_name': file.filename
            })
        
        return jsonify({
            'success': True,
            'message': f'تم رفع {len(uploaded_files)} ملف بنجاح',
            'files': uploaded_files
        })
        
    except Exception as e:
        return jsonify({'error': f'خطأ في استيراد الملفات: {str(e)}'}), 500

@assets_bp.route('/list-external', methods=['GET'])
def list_external_assets():
    """عرض قائمة الأصول الخارجية المستوردة"""
    try:
        files = []
        
        if os.path.exists(EXTERNAL_IMPORT_DIR):
            for root, dirs, filenames in os.walk(EXTERNAL_IMPORT_DIR):
                for filename in filenames:
                    full_path = os.path.join(root, filename)
                    relative_path = os.path.relpath(full_path, EXTERNAL_IMPORT_DIR)
                    
                    files.append({
                        'name': relative_path,
                        'size': os.path.getsize(full_path),
                        'modified': os.path.getmtime(full_path)
                    })
        
        return jsonify({
            'success': True,
            'files': files
        })
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب قائمة الملفات: {str(e)}'}), 500

@assets_bp.route('/clear-external', methods=['DELETE'])
def clear_external_assets():
    """مسح جميع الأصول الخارجية المستوردة"""
    try:
        if os.path.exists(EXTERNAL_IMPORT_DIR):
            shutil.rmtree(EXTERNAL_IMPORT_DIR)
        
        return jsonify({
            'success': True,
            'message': 'تم مسح جميع الملفات المستوردة'
        })
        
    except Exception as e:
        return jsonify({'error': f'خطأ في مسح الملفات: {str(e)}'}), 500

@assets_bp.route('/move-external-to-project', methods=['POST'])
def move_external_to_project():
    """نقل الأصول الخارجية إلى مجلد المشروع"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'لا توجد بيانات'}), 400
        
        asset_type = data.get('type')
        asset_name = data.get('name')
        
        if not all([asset_type, asset_name]):
            return jsonify({'error': 'البيانات المطلوبة مفقودة'}), 400
        
        # تحديد المجلد المناسب
        if asset_type == 'map':
            target_dir = MAPS_DIR
        elif asset_type == 'character':
            target_dir = CHARACTERS_DIR
        elif asset_type == 'object':
            target_dir = OBJECTS_DIR
        else:
            return jsonify({'error': 'نوع الأصل غير صحيح'}), 400
        
        # مجلد المشروع (المجلد الفرعي للأصل)
        project_folder = os.path.join(target_dir, asset_name)
        
        # التحقق من وجود مجلد المشروع
        if not os.path.exists(project_folder):
            return jsonify({'error': 'مجلد المشروع غير موجود'}), 404
        
        moved_files = []
        
        # نقل الملفات إذا كان مجلد الاستيراد الخارجي موجود
        if os.path.exists(EXTERNAL_IMPORT_DIR):
            # إنشاء مجلد الأصول داخل مجلد المشروع
            assets_folder = os.path.join(project_folder, 'assets')
            os.makedirs(assets_folder, exist_ok=True)
            
            # نقل جميع الملفات والمجلدات
            for item in os.listdir(EXTERNAL_IMPORT_DIR):
                source_path = os.path.join(EXTERNAL_IMPORT_DIR, item)
                dest_path = os.path.join(assets_folder, item)
                
                if os.path.isdir(source_path):
                    # نقل المجلد
                    if os.path.exists(dest_path):
                        shutil.rmtree(dest_path)
                    shutil.copytree(source_path, dest_path)
                else:
                    # نقل الملف
                    shutil.copy2(source_path, dest_path)
                
                moved_files.append(item)
            
            # مسح مجلد الاستيراد الخارجي بعد النقل
            shutil.rmtree(EXTERNAL_IMPORT_DIR)
        
        return jsonify({
            'success': True,
            'message': f'تم نقل {len(moved_files)} عنصر إلى مجلد المشروع',
            'movedFiles': moved_files
        })
        
    except Exception as e:
        return jsonify({'error': f'خطأ في نقل الملفات: {str(e)}'}), 500

@assets_bp.route('/copy-project-assets', methods=['POST'])
def copy_project_assets():
    """نسخ أصول من مجلد المشروع إلى مجلد external-import"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'لا توجد بيانات'}), 400
        
        asset_type = data.get('type')
        asset_name = data.get('name')
        
        if not all([asset_type, asset_name]):
            return jsonify({'error': 'البيانات المطلوبة مفقودة'}), 400
        
        # تحديد المجلد المناسب
        if asset_type == 'map':
            target_dir = MAPS_DIR
        elif asset_type == 'character':
            target_dir = CHARACTERS_DIR
        elif asset_type == 'object':
            target_dir = OBJECTS_DIR
        elif asset_type == 'scene':
            target_dir = SCENES_DIR
        elif asset_type == 'code':
            target_dir = CODELIB_DIR
        else:
            return jsonify({'error': 'نوع الأصل غير صحيح'}), 400
        
        # مجلد المشروع (المجلد الفرعي للأصل)
        project_folder = os.path.join(target_dir, asset_name)
        assets_folder = os.path.join(project_folder, 'assets')
        
        # التحقق من وجود مجلد المشروع
        if not os.path.exists(project_folder):
            return jsonify({'error': 'مجلد المشروع غير موجود'}), 404
        
        # التحقق من وجود مجلد assets
        if not os.path.exists(assets_folder):
            return jsonify({
                'success': True,
                'foundAssets': False,
                'message': 'لا يوجد مجلد assets في المشروع'
            })
        
        # إنشاء مجلد external-import
        os.makedirs(EXTERNAL_IMPORT_DIR, exist_ok=True)
        
        copied_files = []
        
        # نسخ جميع محتويات مجلد assets
        for item in os.listdir(assets_folder):
            source_path = os.path.join(assets_folder, item)
            dest_path = os.path.join(EXTERNAL_IMPORT_DIR, item)
            
            if os.path.isdir(source_path):
                # نسخ المجلد
                if os.path.exists(dest_path):
                    shutil.rmtree(dest_path)
                shutil.copytree(source_path, dest_path)
            else:
                # نسخ الملف
                shutil.copy2(source_path, dest_path)
            
            copied_files.append(item)
        
        return jsonify({
            'success': True,
            'foundAssets': True,
            'message': f'تم نسخ {len(copied_files)} عنصر من مجلد assets',
            'copiedFiles': copied_files
        })
        
    except Exception as e:
        return jsonify({'error': f'خطأ في نسخ أصول المشروع: {str(e)}'}), 500

