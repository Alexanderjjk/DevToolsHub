/**
 * ============================================================
 * DEVTOOLS — about.js
 * Sobre Nosotros / About section
 * Ariesta Studios branding
 * ============================================================
 */

registerSection('about', {
    render() {
        return `
            <div class="about-page">
                <div class="about-hero">
                    <div class="about-hero-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                    </div>
                    <h1>Sobre <span style="color:var(--accent);">DevTools</span></h1>
                    <p class="about-subtitle">Un proyecto de <span style="color:var(--accent);">Ariesta Studios</span></p>
                    <p class="about-desc">DevTools naci&oacute; como herramienta privada interna del equipo de Ariesta Studios. Despu&eacute;s de meses us&aacute;ndola a diario, hemos decidido hacerla p&uacute;blica esperando que a desarrolladores como ustedes pueda serles &uacute;til.</p>
                </div>

                <div class="about-section">
                    <h2>&#9889; Con&oacute;cenos</h2>
                    <p style="color:var(--text-normal);line-height:1.7;margin-bottom:20px;">
                        DevTools es un proyecto de <strong>Ariesta Studios</strong>, un estudio independiente de videojuegos nacido en Cuba. Somos un equipo peque&ntilde;o pero ambicioso, unido por una obsesi&oacute;n compartida: crear experiencias de juego que dejen huella.
                    </p>
                    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;">
                        <a href="https://ariesta-web-bay.vercel.app/" target="_blank" class="btn btn-primary" style="text-decoration:none;display:inline-flex;align-items:center;gap:8px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            Visitar Web
                        </a>
                        <a href="https://discord.com/invite/zJy3bDAeqB" target="_blank" class="btn btn-ghost" style="text-decoration:none;display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border-normal);">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                            Unirse a Discord
                        </a>
                    </div>
                </div>

                <div class="about-section">
                    <h2>&#127918; Alerian &mdash; Nuestro Proyecto</h2>
                    <p style="color:var(--text-normal);line-height:1.7;margin-bottom:16px;">
                        <strong>Alerian</strong> es un RPG Grimdark Deckbuilder Sandbox desarrollado en Godot Engine. Combina la libertad narrativa de una mesa de rol con el combate estrat&eacute;gico de un deckbuilder, en un mundo oscuro donde cada decisi&oacute;n tiene consecuencias permanentes. No te sostiene la mano. Te respeta lo suficiente como para dejarte fallar &mdash; y aprender de ese fracaso.
                    </p>
                    <a href="https://ariesta-web-bay.vercel.app/game.html" target="_blank" class="btn btn-ghost" style="text-decoration:none;display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border-normal);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4"/><path d="M8 10v4"/><circle cx="16" cy="10" r="1"/><circle cx="19" cy="13" r="1"/></svg>
                        Conocer Alerian
                    </a>
                </div>

                <div class="about-grid">
                    <div class="about-card">
                        <div class="about-card-icon">&#128640;</div>
                        <h3>R&aacute;pido y ligero</h3>
                        <p>Aplicaci&oacute;n de escritorio nativa con Python + pywebview. Sin overhead de navegador, consumo m&iacute;nimo de recursos.</p>
                    </div>
                    <div class="about-card">
                        <div class="about-card-icon">&#128274;</div>
                        <h3>Datos locales</h3>
                        <p>Toda tu informaci&oacute;n se almacena localmente en SQLite. Sin servidores externos, sin telemetr&iacute;a. Tus datos son tuyos.</p>
                    </div>
                    <div class="about-card">
                        <div class="about-card-icon">&#9889;</div>
                        <h3>Atajos globales</h3>
                        <p>Accede a funciones clave desde cualquier lugar con atajos de teclado configurables que funcionan incluso fuera de la app.</p>
                    </div>
                    <div class="about-card">
                        <div class="about-card-icon">&#127912;</div>
                        <h3>Personalizable</h3>
                        <p>Elige tu color de acento favorito, reasigna atajos, configura el comportamiento de cierre y m&aacute;s.</p>
                    </div>
                </div>

                <div class="about-section">
                    <h2>&#128187; Tecnolog&iacute;as</h2>
                    <div class="about-tech-grid">
                        <div class="about-tech-item"><span class="about-tech-name">Python</span><span class="about-tech-role">Backend & API</span></div>
                        <div class="about-tech-item"><span class="about-tech-name">pywebview</span><span class="about-tech-role">Motor de ventana</span></div>
                        <div class="about-tech-item"><span class="about-tech-name">WebView2</span><span class="about-tech-role">Runtime Chromium</span></div>
                        <div class="about-tech-item"><span class="about-tech-name">SQLite</span><span class="about-tech-role">Base de datos</span></div>
                        <div class="about-tech-item"><span class="about-tech-name">JavaScript</span><span class="about-tech-role">Frontend</span></div>
                        <div class="about-tech-item"><span class="about-tech-name">CSS3</span><span class="about-tech-role">Estilos</span></div>
                        <div class="about-tech-item"><span class="about-tech-name">pystray</span><span class="about-tech-role">Bandeja del sistema</span></div>
                        <div class="about-tech-item"><span class="about-tech-name">keyboard</span><span class="about-tech-role">Atajos globales</span></div>
                    </div>
                </div>

                <div class="about-section">
                    <h2>&#127760; Navegaci&oacute;n r&aacute;pida</h2>
                    <p style="color:var(--text-muted);margin-bottom:12px;">Usa <kbd>Alt</kbd> + n&uacute;mero para navegar instant&aacute;neamente entre secciones:</p>
                    <div class="about-nav-grid">
                        <div class="about-nav-item"><kbd>Alt+1</kbd><span>Inicio</span></div>
                        <div class="about-nav-item"><kbd>Alt+2</kbd><span>Launcher</span></div>
                        <div class="about-nav-item"><kbd>Alt+3</kbd><span>Docs</span></div>
                        <div class="about-nav-item"><kbd>Alt+4</kbd><span>Notas</span></div>
                        <div class="about-nav-item"><kbd>Alt+5</kbd><span>Diagramas</span></div>
                        <div class="about-nav-item"><kbd>Alt+6</kbd><span>Comandos</span></div>
                        <div class="about-nav-item"><kbd>Alt+7</kbd><span>Tareas</span></div>
                        <div class="about-nav-item"><kbd>Alt+8</kbd><span>Timer</span></div>
                        <div class="about-nav-item"><kbd>Alt+9</kbd><span>Stats</span></div>
                        <div class="about-nav-item"><kbd>Alt+0</kbd><span>Info</span></div>
                    </div>
                </div>

                <div class="about-section">
                    <h2>&#128221; Licencia</h2>
                    <p>DevTools es software de c&oacute;digo abierto y gratuito. Puedes usarlo, modificarlo y distribuirlo libremente.</p>
                </div>

                <div class="about-footer">
                    <p>Hecho con &#10084; por <span style="color:var(--accent);">Ariesta Studios</span></p>
                    <p class="about-footer-ver">DevTools v0.9.6 &mdash; Python + pywebview + SQLite</p>
                </div>
            </div>
        `;
    },

    load() {
        // Nothing dynamic to load
    }
});
