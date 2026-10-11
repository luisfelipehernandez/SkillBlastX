import os
import sys
import tempfile
import threading
import json

# Forzar a WebView2 a usar una carpeta de caché temporal limpia para descartar la caché persistente
os.environ['WEBVIEW2_USER_DATA_FOLDER'] = os.path.join(tempfile.gettempdir(), 'SkillBlastX_WV2_Cache')

from bottle import Bottle, static_file, run, request, response

# Detectar si estamos en un ejecutable empaquetado por PyInstaller
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    EXTERNAL_DIR = os.path.dirname(sys.executable)
    local_deckbuilder = os.path.join(EXTERNAL_DIR, 'deckbuilder')
    if os.path.exists(local_deckbuilder) and os.path.exists(os.path.join(local_deckbuilder, 'index.html')):
        BASE_DIR = local_deckbuilder
    else:
        BASE_DIR = sys._MEIPASS
else:
    # Desarrollo local
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    EXTERNAL_DIR = os.path.dirname(BASE_DIR)

app = Bottle()

def get_mazos_dir():
    mazos_dir = os.path.join(EXTERNAL_DIR, 'mazos')
    if not os.path.exists(mazos_dir):
        os.makedirs(mazos_dir)
    return mazos_dir

def get_mazos_ia_dir():
    mazos_ia_dir = os.path.join(EXTERNAL_DIR, 'mazos_ia')
    if not os.path.exists(mazos_ia_dir) and os.path.exists(os.path.join(BASE_DIR, 'mazos_ia')):
        return os.path.join(BASE_DIR, 'mazos_ia')
    if not os.path.exists(mazos_ia_dir):
        os.makedirs(mazos_ia_dir)
    return mazos_ia_dir

# API para persistencia de mazos del Jugador (carpeta mazos/)
@app.route('/api/mazos', method='GET')
def list_mazos():
    mazos_dir = get_mazos_dir()
    files = [f for f in os.listdir(mazos_dir) if f.endswith('.json') and not f.startswith('IA_')]
    response.content_type = 'application/json'
    return json.dumps({'mazos': files})

@app.route('/api/mazos/<filename>')
def get_mazo(filename):
    mazos_dir = get_mazos_dir()
    return static_file(filename, root=mazos_dir)

@app.route('/api/mazos', method='POST')
def save_mazo():
    data = request.json
    name = data.get('name', 'Mazo').replace('..', '').replace('/', '').replace('\\', '')
    deck = data.get('deck')
    
    mazos_dir = get_mazos_dir()
    filepath = os.path.join(mazos_dir, f'{name}.json')
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(deck, f, indent=2, ensure_ascii=False)
    
    response.content_type = 'application/json'
    return json.dumps({'success': True, 'filename': f'{name}.json'})

@app.route('/api/mazos/<filename>', method='DELETE')
def delete_mazo(filename):
    clean_filename = filename.replace('..', '').replace('/', '').replace('\\', '')
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

# API para mazos exclusivos de la IA (carpeta mazos_ia/)
@app.route('/api/mazos_ia', method='GET')
def list_mazos_ia():
    mazos_ia_dir = get_mazos_ia_dir()
    files = [f for f in os.listdir(mazos_ia_dir) if f.endswith('.json')]
    response.content_type = 'application/json'
    return json.dumps({'mazos': files})

@app.route('/api/mazos_ia/<filename>')
def get_mazo_ia(filename):
    mazos_ia_dir = get_mazos_ia_dir()
    return static_file(filename, root=mazos_ia_dir)

# Carga dinámica de rutas desde BASE_DIR/api_routes.py si existe (permite extensiones en vivo)
try:
    routes_file = os.path.join(BASE_DIR, 'api_routes.py')
    if os.path.exists(routes_file):
        import importlib.util
        spec = importlib.util.spec_from_file_location("deckbuilder_api_routes", routes_file)
        if spec and spec.loader:
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            if hasattr(mod, 'register_routes'):
                mod.register_routes(app, BASE_DIR, EXTERNAL_DIR)
except Exception as e:
    print(f"Advertencia al cargar api_routes dinámicas: {e}")

@app.route('/')
def index():
    response.set_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.set_header('Pragma', 'no-cache')
    response.set_header('Expires', '0')
    return static_file('index.html', root=BASE_DIR)

@app.route('/favicon.ico')
def get_favicon():
    response.set_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.set_header('Pragma', 'no-cache')
    response.set_header('Expires', '0')
    return static_file('icono.ico', root=BASE_DIR)

@app.route('/cartas.json')
def get_cards_json():
    response.set_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.set_header('Pragma', 'no-cache')
    response.set_header('Expires', '0')
    return static_file('cartas.json', root=EXTERNAL_DIR)

@app.route('/imagenes/<filename:path>')
def get_image(filename):
    return static_file(filename, root=os.path.join(EXTERNAL_DIR, 'imagenes'))

@app.route('/<filename:path>')
def server_static(filename):
    response.set_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.set_header('Pragma', 'no-cache')
    response.set_header('Expires', '0')
    return static_file(filename, root=BASE_DIR)

def start_server():
    run(app, host='localhost', port=39200, quiet=True)

if __name__ == '__main__':
    import multiprocessing
    multiprocessing.freeze_support()
    
    # Comprobación de actualizaciones automáticas desde GitHub al iniciar
    try:
        from updater import auto_update_if_needed
        auto_update_if_needed(EXTERNAL_DIR)
    except Exception as upd_err:
        print(f"Aviso del actualizador: {upd_err}")

    try:
        t = threading.Thread(target=start_server)
        t.daemon = True
        t.start()
        
        import webview
        webview.create_window(
            title='Skill Blast X - Deckbuilder & Playtest',
            url='http://localhost:39200',
            width=1280,
            height=820,
            min_size=(1024, 720)
        )
        webview.start(debug=False)
    except Exception as e:
        import traceback
        log_path = os.path.join(EXTERNAL_DIR, 'crash.log')
        with open(log_path, 'w', encoding='utf-8') as f:
            f.write(traceback.format_exc())
