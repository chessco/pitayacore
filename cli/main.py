import sys
import msvcrt
import argparse
from rich.console import Console
from rich.table import Table
from rich.prompt import Prompt, Confirm
from api_client import PitayaCoreAPI

console = Console()

def ask_with_esc(prompt_text, default=""):
    console.print(prompt_text, end="")
    result = ""
    while True:
        ch = msvcrt.getch()
        if ch == b'\x1b': # ESC
            print()
            return "ESC"
        elif ch in (b'\r', b'\n'):
            print()
            return result if result else default
        elif ch == b'\x08': # Backspace
            if len(result) > 0:
                result = result[:-1]
                sys.stdout.write('\b \b')
                sys.stdout.flush()
        elif ch in (b'\x00', b'\xe0'): # Special keys (arrows)
            msvcrt.getch()
        else:
            try:
                char = ch.decode('utf-8')
                result += char
                sys.stdout.write(char)
                sys.stdout.flush()
            except:
                pass


def print_banner():
    banner = r"""
    [bold cyan]
 __        __         _                                 ____ _     ___ 
 \ \      / /__  _ __| | _____ _ __   __ _  ___ ___    / ___| |   |_ _|
  \ \ /\ / / _ \| '__| |/ / __| '_ \ / _` |/ __/ _ \  | |   | |    | | 
   \ V  V / (_) | |  |   <\__ \ |_) | (_| | (_|  __/  | |___| |___ | | 
    \_/\_/ \___/|_|  |_|\_\___/ .__/ \__,_|\___\___|   \____|_____|___|
                              |_|                                      
    [white]ADMINISTRATION TERMINAL[/]
    [/]
    """
    console.print(banner)

from rich.panel import Panel

def _render_items_table(items, title="Resultados", columns=["Título", "Fecha"]):
    if not items:
        console.print(f"[yellow]No hay resultados para mostrar.[/]")
        return

    table = Table(title=title)
    table.add_column("#", style="dim", width=4)
    for col in columns:
        table.add_column(col, style="bold green" if col == "Título" else "cyan")

    for idx, item in enumerate(items):
        created = item.get('createdAt', '')[:10] if item.get('createdAt') else 'Desconocida'
        if "Título" in columns and "Fecha" in columns:
            table.add_row(str(idx + 1), item.get('title', item.get('name', 'Sin título')), created)
        else:
            table.add_row(str(idx + 1), item.get('title', item.get('name', 'Sin título')))

    console.print(table)
    
    choice = ask_with_esc("\n[bold yellow]Escribe el # del ítem para ver su contenido (o ESC para regresar): [/]")
    if choice == "ESC" or not choice.strip():
        return
        
    try:
        idx = int(choice) - 1
        if idx < 0 or idx >= len(items):
            raise ValueError
        selected = items[idx]
        console.print("\n")
        content = selected.get('content') or selected.get('description') or 'Sin contenido visualizable.'
        title = selected.get('title') or selected.get('name') or 'Sin título'
        console.print(Panel(str(content), title=f"[bold green]{title}[/]", border_style="cyan"))
        ask_with_esc("\n[dim]Presiona Enter o ESC para regresar al menú...[/]")
    except ValueError:
        console.print("[red]Selección inválida.[/]")

def list_notes(api: PitayaCoreAPI):
    with console.status("[bold cyan]Obteniendo notas..."):
        notes = api.fetch_notes()
    if not notes:
        console.print("[yellow]No se encontraron notas.[/]")
        return
    _render_items_table(notes, "Todas Tus Notas")

def list_ideas(api: PitayaCoreAPI):
    with console.status("[bold cyan]Obteniendo ideas..."):
        ideas = api.fetch_ideas()
    if not ideas:
        console.print("[yellow]No se encontraron ideas.[/]")
        return
    _render_items_table(ideas, "Tus Ideas")

def list_documents(api: PitayaCoreAPI):
    with console.status("[bold cyan]Obteniendo documentos..."):
        docs = api.fetch_documents()
    if not docs:
        console.print("[yellow]No se encontraron documentos.[/]")
        return
    
    table = Table(title="Tus Documentos")
    table.add_column("#", style="dim", width=4)
    table.add_column("Nombre", style="bold green")
    table.add_column("Tipo", style="cyan")
    
    for idx, doc in enumerate(docs):
        table.add_row(str(idx + 1), doc.get('title', doc.get('name', 'Sin nombre')), doc.get('fileType', 'Desconocido'))
        
    console.print(table)
    ask_with_esc("\n[dim]Presiona Enter o ESC para regresar al menú...[/]")

def ai_assistant(api: PitayaCoreAPI):
    console.print("\n[bold cyan]--- AI Assistant ---[/]")
    console.print("[dim]Escribe tus preguntas. Presiona ESC en cualquier momento para volver al menú principal.[/]")
    while True:
        question = ask_with_esc("\n[bold yellow]Tú: [/]")
        if question == "ESC" or not question.strip():
            console.print("\n[dim]Saliendo del asistente...[/]")
            break
            
        with console.status("[bold cyan]AI está pensando..."):
            answer = api.ask_ai(question)
            
        console.print("\n")
        console.print(Panel(answer, title="[bold magenta]AI Assistant[/]", border_style="magenta"))

def global_search(api: PitayaCoreAPI):
    query = ask_with_esc("\n[bold yellow]Ingresa el texto a buscar en todo el Workspace (ESC para cancelar): [/]")
    if query == "ESC" or not query.strip():
        return
        
    with console.status("[bold cyan]Buscando globalmente..."):
        results = api.global_search(query)
        
    if not results:
        console.print(f"[yellow]No se encontraron coincidencias para '{query}'.[/]")
        return
        
    _render_items_table(results, f"Resultados de Búsqueda para '{query}'")

def create_note(api: PitayaCoreAPI):
    console.print("\n[bold cyan]--- Nueva Nota ---[/]")
    title = ask_with_esc("[bold yellow]Título (o ESC para cancelar): [/]")
    if title == "ESC" or not title:
        console.print("[red]Cancelado.[/]")
        return
        
    console.print("[dim]Escribe el contenido (presiona Enter dos veces para finalizar):[/]")
    lines = []
    while True:
        try:
            line = input()
            if line == "" and (len(lines) == 0 or lines[-1] == ""):
                break
            lines.append(line)
        except EOFError:
            break
            
    content = "\n".join(lines).strip()
    
    with console.status("[bold cyan]Guardando nota en PitayaCore..."):
        result = api.create_note(title, content)
        
    if result:
        console.print(f"\n[bold green]✓ Nota creada exitosamente con ID:[/] {result.get('id')}")
    else:
        console.print("\n[bold red]Hubo un error al crear la nota.[/]")

import os
import json

CONFIG_FILE = "config.json"

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return {}

def save_config(config):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f)

def select_workspace(api: PitayaCoreAPI):
    with console.status("[bold cyan]Buscando Workspaces disponibles..."):
        tenants = api.fetch_tenants()
        
    if not tenants:
        console.print("[red]No se pudieron obtener los Workspaces.[/]")
        return False
        
    console.print("\n[bold yellow]Workspaces disponibles:[/]")
    for idx, tenant in enumerate(tenants):
        console.print(f" [{idx + 1}] {tenant.get('name', 'Desconocido')} ({tenant.get('id')})")
        
    choice = ask_with_esc("\n[bold cyan]Selecciona tu Workspace (Enter para usar el primero, ESC para salir): [/]", default="1")
    if choice == "ESC":
        sys.exit(0)
        
    try:
        idx = int(choice) - 1
        if idx < 0 or idx >= len(tenants):
            raise ValueError
        api.tenant_id = tenants[idx]['id']
        api.headers['x-tenant-id'] = api.tenant_id
        api.client.headers.update({"x-tenant-id": api.tenant_id})
        
        # Guardar en config
        config = load_config()
        config['tenant_id'] = api.tenant_id
        config['tenant_name'] = tenants[idx]['name']
        save_config(config)
        
        console.print(f"\n[bold green]✓ Workspace configurado:[/] {tenants[idx]['name']}")
        return True
    except ValueError:
        console.print("[red]Selección inválida.[/]")
        return False

def main():
    print_banner()
    api = PitayaCoreAPI()
    
    config = load_config()
    if 'tenant_id' in config:
        api.tenant_id = config['tenant_id']
        api.headers['x-tenant-id'] = api.tenant_id
        api.client.headers.update({"x-tenant-id": api.tenant_id})
        console.print(f"[dim]Conectado automáticamente a:[/] {config.get('tenant_name', 'Desconocido')}")
    else:
        console.print("\n[dim]Configuración inicial...[/]")
        select_workspace(api)
    
    while True:
        console.print("\n[bold cyan]=== MENÚ PRINCIPAL ===[/]")
        console.print(" [bold green]1.[/] 📋 Notas")
        console.print(" [bold green]2.[/] ✍️  Crear Nueva Nota")
        console.print(" [bold green]3.[/] 💡 Ideas")
        console.print(" [bold green]4.[/] 📄 Documentos")
        console.print(" [bold green]5.[/] 🤖 AI Assistant")
        console.print(" [bold green]6.[/] 🔎 Búsqueda Global")
        console.print(" [bold green]7.[/] 🏢 Cambiar de Workspace")
        console.print(" [bold green]8.[/] 🚪 Salir")
        
        choice = ask_with_esc("\n[bold yellow]Selecciona una opción [1-8] (o ESC para salir): [/]")
        
        if choice == "ESC" or choice == "8":
            console.print("\n[bold cyan]Cerrando Workspace CLI. ¡Hasta luego![/]")
            sys.exit(0)
        elif choice == "1":
            list_notes(api)
        elif choice == "2":
            create_note(api)
        elif choice == "3":
            list_ideas(api)
        elif choice == "4":
            list_documents(api)
        elif choice == "5":
            ai_assistant(api)
        elif choice == "6":
            global_search(api)
        elif choice == "7":
            select_workspace(api)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        console.print("\n[bold red]Interrumpido por el usuario.[/]")
        sys.exit(0)
