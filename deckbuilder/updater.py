"""
Skill Blast X - Auto-Updater System
Consulta GitHub al iniciar y descarga automáticamente nuevas versiones.
100% silencioso y sin demoras si ya está actualizado o sin internet.
"""

import os
import sys
import json
import shutil
import tempfile
import urllib.request
import urllib.error
import zipfile

GITHUB_VERSION_URL = "https://raw.githubusercontent.com/luisfelipehernandez/SkillBlastX/main/version.json"
GITHUB_ARCHIVE_URL = "https://github.com/luisfelipehernandez/SkillBlastX/archive/refs/heads/main.zip"

def get_local_version(external_dir):
    version_path = os.path.join(external_dir, "version.json")
    if os.path.exists(version_path):
        try:
            with open(version_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"version": "1.0.0", "version_code": 1}

def check_for_updates(external_dir, timeout=2.5):
    """
    Comprueba si existe una versión superior en GitHub.
    Retorna (has_update, remote_info, local_info).
    Si no hay conexión o falla, retorna (False, None, local_info) sin bloquear.
    """
    local_info = get_local_version(external_dir)
    try:
        req = urllib.request.Request(
            GITHUB_VERSION_URL,
            headers={"User-Agent": "SkillBlastX-AutoUpdater/1.0"}
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                remote_data = resp.read().decode("utf-8")
                remote_info = json.loads(remote_data)
                remote_code = remote_info.get("version_code", 0)
                local_code = local_info.get("version_code", 0)
                if remote_code > local_code:
                    return True, remote_info, local_info
    except Exception:
        # Modo offline / GitHub inaccesible: continuar normalmente
        pass
    return False, None, local_info

def apply_update_files(temp_zip_path, external_dir, progress_cb=None):
    """
    Descomprime el zip de GitHub y actualiza los archivos del juego en external_dir,
    protegiendo siempre los mazos guardados por el usuario.
    """
    extract_tmp = tempfile.mkdtemp(prefix="sbx_update_")
    try:
        if progress_cb:
            progress_cb(60, "Extrayendo archivos de la actualización...")
        with zipfile.ZipFile(temp_zip_path, "r") as z:
            z.extractall(extract_tmp)
        
        # GitHub genera una carpeta raíz llamada 'SkillBlastX-main'
        root_entries = os.listdir(extract_tmp)
        source_root = extract_tmp
        for entry in root_entries:
            candidate = os.path.join(extract_tmp, entry)
            if os.path.isdir(candidate) and "SkillBlastX" in entry:
                source_root = candidate
                break

        if progress_cb:
            progress_cb(80, "Instalando nuevas cartas y mejoras...")

        # Archivos y carpetas a actualizar
        update_targets = [
            "cartas.json",
            "version.json",
            "LEEME_INSTRUCCIONES.txt",
            "deckbuilder",
            "imagenes",
            "mazos_ia"
        ]

        for target in update_targets:
            src_path = os.path.join(source_root, target)
            dst_path = os.path.join(external_dir, target)
            if not os.path.exists(src_path):
                continue
            
            if os.path.isfile(src_path):
                shutil.copy2(src_path, dst_path)
            elif os.path.isdir(src_path):
                # Para carpetas como imagenes o deckbuilder, copiar/sobrescribir recursivamente
                for r, dirs, files in os.walk(src_path):
                    rel = os.path.relpath(r, src_path)
                    dest_sub = os.path.join(dst_path, rel) if rel != "." else dst_path
                    os.makedirs(dest_sub, exist_ok=True)
                    for f in files:
                        # No sobrescribir .spec ni archivos de compilación local
                        if f.endswith(('.spec', '.log', '.tmp')):
                            continue
                        s_file = os.path.join(r, f)
                        d_file = os.path.join(dest_sub, f)
                        shutil.copy2(s_file, d_file)

        # Para mazos/ (Mazos del jugador): SOLO agregar mazos nuevos que no existan, NUNCA sobreescribir los suyos
        src_mazos = os.path.join(source_root, "mazos")
        dst_mazos = os.path.join(external_dir, "mazos")
        if os.path.exists(src_mazos):
            os.makedirs(dst_mazos, exist_ok=True)
            for f in os.listdir(src_mazos):
                s_mazo = os.path.join(src_mazos, f)
                d_mazo = os.path.join(dst_mazos, f)
                if os.path.isfile(s_mazo) and not os.path.exists(d_mazo):
                    shutil.copy2(s_mazo, d_mazo)

        if progress_cb:
            progress_cb(100, "¡Actualización completada!")
    finally:
        shutil.rmtree(extract_tmp, ignore_errors=True)

def run_update_with_gui(remote_info, external_dir):
    """
    Muestra una ventana moderna oscura con barra de progreso mientras descarga y aplica la actualización.
    """
    remote_version = remote_info.get("version", "nueva")
    download_url = GITHUB_ARCHIVE_URL

    try:
        import tkinter as tk
        from tkinter import ttk

        root = tk.Tk()
        root.title("Skill Blast X - Actualizador")
        root.geometry("450x200")
        root.resizable(False, False)
        root.configure(bg="#0b0f19")

        # Centrar en pantalla
        root.update_idletasks()
        w = 450
        h = 200
        x = (root.winfo_screenwidth() // 2) - (w // 2)
        y = (root.winfo_screenheight() // 2) - (h // 2)
        root.geometry(f"{w}x{h}+{x}+{y}")

        title_lbl = tk.Label(
            root,
            text="SKILL BLAST X",
            font=("Segoe UI", 14, "bold"),
            fg="#00f2fe",
            bg="#0b0f19"
        )
        title_lbl.pack(pady=(18, 4))

        sub_lbl = tk.Label(
            root,
            text=f"Descargando actualización v{remote_version} desde GitHub...",
            font=("Segoe UI", 10),
            fg="#e0e6ed",
            bg="#0b0f19"
        )
        sub_lbl.pack(pady=(0, 15))

        style = ttk.Style()
        style.theme_use("clam")
        style.configure(
            "Cyan.Horizontal.TProgressbar",
            troughcolor="#162032",
            background="#00f2fe",
            darkcolor="#00c0ce",
            lightcolor="#00f2fe",
            bordercolor="#162032"
        )

        progress = ttk.Progressbar(
            root,
            style="Cyan.Horizontal.TProgressbar",
            orient="horizontal",
            length=380,
            mode="determinate"
        )
        progress.pack(pady=5)
        progress["value"] = 5

        status_lbl = tk.Label(
            root,
            text="Conectando con GitHub...",
            font=("Segoe UI", 9),
            fg="#718096",
            bg="#0b0f19"
        )
        status_lbl.pack(pady=(8, 0))

        def update_gui(percent, text):
            progress["value"] = percent
            status_lbl.config(text=text)
            root.update()

        def do_download():
            temp_fd, temp_zip_path = tempfile.mkstemp(suffix="_sbx_update.zip")
            os.close(temp_fd)
            try:
                update_gui(10, "Iniciando descarga...")
                req = urllib.request.Request(
                    download_url,
                    headers={"User-Agent": "SkillBlastX-AutoUpdater/1.0"}
                )
                with urllib.request.urlopen(req, timeout=30) as response, open(temp_zip_path, "wb") as out_file:
                    total_length = response.headers.get("content-length")
                    if total_length:
                        total_length = int(total_length)
                    downloaded = 0
                    chunk_size = 64 * 1024
                    while True:
                        chunk = response.read(chunk_size)
                        if not chunk:
                            break
                        out_file.write(chunk)
                        downloaded += len(chunk)
                        if total_length:
                            pct = 10 + int((downloaded / total_length) * 45)
                            mb = downloaded / (1024 * 1024)
                            update_gui(pct, f"Descargando: {mb:.1f} MB...")
                        else:
                            mb = downloaded / (1024 * 1024)
                            update_gui(35, f"Descargando paquete ({mb:.1f} MB)...")

                apply_update_files(temp_zip_path, external_dir, progress_cb=update_gui)
                root.after(600, root.destroy)
            except Exception as e:
                status_lbl.config(text=f"No se pudo completar: {e}")
                root.after(1500, root.destroy)
            finally:
                if os.path.exists(temp_zip_path):
                    try:
                        os.remove(temp_zip_path)
                    except Exception:
                        pass

        root.after(100, do_download)
        root.mainloop()
    except Exception as e:
        # Si falla la interfaz gráfica, aplicar en consola silenciosa
        print(f"Actualizando en consola: {e}")
        try:
            temp_fd, temp_zip_path = tempfile.mkstemp(suffix="_sbx_update.zip")
            os.close(temp_fd)
            urllib.request.urlretrieve(download_url, temp_zip_path)
            apply_update_files(temp_zip_path, external_dir)
            if os.path.exists(temp_zip_path):
                os.remove(temp_zip_path)
        except Exception:
            pass

def auto_update_if_needed(external_dir):
    """
    Punto de entrada principal para run.py.
    Comprueba y aplica actualización de manera totalmente transparente.
    """
    has_update, remote_info, local_info = check_for_updates(external_dir)
    if has_update and remote_info:
        run_update_with_gui(remote_info, external_dir)
