/**
 * api.js — Única puerta de salida de datos del frontend.
 *
 * El resto de la aplicación NUNCA hace fetch directo. Llama a API.listarProductos(),
 * API.guardarVenta(), etc. El día que migres a Supabase reescribes SOLO este archivo
 * y la interfaz sigue funcionando sin tocarse.
 *
 * Aquí no hay secretos: la URL del Web App es pública por diseño y no sirve de nada
 * sin un token válido, que solo se obtiene con usuario y contraseña correctos.
 */

const API = (() => {

  // Pega aquí la URL /exec que te da "Implementar > Nueva implementación".
  const URL_API = 'https://script.google.com/macros/s/AKfycbyRU8UpXXNr5HOol8PuYlb-2fFeI7ZJXhPBqpZM6-fWdcho_-ENEbMX-MBufL34nILLWA/exec';

  const CLAVE_TOKEN = 'ayid_token';
  const CLAVE_USER  = 'ayid_usuario';

  /* ---------- Sesión en el navegador ---------- */

  const guardarSesion = (d) => {
    sessionStorage.setItem(CLAVE_TOKEN, d.token);
    sessionStorage.setItem(CLAVE_USER, JSON.stringify({
      usuario: d.usuario, nombre: d.nombre, rol: d.rol
    }));
  };

  const limpiarSesion = () => {
    sessionStorage.removeItem(CLAVE_TOKEN);
    sessionStorage.removeItem(CLAVE_USER);
  };

  const token   = () => sessionStorage.getItem(CLAVE_TOKEN);
  const usuario = () => JSON.parse(sessionStorage.getItem(CLAVE_USER) || 'null');
  const esAdmin = () => (usuario() || {}).rol === 'admin';
  const haySesion = () => !!token();

  /* ---------- Llamada base ---------- */

  /**
   * Content-Type 'text/plain' es intencional: evita el preflight OPTIONS de CORS,
   * que Apps Script no responde. El body sigue siendo JSON.
   */
  async function llamar(accion, params = {}) {
    const body = JSON.stringify({ accion, token: token(), ...params });

    let res;
    try {
      res = await fetch(URL_API, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body,
        redirect: 'follow'
      });
    } catch (e) {
      throw new Error('Sin conexión con el servidor. Revisa tu internet.');
    }

    const json = await res.json();

    if (!json.ok) {
      if (json.codigo === 'SESION_INVALIDA') {
        limpiarSesion();
        document.dispatchEvent(new CustomEvent('sesion:expirada'));
      }
      throw new Error(json.error || 'Error desconocido');
    }
    return json.datos;
  }

  /* ---------- Autenticación ---------- */

  async function login(usuario, password) {
    const d = await llamar('login', { usuario, password });
    guardarSesion(d);
    return d;
  }

  async function logout() {
    try { await llamar('logout'); } catch (e) { /* da igual si falla */ }
    limpiarSesion();
  }

  /* ---------- Catálogos ---------- */

  const listarProductos    = (f = {}) => llamar('listar_productos', f);
  const guardarProducto    = (p)      => llamar('guardar_producto', p);
  const desactivarProducto = (CODIGO) => llamar('desactivar_producto', { CODIGO });
  const siguienteCodigo    = (categoria) => llamar('siguiente_codigo', { categoria });

  const listarCategorias   = ()       => llamar('listar_categorias');
  const guardarCategoria   = (p)      => llamar('guardar_categoria', p);
  const quitarCategoria    = (CLAVE)  => llamar('quitar_categoria', { CLAVE });

  const listarProveedores  = ()       => llamar('listar_proveedores');
  const guardarProveedor   = (p)      => llamar('guardar_proveedor', p);
  const quitarProveedor    = (CLAVE)  => llamar('quitar_proveedor', { CLAVE });

  const listarClientes     = (f = {}) => llamar('listar_clientes', f);
  const guardarCliente     = (p)      => llamar('guardar_cliente', p);

  /* ---------- Movimientos ---------- */

  const guardarMovimiento  = (p)      => llamar('guardar_movimiento', p);
  const guardarVenta       = (p)      => llamar('guardar_venta', p);
  const cancelarMovimiento = (ID_MOV, motivo) => llamar('cancelar_movimiento', { ID_MOV, motivo });
  const listarInventario   = (f = {}) => llamar('listar_inventario', f);
  const recalcularInventario = ()     => llamar('recalcular_inventario');
  const reporteMovimientos = (f = {}) => llamar('reporte_movimientos', f);
  const cuentasPorCobrar   = ()       => llamar('cuentas_por_cobrar');
  const marcarPagado       = (p)      => llamar('marcar_pagado', p);

  /* ---------- Cotizaciones ---------- */

  const listarCotizaciones = (f = {}) => llamar('listar_cotizaciones', f);
  const obtenerCotizacion  = (NUM)    => llamar('obtener_cotizacion', { NUM });
  const guardarCotizacion  = (p)      => llamar('guardar_cotizacion', p);
  const cotizacionAVenta   = (p)      => llamar('cotizacion_a_venta', p);
  const folioCotizacion    = ()       => llamar('folio_cotizacion');

  /** Descarga el PDF de una cotización sin pasar por Drive. */
  async function descargarPdfCotizacion(NUM) {
    const d = await llamar('pdf_cotizacion', { NUM });
    const bin = atob(d.base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = d.nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return d.nombre;
  }

  /* ---------- Gastos y cortes ---------- */

  const guardarGasto   = (p)      => llamar('guardar_gasto', p);
  const listarGastos   = (f = {}) => llamar('listar_gastos', f);
  const cancelarGasto  = (ID_GASTO) => llamar('cancelar_gasto', { ID_GASTO });
  const calcularCorte  = (f = {}) => llamar('calcular_corte', f);
  const cerrarCorte    = (p)      => llamar('cerrar_corte', p);
  const listarCortes   = (f = {}) => llamar('listar_cortes', f);
  const dashboard      = ()       => llamar('dashboard');
  const catalogos      = ()       => llamar('catalogos_sistema');

  return {
    login, logout, usuario, esAdmin, haySesion, limpiarSesion,
    listarProductos, guardarProducto, desactivarProducto, siguienteCodigo,
    listarCategorias, guardarCategoria, quitarCategoria,
    listarProveedores, guardarProveedor, quitarProveedor,
    listarClientes, guardarCliente,
    guardarMovimiento, guardarVenta, cancelarMovimiento,
    listarInventario, recalcularInventario, reporteMovimientos,
    cuentasPorCobrar, marcarPagado,
    listarCotizaciones, obtenerCotizacion, guardarCotizacion,
    descargarPdfCotizacion, cotizacionAVenta, folioCotizacion,
    guardarGasto, listarGastos, cancelarGasto,
    calcularCorte, cerrarCorte, listarCortes, dashboard, catalogos
  };
})();
