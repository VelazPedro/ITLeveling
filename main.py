"""
IT Leveling — envoltorio de escritorio.

Abre el dashboard en una ventana nativa de Windows (motor WebView2, el mismo
que usa Edge). El servidor HTTP lo levanta pywebview internamente en un puerto
al azar de 127.0.0.1: no hay que abrir el navegador ni escribir ninguna URL.

Los datos (personajes y tickets, IndexedDB) se guardan en:
    %LOCALAPPDATA%\\ITLeveling
así que sobreviven a cerrar la app y a recompilar el .exe.
"""

import ctypes
import os
import socket
import sys

import webview

TITULO = "IT Leveling"
ANCHO = 1180
ALTO = 940

# El puerto tiene que ser SIEMPRE el mismo: IndexedDB separa los datos por
# origen (esquema + host + puerto), asi que un puerto al azar equivaldria a
# empezar de cero en cada arranque.
PUERTO = 47820


def ruta_recurso(relativa: str) -> str:
    """Devuelve la ruta real del archivo, ande suelto o empaquetado con PyInstaller."""
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, relativa)


def carpeta_datos() -> str:
    base = os.environ.get("LOCALAPPDATA") or os.path.expanduser("~")
    carpeta = os.path.join(base, "ITLeveling")
    os.makedirs(carpeta, exist_ok=True)
    return carpeta


def puerto_ocupado(puerto: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.4)
        return s.connect_ex(("127.0.0.1", puerto)) == 0


def avisar(mensaje: str) -> None:
    ctypes.windll.user32.MessageBoxW(0, mensaje, TITULO, 0x10)


def main() -> None:
    if puerto_ocupado(PUERTO):
        avisar(
            f"El puerto {PUERTO} esta ocupado.\n\n"
            "Puede que IT Leveling ya este abierto. Cerra la otra ventana y volve a intentar."
        )
        return

    webview.create_window(
        TITULO,
        ruta_recurso("index.html"),
        width=ANCHO,
        height=ALTO,
        min_size=(860, 640),
        background_color="#050b1f",
        text_select=False,
    )

    # private_mode=False es lo que hace que IndexedDB persista entre sesiones.
    webview.start(
        http_server=True,
        http_port=PUERTO,
        private_mode=False,
        storage_path=carpeta_datos(),
    )


if __name__ == "__main__":
    main()
