"""
Icon Library — ~50 iconos locales organizados por categoria para Docs.

Cada icono es un string (emoji) que se puede usar como icono visual
cuando el favicon no se puede descargar.  El frontend puede mostrar
estos iconos en un picker para que el usuario elija manualmente.

Los iconos se agrupan por categoria tematica para facilitar la busqueda.
"""

# ===========================================================================
# ICONOS LOCALES — ~50 iconos organizados por categoria
# ===========================================================================

LOCAL_ICONS = {
    # --- Game Engines ---
    "engine": [
        {"id": "engine_unity", "emoji": "\U0001F3AE", "name": "Unity"},
        {"id": "engine_godot", "emoji": "\U0001F680", "name": "Godot"},
        {"id": "engine_unreal", "emoji": "\U0001F31F", "name": "Unreal"},
        {"id": "engine_game", "emoji": "\U0001F3B2", "name": "Game Dev"},
        {"id": "engine_3d", "emoji": "\U0001F4D0", "name": "3D Modelado"},
        {"id": "engine_physics", "emoji": "\u269B\uFE0F", "name": "Fisica"},
        {"id": "engine_audio", "emoji": "\U0001F3B5", "name": "Audio Engine"},
        {"id": "engine_ai", "emoji": "\U0001F916", "name": "IA/Game AI"},
        {"id": "engine_shader", "emoji": "\U0001F3A8", "name": "Shaders"},
        {"id": "engine_vr", "emoji": "\U0001F442", "name": "VR/AR"},
    ],

    # --- Lenguajes de programacion ---
    "language": [
        {"id": "lang_python", "emoji": "\U0001F40D", "name": "Python"},
        {"id": "lang_js", "emoji": "\u26F1\uFE0F", "name": "JavaScript"},
        {"id": "lang_ts", "emoji": "\U0001F4E6", "name": "TypeScript"},
        {"id": "lang_cpp", "emoji": "\u2699\uFE0F", "name": "C/C++"},
        {"id": "lang_csharp", "emoji": "\U0001F535", "name": "C#"},
        {"id": "lang_rust", "emoji": "\U0001F525", "name": "Rust"},
        {"id": "lang_go", "emoji": "\U0001F418", "name": "Go"},
        {"id": "lang_java", "emoji": "\u2615", "name": "Java"},
        {"id": "lang_lua", "emoji": "\U0001F319", "name": "Lua"},
        {"id": "lang_html", "emoji": "\U0001F4C1", "name": "HTML/CSS"},
        {"id": "lang_sql", "emoji": "\U0001F4BE", "name": "SQL"},
        {"id": "lang_shader", "emoji": "\U0001F308", "name": "GLSL/HLSL"},
    ],

    # --- Herramientas ---
    "tool": [
        {"id": "tool_github", "emoji": "\U0001F4BB", "name": "GitHub"},
        {"id": "tool_git", "emoji": "\U0001F500", "name": "Git"},
        {"id": "tool_blender", "emoji": "\U0001F9D9", "name": "Blender"},
        {"id": "tool_aseprite", "emoji": "\U0001F3A8", "name": "Pixel Art"},
        {"id": "tool_ink", "emoji": "\u270F\uFE0F", "name": "Inkscape"},
        {"id": "tool_gimp", "emoji": "\U0001F5BC\uFE0F", "name": "GIMP"},
        {"id": "tool_inkscape", "emoji": "\u2795", "name": "Vector"},
        {"id": "tool_arduino", "emoji": "\U0001F4E1", "name": "Arduino"},
        {"id": "tool_terminal", "emoji": "\U0001F4BB", "name": "Terminal"},
        {"id": "tool_docker", "emoji": "\U0001F433", "name": "Docker"},
        {"id": "tool_db", "emoji": "\U0001F5C4", "name": "Database"},
        {"id": "tool_api", "emoji": "\U0001F517", "name": "API"},
    ],

    # --- Referencias ---
    "reference": [
        {"id": "ref_docs", "emoji": "\U0001F4D6", "name": "Documentacion"},
        {"id": "ref_web", "emoji": "\U0001F310", "name": "Web Docs"},
        {"id": "ref_book", "emoji": "\U0001F4DA", "name": "Libros"},
        {"id": "ref_tutorial", "emoji": "\U0001F393", "name": "Tutoriales"},
        {"id": "ref_video", "emoji": "\U0001F3AC", "name": "Videos"},
        {"id": "ref_forum", "emoji": "\U0001F4AC", "name": "Foros"},
        {"id": "ref_wiki", "emoji": "\U0001F4D0", "name": "Wiki"},
        {"id": "ref_cheatsheet", "emoji": "\U0001F4CB", "name": "Cheat Sheet"},
    ],

    # --- APIs y servicios ---
    "api": [
        {"id": "api_rest", "emoji": "\U0001F310", "name": "REST API"},
        {"id": "api_graphql", "emoji": "\U0001F5A5\uFE0F", "name": "GraphQL"},
        {"id": "api_oauth", "emoji": "\U0001F510", "name": "OAuth/Auth"},
        {"id": "api_cloud", "emoji": "\u2601\uFE0F", "name": "Cloud"},
        {"id": "api_payment", "emoji": "\U0001F4B3", "name": "Pagos"},
        {"id": "api_maps", "emoji": "\U0001F5FA\uFE0F", "name": "Maps"},
        {"id": "api_ai", "emoji": "\U0001F9E0", "name": "AI/ML"},
        {"id": "api_analytics", "emoji": "\U0001F4CA", "name": "Analytics"},
    ],

    # --- General / Personal ---
    "personal": [
        {"id": "per_link", "emoji": "\U0001F517", "name": "Link"},
        {"id": "per_star", "emoji": "\u2B50", "name": "Favorito"},
        {"id": "per_pin", "emoji": "\U0001F4CC", "name": "Fijado"},
        {"id": "per_folder", "emoji": "\U0001F4C2", "name": "Carpeta"},
        {"id": "per_download", "emoji": "\u2B07\uFE0F", "name": "Descarga"},
        {"id": "per_settings", "emoji": "\u2699\uFE0F", "name": "Config"},
        {"id": "per_bugs", "emoji": "\U0001F41B", "name": "Bugs"},
        {"id": "per_design", "emoji": "\U0001F3A8", "name": "Diseno"},
        {"id": "per_music", "emoji": "\U0001F3B5", "name": "Musica"},
        {"id": "per_photo", "emoji": "\U0001F4F7", "name": "Fotos"},
    ],
}


# ===========================================================================
# ICONOS POR DEFECTO POR CATEGORIA DE DOC
# ===========================================================================

CATEGORY_DEFAULT_ICONS = {
    "engine": "\U0001F3AE",
    "tool": "\U0001F527",
    "language": "\U0001F40D",
    "api": "\U0001F310",
    "reference": "\U0001F4D6",
    "custom": "\U0001F4C1",
    "personal": "\u2B50",
}


def get_all_icons() -> list:
    """Retorna todos los iconos como una lista plana de dicts."""
    result = []
    for cat_id, icons in LOCAL_ICONS.items():
        for icon in icons:
            result.append({**icon, "category": cat_id})
    return result


def get_icons_by_category(category: str) -> list:
    """Retorna los iconos de una categoria especifica."""
    return LOCAL_ICONS.get(category, [])


def get_categories() -> list:
    """Retorna las categorias de iconos disponibles."""
    names = {
        "engine": "Game Engines",
        "language": "Lenguajes",
        "tool": "Herramientas",
        "reference": "Referencias",
        "api": "APIs y Servicios",
        "personal": "General",
    }
    return [
        {"id": cat_id, "name": names.get(cat_id, cat_id), "icon": icons[0]["emoji"] if icons else ""}
        for cat_id, icons in LOCAL_ICONS.items()
    ]


def get_default_icon_for_category(category: str) -> str:
    """Retorna el emoji por defecto para una categoria de doc."""
    return CATEGORY_DEFAULT_ICONS.get(category, "\U0001F4C1")


def get_icon_by_id(icon_id: str) -> dict | None:
    """Busca un icono por su ID."""
    for icons in LOCAL_ICONS.values():
        for icon in icons:
            if icon["id"] == icon_id:
                return icon
    return None
