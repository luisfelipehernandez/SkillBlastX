import os
import json
from bottle import request, response

def register_routes(app, base_dir, external_dir):
    def get_mazos_dir():
        mazos_dir = os.path.join(external_dir, 'mazos')
        if not os.path.exists(mazos_dir):
            os.makedirs(mazos_dir)
        return mazos_dir

    @app.route('/api/mazos/<filename>', method='DELETE')
    def delete_mazo(filename):
        clean_filename = filename.replace('..', '').replace('/', '').replace('\\', '').strip()
        if not clean_filename.endswith('.json'):
            clean_filename += '.json'
        mazos_dir = get_mazos_dir()
        filepath = os.path.join(mazos_dir, clean_filename)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
                response.content_type = 'application/json'
                return json.dumps({'success': True})
            except Exception as e:
                response.status = 500
                response.content_type = 'application/json'
                return json.dumps({'success': False, 'error': str(e)})
        response.status = 404
        response.content_type = 'application/json'
        return json.dumps({'success': False, 'error': 'Mazo no encontrado'})

    @app.route('/api/mazos/delete', method='POST')
    def delete_mazo_post():
        data = request.json or {}
        filename = data.get('filename', '').replace('..', '').replace('/', '').replace('\\', '').strip()
        return delete_mazo(filename)

    @app.route('/api/mazos/rename', method='POST')
    def rename_mazo():
        data = request.json or {}
        old_name = data.get('oldName', '').replace('..', '').replace('/', '').replace('\\', '').strip()
        new_name = data.get('newName', '').replace('..', '').replace('/', '').replace('\\', '').strip()
        if not old_name or not new_name:
            response.status = 400
            response.content_type = 'application/json'
            return json.dumps({'success': False, 'error': 'Nombres inválidos'})
        
        if not old_name.endswith('.json'):
            old_name += '.json'
        if not new_name.endswith('.json'):
            new_name += '.json'
            
        mazos_dir = get_mazos_dir()
        old_path = os.path.join(mazos_dir, old_name)
        new_path = os.path.join(mazos_dir, new_name)
        
        if os.path.exists(old_path):
            try:
                os.rename(old_path, new_path)
                response.content_type = 'application/json'
                return json.dumps({'success': True, 'filename': new_name})
            except Exception as e:
                response.status = 500
                response.content_type = 'application/json'
                return json.dumps({'success': False, 'error': str(e)})
        
        response.status = 404
        response.content_type = 'application/json'
        return json.dumps({'success': False, 'error': 'Mazo original no encontrado'})
