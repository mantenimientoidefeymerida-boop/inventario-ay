/**
 * app.js — Utilidades compartidas por todas las páginas internas.
 * (index.html / login no lo usa: ahí todavía no hay sesión).
 */

const APP = (() => {

  /* ---------- Iconos de la barra lateral (SVG en línea, sin depender de CDN) ---------- */
  const ICONOS = {
    inicio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/></svg>',
    venta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="7" width="17" height="13" rx="1"/><path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7"/><path d="M3.5 12h17"/></svg>',
    catalogo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></svg>',
    cotizacion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 3.5h7l3 3v14H7z"/><path d="M14 3.5v3h3"/><path d="M9.5 12h5M9.5 15h5M9.5 9h2"/></svg>',
    gastos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h14l4 4v3a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"/><circle cx="15" cy="14" r="2"/></svg>',
    corte: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16v4H4z"/><path d="M6 10v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8"/><path d="M12 13v4"/></svg>',
    salir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4"/><path d="M15 16l4-4-4-4"/><path d="M19 12H9"/></svg>',
    alerta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 9v4"/><circle cx="12" cy="16" r="0.6" fill="currentColor"/><path d="M10.3 3.9 2.6 17.5A1 1 0 0 0 3.4 19h17.2a1 1 0 0 0 .9-1.5L13.7 3.9a1 1 0 0 0-1.7 0z"/></svg>'
  };

  const NAV = [
    { href: 'dashboard.html',    icono: 'inicio',     texto: 'Inicio',            todos: true },
    { href: 'venta.html',        icono: 'venta',       texto: 'Punto de venta',    todos: true },
    { href: 'cotizaciones.html', icono: 'cotizacion',  texto: 'Cotizaciones',      todos: true },
    { href: 'catalogo.html',     icono: 'catalogo',    texto: 'Catálogo',          todos: false },
    { href: 'cortes.html',       icono: 'corte',       texto: 'Caja y cobranza',   todos: false }
  ];

  /** Exige sesión activa. Si no hay, manda al login. Llamar al inicio de cada página interna. */
  function exigirSesion() {
    if (!API.haySesion()) {
      window.location.href = 'index.html';
      throw new Error('SIN_SESION');
    }
    return API.usuario();
  }

  /** Exige además que el rol sea admin. Las páginas de solo-admin la llaman antes de montarLayout. */
  function exigirAdmin() {
    const u = exigirSesion();
    if (u.rol !== 'admin') {
      window.location.href = 'dashboard.html';
      throw new Error('SIN_PERMISO');
    }
    return u;
  }

  /**
   * Construye la barra lateral y la barra superior dentro de #app-shell.
   * pagina: el href actual (para marcar el enlace activo).
   * titulo: texto del <h1> en la topbar.
   */
  function montarLayout(pagina, titulo) {
    const u = exigirSesion();
    const esAdmin = u.rol === 'admin';

    const enlaces = NAV
      .filter(item => item.todos || esAdmin)
      .map(item => {
        const activo = item.href === pagina ? ' activo' : '';
        return `<a href="${item.href}" class="${activo.trim()}">${ICONOS[item.icono]}<span>${item.texto}</span></a>`;
      }).join('');

    document.getElementById('app-shell').innerHTML = `
      <div class="app">
        <aside class="sidebar">
          <div class="marca">
            <div class="n1">ACABADOS YUCATÁN</div>
            <div class="n2">INGENIERÍA EN DIRECTO</div>
          </div>
          <nav class="nav">${enlaces}</nav>
          <div class="usuario-box">
            <div class="nombre">${escapar(u.nombre)}</div>
            <div class="rol">${escapar(u.rol)}</div>
            <button id="btn-salir">${ICONOS.salir}<span></span>Salir</button>
          </div>
        </aside>
        <div class="contenido">
          <header class="topbar">
            <h1>${titulo}</h1>
            <div class="reloj" id="reloj"></div>
          </header>
          <main class="main" id="main"></main>
        </div>
      </div>
      <div id="toasts"></div>
    `;

    document.getElementById('btn-salir').addEventListener('click', async () => {
      await API.logout();
      window.location.href = 'index.html';
    });

    iniciarReloj();
    document.addEventListener('sesion:expirada', () => {
      toast('Tu sesión expiró. Inicia sesión otra vez.', 'error');
      setTimeout(() => window.location.href = 'index.html', 1400);
    });

    return u;
  }

  function iniciarReloj() {
    const el = document.getElementById('reloj');
    if (!el) return;
    const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    const pintar = () => {
      const d = new Date();
      const fecha = `${DIAS[d.getDay()]} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
      const hora = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      el.innerHTML = `<div class="fecha">${fecha}</div><div>${hora}</div>`;
    };
    pintar();
    setInterval(pintar, 30000);
  }

  /* ---------- Formato ---------- */

  function money(n) {
    n = Number(n) || 0;
    return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapar(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ---------- Toasts ---------- */

  function toast(mensaje, tipo = 'normal') {
    const cont = document.getElementById('toasts');
    if (!cont) { alert(mensaje); return; }
    const div = document.createElement('div');
    div.className = 'toast' + (tipo !== 'normal' ? ' ' + tipo : '');
    div.textContent = mensaje;
    cont.appendChild(div);
    setTimeout(() => div.remove(), 4200);
  }

  /** Muestra el mensaje de un error de API de forma consistente. */
  function errorApi(e, contexto) {
    console.error(contexto || '', e);
    toast(e.message || 'Ocurrió un error inesperado.', 'error');
  }

  /* ---------- Modal ---------- */

  /** Abre un modal genérico. html debe incluir .modal-caja con su propio contenido. */
  function abrirModal(html) {
    cerrarModal();
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.id = 'modal-actual';
    fondo.innerHTML = html;
    document.body.appendChild(fondo);
    fondo.addEventListener('click', (e) => { if (e.target === fondo) cerrarModal(); });
    document.addEventListener('keydown', escCierraModal);
    return fondo;
  }

  function escCierraModal(e) {
    if (e.key === 'Escape') cerrarModal();
  }

  function cerrarModal() {
    const m = document.getElementById('modal-actual');
    if (m) m.remove();
    document.removeEventListener('keydown', escCierraModal);
  }

  return { exigirSesion, exigirAdmin, montarLayout, money, escapar, toast, errorApi,
           abrirModal, cerrarModal, ICONOS };
})();
