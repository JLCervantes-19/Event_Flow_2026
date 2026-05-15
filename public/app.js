// public/app.js
// ──────────────────────────────────────────────────────────────
//  EventFlow — JavaScript Vanilla (ES Modules)
//  Lógica del SPA: navegación, fetch a la API, Chart.js
// ──────────────────────────────────────────────────────────────

const API = '/api';

// ── Estado global ─────────────────────────────────────────────
let currentUser = null;
let allEvents = [];
let charts = {};

// ════════════════════════════════════════════════════════════════
//  AUTENTICACIÓN
// ════════════════════════════════════════════════════════════════
function showLogin() {
  document.getElementById('login-overlay').classList.remove('hidden');
}

function showApp() {
  document.getElementById('login-overlay').classList.add('hidden');
  updateNavForRole(currentUser.rol);
  switchView('explore');
}

function updateNavForRole(rol) {
  const isAdmin = rol === 'admin';
  document.querySelectorAll('.nav-admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });
  document.querySelectorAll('.mobile-nav-admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });

  const initiales = currentUser.nombre.split(' ').slice(0, 2).map(n => n[0].toUpperCase()).join('');
  const rolLabel = { admin: 'Administrador', organizador: 'Organizador', cliente: 'Usuario' }[rol] || rol;

  const avatar = document.getElementById('nav-user-avatar');
  const nameEl = document.getElementById('nav-user-name');
  const roleEl = document.getElementById('nav-user-role');
  const mobileInfo = document.getElementById('mobile-user-info');

  if (avatar)  avatar.textContent = initiales;
  if (nameEl)  nameEl.textContent = currentUser.nombre;
  if (roleEl)  roleEl.textContent = rolLabel;
  if (mobileInfo) mobileInfo.textContent = `${currentUser.nombre} · ${rolLabel}`;

  if (isAdmin) {
    if (avatar) avatar.style.cssText = 'background:rgba(139,92,246,.15);color:#7c3aed;border:1px solid rgba(139,92,246,.3);width:2rem;height:2rem;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:"JetBrains Mono",monospace;font-size:.75rem;font-weight:700;';
  }
}

async function submitLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  const correo = document.getElementById('login-correo').value.trim();
  const password = document.getElementById('login-password').value;

  btn.disabled = true;
  btn.textContent = 'Verificando...';
  errEl.classList.add('hidden');

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, password }),
    });
    const json = await res.json();

    if (!json.ok) throw new Error(json.message || 'Credenciales incorrectas');

    currentUser = json.data;
    localStorage.setItem('ef_user', JSON.stringify(currentUser));
    showApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Ingresar';
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('ef_user');
  showLogin();
  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
  document.getElementById('view-explore').classList.remove('hidden');
}

function fillDemo(correo, password) {
  document.getElementById('login-correo').value = correo;
  document.getElementById('login-password').value = password;
}

window.submitLogin    = submitLogin;
window.logout         = logout;
window.fillDemo       = fillDemo;

// ════════════════════════════════════════════════════════════════
//  NAVEGACIÓN SPA
// ════════════════════════════════════════════════════════════════
function switchView(view) {
  if ((view === 'dashboard' || view === 'admin') && currentUser?.rol !== 'admin') {
    showToast('Solo los administradores pueden acceder a esta sección', 'error');
    return;
  }

  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-link').forEach(el => el.classList.remove('active'));

  document.getElementById(`view-${view}`).classList.remove('hidden');
  const navLink = document.querySelector(`[data-view="${view}"]`);
  if (navLink) navLink.classList.add('active');
  
  // También activar en menú móvil
  const mobileLinks = document.querySelectorAll(`.mobile-nav-link[data-view="${view}"]`);
  mobileLinks.forEach(link => link.classList.add('active'));

  if (view === 'explore') loadEvents();
  if (view === 'dashboard') loadDashboard();
  if (view === 'concluidos') loadConcludedEvents();
  if (view === 'admin') {
    switchAdminTab('eventos');
    loadAdminEvents();
  }
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  menu.classList.toggle('open');
}

// ════════════════════════════════════════════════════════════════
//  UTILIDADES
// ════════════════════════════════════════════════════════════════
const fmt = {
  currency: (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n),
  date:     (d) => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
  shortDate:(d) => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
  number:   (n) => new Intl.NumberFormat('es-CO').format(n),
};

const EMOJI = { Música:'🎵', Tecnología:'💻', Arte:'🎨', Deportes:'⚽', Educación:'📚', Negocios:'💼', Otro:'📌' };
const CAT_COLORS = {
  Música:'#c084fc', Tecnología:'#22d3ee', Arte:'#fbbf24',
  Deportes:'#4ade80', Educación:'#fb923c', Negocios:'#818cf8', Otro:'#94a3b8'
};
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

async function apiFetch(url) {
  const res = await fetch(API + url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  const inner = document.getElementById('toast-inner');
  const icon  = document.getElementById('toast-icon');
  document.getElementById('toast-msg').textContent = msg;
  icon.textContent = type === 'success' ? '✓' : '✕';
  inner.style.borderColor = type === 'success' ? 'rgba(251,191,36,.4)' : 'rgba(239,68,68,.4)';
  icon.style.color = type === 'success' ? '#fbbf24' : '#f87171';
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

// ════════════════════════════════════════════════════════════════
//  EXPLORADOR DE EVENTOS
// ════════════════════════════════════════════════════════════════
async function loadEvents() {
  try {
    const data = await apiFetch('/events?limit=24');
    allEvents = data.data ?? data;
    renderEvents(allEvents);
  } catch (e) {
    // En modo demo sin backend, genera datos simulados
    allEvents = generateDemoEvents();
    renderEvents(allEvents);
    console.info('[EventFlow] Usando datos demo (sin conexión al backend)');
  }
}

function generateDemoEvents() {
  const cats = ['Música','Tecnología','Arte','Deportes','Educación','Negocios'];
  const places = ['Bogotá','Medellín','Cartagena','Cali','Barranquilla'];
  return Array.from({ length: 12 }, (_, i) => ({
    id: `demo-${i}`,
    titulo: [`React Summit Colombia`, `Festival Jazz 2025`, `Expo Arte Moderno`,
             `DevFest Caribe`, `Copa Fútbol Regional`, `Foro Empresarial`,
             `Noche de Salsa`, `Hackathon IA`, `Bienal de Arte`,
             `CrossFit Championship`, `MBA Masterclass`, `Tech Talks Vol.3`][i],
    categoria: cats[i % 6],
    lugar: places[i % 5],
    fecha: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
    precio: [45000,80000,35000,120000,25000,150000,60000,90000,55000,40000,200000,75000][i],
    capacidad: [200,500,150,300,400,250,180,120,220,350,80,400][i],
    organizadorId: { nombre: ['Carlos Vélez','María Torres','Luis Pérez'][i % 3] },
  }));
}

function renderEvents(events) {
  const grid = document.getElementById('events-grid');
  const count = document.getElementById('events-count');
  count.textContent = `${events.length} evento${events.length !== 1 ? 's' : ''}`;

  if (!events.length) {
    grid.innerHTML = `<div class="col-span-full text-center py-16" style="color:var(--text-muted);">
      <p class="text-4xl mb-3">🔍</p>
      <p class="font-display font-semibold">Sin resultados</p>
      <p class="text-sm mt-1">Intenta con otros filtros</p>
    </div>`;
    return;
  }

  grid.innerHTML = events.map((e, i) => {
    const cat = e.categoria || 'Otro';
    const org = e.organizadorId?.nombre ?? 'Organizador';
    const delay = (i % 4) * 0.08;
    return `
    <article class="event-card fade-up" style="animation-delay:${delay}s;opacity:0;">
      <div class="event-img" style="background:linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%);">
        <span style="font-size:3.5rem;filter:drop-shadow(0 4px 12px rgba(0,0,0,.3));">${EMOJI[cat] ?? '📌'}</span>
        <div class="absolute top-3 left-3">
          <span class="badge" style="background:rgba(255,255,255,.95);color:#3b82f6;font-weight:700;border:none;">${cat}</span>
        </div>
        <div class="absolute top-3 right-3 font-mono text-xs font-bold"
             style="color:#fff;background:rgba(0,0,0,.4);padding:.35rem .75rem;border-radius:99px;backdrop-filter:blur(8px);">
          ${fmt.currency(e.precio)}
        </div>
      </div>
      <div class="p-4 flex flex-col gap-2 flex-1" style="background:linear-gradient(135deg, #e0f2fe 0%, #dbeafe 50%, #e0e7ff 100%);">
        <h3 class="font-display font-bold text-base leading-tight" style="color:#1e293b;">${e.titulo}</h3>
        <div class="flex items-center gap-3 text-xs" style="color:#475569;">
          <span>📅 ${fmt.shortDate(e.fecha)}</span>
          <span>📍 ${e.lugar}</span>
        </div>
        <div class="flex items-center gap-2 mt-auto pt-3 border-t" style="border-color:rgba(59,130,246,.2);">
          <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
               style="background:rgba(59,130,246,.15);color:#3b82f6;font-family:'JetBrains Mono',monospace;">
            ${org.charAt(0)}
          </div>
          <span class="text-xs flex-1 truncate" style="color:#475569;font-weight:500;">${org}</span>
          <button
            onclick="openReserveModal('${e.id || e._id}','${e.titulo}')"
            class="btn btn-primary text-xs py-1.5 px-4"
            style="font-size:0.75rem;">
            Reservar
          </button>
        </div>
      </div>
    </article>`;
  }).join('');
}

function filterEvents() {
  const q   = document.getElementById('search-input').value.toLowerCase();
  const cat = document.getElementById('cat-filter').value;
  const filtered = allEvents.filter(e =>
    (!q   || e.titulo.toLowerCase().includes(q)) &&
    (!cat || e.categoria === cat)
  );
  renderEvents(filtered);
}

// ════════════════════════════════════════════════════════════════
//  DASHBOARD — carga todos los endpoints en paralelo
// ════════════════════════════════════════════════════════════════
async function loadDashboard() {
  const year = document.getElementById('year-select').value;

  // Mostrar skeletons
  document.getElementById('kpi-section').innerHTML = Array(5).fill(
    `<div class="skeleton h-28 col-span-1"></div>`
  ).join('');

  // Destruir charts previos
  ['mensual','categorias','top-eventos'].forEach(k => destroyChart(k));

  try {
    const [kpis, topEventos, categorias, organizadores, mensual] = await Promise.all([
      apiFetch('/dashboard/kpis'),
      apiFetch('/dashboard/top-eventos'),
      apiFetch('/dashboard/ingresos-por-categoria'),
      apiFetch('/dashboard/ranking-organizadores'),
      apiFetch(`/dashboard/historico-mensual?year=${year}`),
    ]);

    renderKPIs(kpis);
    renderChartMensual(Array.isArray(mensual) ? mensual : mensual.data ?? []);
    renderChartCategorias(categorias);
    renderChartTopEventos(topEventos);
    renderTopEventosTable(topEventos);
    renderRankingTable(organizadores);

  } catch (e) {
    // Modo demo con datos simulados
    console.info('[EventFlow] Dashboard en modo demo');
    const demo = generateDemoDashboard(year);
    renderKPIs(demo.kpis);
    renderChartMensual(demo.mensual);
    renderChartCategorias(demo.categorias);
    renderChartTopEventos(demo.topEventos);
    renderTopEventosTable(demo.topEventos);
    renderRankingTable(demo.organizadores);
  }
}

// ── Demo data generator ────────────────────────────────────────
function generateDemoDashboard(year) {
  const cats = ['Música','Tecnología','Arte','Deportes','Educación','Negocios'];
  return {
    kpis: { totalReservas: 1247, totalEntradas: 3891, ingresoTotal: 187456000, totalEventos: 34, reservasMes: 89 },
    mensual: MESES.map((_, i) => ({
      periodo: `${year}-${String(i+1).padStart(2,'0')}`,
      mes: i+1,
      totalReservas: Math.floor(40 + Math.random()*120),
      ingresosMes:   Math.floor(8000000 + Math.random()*25000000),
    })),
    categorias: cats.map(c => ({
      categoria: c,
      ingresoTotal: Math.floor(15000000 + Math.random()*50000000),
      cantidadReservas: Math.floor(50 + Math.random()*250),
    })),
    topEventos: [
      { titulo:'React Summit Colombia', categoria:'Tecnología', totalEntradas:312, ingresoGenerado:28080000 },
      { titulo:'Festival Jazz 2025',    categoria:'Música',     totalEntradas:280, ingresoGenerado:22400000 },
      { titulo:'Hackathon IA',          categoria:'Tecnología', totalEntradas:245, ingresoGenerado:22050000 },
      { titulo:'Foro Empresarial',      categoria:'Negocios',   totalEntradas:198, ingresoGenerado:29700000 },
      { titulo:'Expo Arte Moderno',     categoria:'Arte',       totalEntradas:176, ingresoGenerado:6160000  },
    ],
    organizadores: [
      { nombre:'Carlos Vélez',  totalIngresos:68000000, totalEventos:8,  totalEntradas:892 },
      { nombre:'María Torres',  totalIngresos:52000000, totalEventos:6,  totalEntradas:643 },
      { nombre:'Luis Pérez',    totalIngresos:38000000, totalEventos:5,  totalEntradas:512 },
      { nombre:'Ana Martínez',  totalIngresos:29000000, totalEventos:4,  totalEntradas:380 },
    ],
  };
}

// ════════════════════════════════════════════════════════════════
//  RENDER: KPI CARDS
// ════════════════════════════════════════════════════════════════
function renderKPIs(data) {
  const kpis = [
    { label:'Ingresos Totales', value: fmt.currency(data.ingresoTotal), icon:'💰', accent:'amber', sub:'confirmadas' },
    { label:'Total Reservas',  value: fmt.number(data.totalReservas),   icon:'🎫', accent:'cyan',  sub:'confirmadas' },
    { label:'Entradas Vendidas',value:fmt.number(data.totalEntradas),   icon:'🎟️', accent:'amber', sub:'unidades' },
    { label:'Eventos Activos', value: fmt.number(data.totalEventos),    icon:'🎪', accent:'cyan',  sub:'publicados' },
    { label:'Reservas este mes',value:fmt.number(data.reservasMes),     icon:'📈', accent:'amber', sub:'mes actual' },
  ];

  document.getElementById('kpi-section').innerHTML = kpis.map((k, i) => `
    <div class="kpi-card ${k.accent === 'cyan' ? 'cyan' : ''} fade-up" style="animation-delay:${i*.06}s;opacity:0;">
      <div class="flex items-start justify-between mb-3">
        <span class="text-xl">${k.icon}</span>
        <span class="badge" style="background:rgba(${k.accent==='amber'?'251,191,36':'34,211,238'},.1);color:var(--${k.accent});">
          ${k.sub}
        </span>
      </div>
      <p class="font-mono font-bold text-xl sm:text-2xl mb-1" style="color:var(--${k.accent});">${k.value}</p>
      <p class="text-xs" style="color:var(--text-muted);font-family:'JetBrains Mono',monospace;letter-spacing:.04em;">
        ${k.label.toUpperCase()}
      </p>
    </div>
  `).join('');
}

// ════════════════════════════════════════════════════════════════
//  RENDER: CHART — Histórico mensual (línea dual)
// ════════════════════════════════════════════════════════════════
function renderChartMensual(data) {
  destroyChart('mensual');
  const ctx = document.getElementById('chart-mensual');
  if (!ctx) return;

  // Rellenar los 12 meses aunque no haya datos
  const byMonth = {};
  data.forEach(d => { byMonth[d.mes] = d; });
  const labels   = MESES;
  const reservas = Array.from({length:12}, (_,i) => byMonth[i+1]?.totalReservas ?? 0);
  const ingresos = Array.from({length:12}, (_,i) => (byMonth[i+1]?.ingresosMes ?? 0) / 1_000_000);

  charts['mensual'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Reservas',
          data: reservas,
          borderColor: '#22d3ee',
          backgroundColor: 'rgba(34,211,238,.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#22d3ee',
          pointRadius: 4,
          yAxisID: 'y',
        },
        {
          label: 'Ingresos (M COP)',
          data: ingresos,
          borderColor: '#fbbf24',
          backgroundColor: 'rgba(251,191,36,.06)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#fbbf24',
          pointRadius: 4,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#64748b', font: { family: 'JetBrains Mono', size: 11 }, boxWidth: 10, padding: 16 }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          borderColor: 'rgba(255,255,255,.1)',
          borderWidth: 1,
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          titleFont: { family: 'Syne', weight: 'bold' },
          bodyFont: { family: 'JetBrains Mono', size: 11 },
          callbacks: {
            label: (ctx) => ctx.datasetIndex === 1
              ? ` ${ctx.raw.toFixed(1)}M COP`
              : ` ${ctx.raw} reservas`
          }
        }
      },
      scales: {
        x: { ticks: { color:'#475569', font:{family:'JetBrains Mono',size:10} }, grid:{color:'rgba(255,255,255,.04)'} },
        y: {
          position:'left',
          ticks: { color:'#22d3ee', font:{family:'JetBrains Mono',size:10} },
          grid: { color:'rgba(255,255,255,.04)' },
        },
        y1: {
          position:'right',
          ticks: { color:'#fbbf24', font:{family:'JetBrains Mono',size:10}, callback: v => `${v}M` },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

// ════════════════════════════════════════════════════════════════
//  RENDER: CHART — Ingresos por categoría (donut)
// ════════════════════════════════════════════════════════════════
function renderChartCategorias(data) {
  destroyChart('categorias');
  const ctx = document.getElementById('chart-categorias');
  if (!ctx) return;

  const sorted = [...data].sort((a,b) => b.ingresoTotal - a.ingresoTotal);

  charts['categorias'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sorted.map(d => d.categoria),
      datasets: [{
        data: sorted.map(d => d.ingresoTotal),
        backgroundColor: sorted.map(d => CAT_COLORS[d.categoria] ?? '#94a3b8'),
        borderColor: '#0a0f1e',
        borderWidth: 3,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color:'#64748b', font:{family:'JetBrains Mono',size:10}, boxWidth:10, padding:10 }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          borderColor: 'rgba(255,255,255,.1)',
          borderWidth: 1,
          titleFont: { family: 'Syne', weight:'bold' },
          bodyFont:  { family: 'JetBrains Mono', size:11 },
          callbacks: {
            label: (ctx) => ` ${fmt.currency(ctx.raw)}`
          }
        }
      }
    }
  });
}

// ════════════════════════════════════════════════════════════════
//  RENDER: CHART — Top 5 eventos (barra horizontal)
// ════════════════════════════════════════════════════════════════
function renderChartTopEventos(data) {
  destroyChart('top-eventos');
  const ctx = document.getElementById('chart-top-eventos');
  if (!ctx) return;

  const labels  = data.map(d => d.titulo.length > 20 ? d.titulo.slice(0,18)+'…' : d.titulo);
  const values  = data.map(d => d.totalEntradas);
  const colors  = data.map(d => CAT_COLORS[d.categoria] ?? '#fbbf24');

  charts['top-eventos'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Entradas vendidas',
        data: values,
        backgroundColor: colors.map(c => c + '33'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 6,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          borderColor: 'rgba(255,255,255,.1)',
          borderWidth: 1,
          titleFont: { family: 'Syne', weight:'bold' },
          bodyFont:  { family: 'JetBrains Mono', size:11 },
        }
      },
      scales: {
        x: { ticks:{color:'#475569', font:{family:'JetBrains Mono',size:10}}, grid:{color:'rgba(255,255,255,.04)'} },
        y: { ticks:{color:'#94a3b8', font:{family:'DM Sans',size:11}},       grid:{display:false} },
      }
    }
  });
}

// ════════════════════════════════════════════════════════════════
//  RENDER: TABLA Top Eventos
// ════════════════════════════════════════════════════════════════
function renderTopEventosTable(data) {
  document.getElementById('top-eventos-table').innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Evento</th>
          <th>Categoría</th>
          <th style="text-align:right;">Entradas</th>
          <th style="text-align:right;">Ingresos</th>
        </tr>
      </thead>
      <tbody>
        ${data.map((e, i) => `
          <tr>
            <td><span class="font-mono font-bold" style="color:var(--amber);">0${i+1}</span></td>
            <td class="font-display font-semibold text-xs">${e.titulo}</td>
            <td><span class="badge cat-${e.categoria}">${e.categoria}</span></td>
            <td class="font-mono text-xs text-right" style="color:var(--cyan);">${fmt.number(e.totalEntradas)}</td>
            <td class="font-mono text-xs text-right" style="color:var(--amber);">${fmt.currency(e.ingresoGenerado)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

// ════════════════════════════════════════════════════════════════
//  RENDER: TABLA Ranking Organizadores
// ════════════════════════════════════════════════════════════════
function renderRankingTable(data) {
  const maxIngresos = Math.max(...data.map(d => d.totalIngresos), 1);

  document.getElementById('ranking-table').innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Organizador</th>
          <th>Eventos</th>
          <th style="text-align:right;">Entradas</th>
          <th>Ingresos</th>
        </tr>
      </thead>
      <tbody>
        ${data.map((o, i) => {
          const pct = ((o.totalIngresos / maxIngresos) * 100).toFixed(0);
          const medal = ['🥇','🥈','🥉'][i] ?? `#${i+1}`;
          return `
          <tr>
            <td>
              <div class="flex items-center gap-2">
                <span class="text-base">${medal}</span>
                <div>
                  <p class="font-display font-semibold text-xs leading-tight">${o.nombre}</p>
                  <p class="font-mono text-xs" style="color:var(--text-muted);">${o.correo ?? ''}</p>
                </div>
              </div>
            </td>
            <td class="font-mono text-xs" style="color:var(--cyan);">${o.totalEventos}</td>
            <td class="font-mono text-xs text-right">${fmt.number(o.totalEntradas)}</td>
            <td style="min-width:120px;">
              <div class="font-mono text-xs mb-1" style="color:var(--amber);">${fmt.currency(o.totalIngresos)}</div>
              <div style="background:rgba(255,255,255,.08);border-radius:99px;height:4px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#fbbf24,#f97316);border-radius:99px;transition:width .6s ease;"></div>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

// ════════════════════════════════════════════════════════════════
//  MODAL CREAR EVENTO
// ════════════════════════════════════════════════════════════════
function openModal(type) {
  document.getElementById('modal-overlay').classList.add('open');
}

function openReserveModal(id, titulo) {
  // Abrir el modal de reserva con el evento pre-seleccionado
  openReservationModal(null, id, titulo);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function closeModalOverlay(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

async function submitCreateEvent(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  data.precio    = Number(data.precio);
  data.capacidad = Number(data.capacidad) || 100;

  try {
    const res = await fetch(`${API}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);
    showToast('Evento creado exitosamente ✓');
    closeModal();
    form.reset();
    loadEvents();
  } catch (err) {
    showToast(err.message || 'Error al crear el evento', 'error');
  }
}

// Exponer funciones globales para los onclick del HTML
window.switchView     = switchView;
window.filterEvents   = filterEvents;
window.openModal      = openModal;
window.openReserveModal = openReserveModal;
window.closeModal     = closeModal;
window.closeModalOverlay = closeModalOverlay;
window.submitCreateEvent = submitCreateEvent;
window.loadDashboard  = loadDashboard;

// ════════════════════════════════════════════════════════════════
//  ADMINISTRACIÓN - TABS
// ════════════════════════════════════════════════════════════════
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.admin-tab-content').forEach(el => el.classList.add('hidden'));
  
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`admin-tab-${tab}`).classList.remove('hidden');
  
  if (tab === 'eventos') loadAdminEvents();
  if (tab === 'reservas') loadAdminReservations();
  if (tab === 'usuarios') loadAdminUsers();
}

// ════════════════════════════════════════════════════════════════
//  ADMINISTRACIÓN - EVENTOS
// ════════════════════════════════════════════════════════════════
let adminEventsData = [];

async function loadAdminEvents() {
  try {
    const q = document.getElementById('admin-search-eventos')?.value || '';
    const categoria = document.getElementById('admin-filter-categoria')?.value || '';
    
    let url = `${API}/events?limit=100`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (categoria) url += `&categoria=${encodeURIComponent(categoria)}`;
    
    const res = await fetch(url);
    const json = await res.json();
    adminEventsData = json.data || json;
    renderAdminEventsTable(adminEventsData);
  } catch (e) {
    console.error('Error loading admin events:', e);
    showToast('Error al cargar eventos', 'error');
  }
}

function renderAdminEventsTable(events) {
  const container = document.getElementById('admin-eventos-table');
  
  if (!events.length) {
    container.innerHTML = `<div class="text-center py-12" style="color:var(--text-muted);">
      <p class="text-3xl mb-2">📭</p>
      <p>No hay eventos para mostrar</p>
    </div>`;
    return;
  }
  
  // Vista de tabla (desktop)
  const tableView = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Título</th>
          <th>Categoría</th>
          <th>Fecha</th>
          <th>Lugar</th>
          <th style="text-align:right;">Precio</th>
          <th style="text-align:center;">Capacidad</th>
          <th>Organizador</th>
          <th style="text-align:center;">Estado</th>
          <th style="text-align:center;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${events.map(e => `
          <tr>
            <td class="font-display font-semibold text-sm">${e.titulo}</td>
            <td><span class="badge cat-${e.categoria}">${e.categoria}</span></td>
            <td class="font-mono text-xs">${fmt.shortDate(e.fecha)}</td>
            <td class="text-xs">${e.lugar}</td>
            <td class="font-mono text-xs text-right" style="color:var(--primary);">${fmt.currency(e.precio)}</td>
            <td class="font-mono text-xs text-center">${e.capacidad}</td>
            <td class="text-xs">${e.organizadorId?.nombre || 'N/A'}</td>
            <td class="text-center">
              <span class="badge" style="background:${e.activo ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)'};color:${e.activo ? '#10b981' : '#ef4444'};border:1px solid ${e.activo ? 'rgba(16,185,129,.2)' : 'rgba(239,68,68,.2)'};">
                ${e.activo ? 'Activo' : 'Inactivo'}
              </span>
            </td>
            <td>
              <div class="flex gap-2 justify-center">
                <button class="btn-action btn-edit" onclick="editEvent('${e.id || e._id}')">✏️ Editar</button>
                <button class="btn-action btn-delete" onclick="confirmDeleteEvent('${e.id || e._id}', '${e.titulo}')">🗑️ Eliminar</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  // Vista de cards (móvil)
  const cardsView = events.map(e => `
    <div class="mobile-card">
      <div class="flex justify-between items-start mb-3">
        <h3 class="font-display font-bold text-base">${e.titulo}</h3>
        <span class="badge cat-${e.categoria}">${e.categoria}</span>
      </div>
      <div class="mobile-card-row">
        <span class="mobile-card-label">Fecha</span>
        <span class="mobile-card-value font-mono">${fmt.shortDate(e.fecha)}</span>
      </div>
      <div class="mobile-card-row">
        <span class="mobile-card-label">Lugar</span>
        <span class="mobile-card-value">${e.lugar}</span>
      </div>
      <div class="mobile-card-row">
        <span class="mobile-card-label">Precio</span>
        <span class="mobile-card-value font-mono" style="color:var(--primary);">${fmt.currency(e.precio)}</span>
      </div>
      <div class="mobile-card-row">
        <span class="mobile-card-label">Capacidad</span>
        <span class="mobile-card-value font-mono">${e.capacidad}</span>
      </div>
      <div class="mobile-card-row">
        <span class="mobile-card-label">Organizador</span>
        <span class="mobile-card-value">${e.organizadorId?.nombre || 'N/A'}</span>
      </div>
      <div class="mobile-card-row">
        <span class="mobile-card-label">Estado</span>
        <span class="badge" style="background:${e.activo ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)'};color:${e.activo ? '#10b981' : '#ef4444'};border:1px solid ${e.activo ? 'rgba(16,185,129,.2)' : 'rgba(239,68,68,.2)'};">
          ${e.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>
      <div class="flex gap-2 mt-3">
        <button class="btn-action btn-edit flex-1" onclick="editEvent('${e.id || e._id}')">✏️ Editar</button>
        <button class="btn-action btn-delete flex-1" onclick="confirmDeleteEvent('${e.id || e._id}', '${e.titulo}')">🗑️ Eliminar</button>
      </div>
    </div>
  `).join('');
  
  container.innerHTML = tableView + cardsView;
}

// ════════════════════════════════════════════════════════════════
//  MODAL EVENTO - CREAR/EDITAR
// ════════════════════════════════════════════════════════════════
let currentEventId = null;

function openEventModal(eventId = null) {
  currentEventId = eventId;
  const modal = document.getElementById('modal-event');
  const form = document.getElementById('event-form');
  form.reset();
  
  // Cargar organizadores primero
  loadOrganizadores().then(() => {
    if (eventId) {
      // Modo edición
      document.getElementById('event-modal-subtitle').textContent = '// EDITAR EVENTO';
      document.getElementById('event-modal-title').textContent = 'Editar Evento';
      document.getElementById('event-submit-btn').textContent = 'Guardar Cambios';
      
      // Cargar datos del evento
      const event = adminEventsData.find(e => (e.id || e._id) === eventId);
      if (event) {
        document.getElementById('event-id').value = eventId;
        document.getElementById('event-titulo').value = event.titulo;
        document.getElementById('event-fecha').value = new Date(event.fecha).toISOString().slice(0, 16);
        document.getElementById('event-categoria').value = event.categoria;
        document.getElementById('event-lugar').value = event.lugar;
        document.getElementById('event-precio').value = event.precio;
        document.getElementById('event-capacidad').value = event.capacidad;
        document.getElementById('event-organizadorId').value = event.organizadorId?._id || event.organizadorId?.id || event.organizadorId;
        document.getElementById('event-descripcion').value = event.descripcion || '';
      }
    } else {
      // Modo creación
      document.getElementById('event-modal-subtitle').textContent = '// NUEVO EVENTO';
      document.getElementById('event-modal-title').textContent = 'Crear Evento';
      document.getElementById('event-submit-btn').textContent = 'Crear Evento';
    }
    
    modal.classList.add('open');
  });
}

function closeEventModal(e) {
  if (e && e.target !== document.getElementById('modal-event')) return;
  document.getElementById('modal-event').classList.remove('open');
  currentEventId = null;
}

async function submitEventForm(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  // Convertir tipos
  data.precio = Number(data.precio);
  data.capacidad = Number(data.capacidad);
  delete data.id; // No enviar el ID en el body
  
  try {
    const url = currentEventId ? `${API}/events/${currentEventId}` : `${API}/events`;
    const method = currentEventId ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);
    
    showToast(currentEventId ? 'Evento actualizado ✓' : 'Evento creado ✓');
    closeEventModal();
    loadAdminEvents();
    loadEvents(); // Actualizar vista de exploración también
  } catch (err) {
    showToast(err.message || 'Error al guardar evento', 'error');
  }
}

function editEvent(id) {
  openEventModal(id);
}

// ════════════════════════════════════════════════════════════════
//  MODAL CONFIRMACIÓN - ELIMINAR EVENTO
// ════════════════════════════════════════════════════════════════
let confirmAction = null;

function confirmDeleteEvent(id, titulo) {
  document.getElementById('confirm-title').textContent = '¿Eliminar evento?';
  document.getElementById('confirm-message').textContent = `Se desactivará el evento "${titulo}". Esta acción se puede revertir.`;
  document.getElementById('confirm-action-btn').textContent = 'Eliminar';
  
  confirmAction = async () => {
    try {
      const res = await fetch(`${API}/events/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      
      showToast('Evento eliminado ✓');
      closeConfirmModal();
      loadAdminEvents();
      loadEvents();
    } catch (err) {
      showToast(err.message || 'Error al eliminar evento', 'error');
    }
  };
  
  document.getElementById('modal-confirm').classList.add('open');
}

function closeConfirmModal(e) {
  if (e && e.target !== document.getElementById('modal-confirm')) return;
  document.getElementById('modal-confirm').classList.remove('open');
  confirmAction = null;
}

function executeConfirmAction() {
  if (confirmAction) confirmAction();
}

// ════════════════════════════════════════════════════════════════
//  ADMINISTRACIÓN - RESERVAS
// ════════════════════════════════════════════════════════════════
let adminReservationsData = [];

async function loadAdminReservations() {
  try {
    const estado = document.getElementById('admin-filter-estado')?.value || '';
    
    let url = `${API}/reservations?limit=100`;
    if (estado) url += `&estado=${estado}`;
    
    const res = await fetch(url);
    const json = await res.json();
    adminReservationsData = json.data || json;
    renderAdminReservationsTable(adminReservationsData);
  } catch (e) {
    console.error('Error loading admin reservations:', e);
    showToast('Error al cargar reservas', 'error');
  }
}

function renderAdminReservationsTable(reservations) {
  const container = document.getElementById('admin-reservas-table');
  
  if (!reservations.length) {
    container.innerHTML = `<div class="text-center py-12" style="color:var(--text-muted);">
      <p class="text-3xl mb-2">📭</p>
      <p>No hay reservas para mostrar</p>
    </div>`;
    return;
  }
  
  const estadoColors = {
    confirmada: { bg: 'rgba(16,185,129,.1)', color: '#10b981', border: 'rgba(16,185,129,.2)' },
    pendiente: { bg: 'rgba(251,146,60,.1)', color: '#f97316', border: 'rgba(251,146,60,.2)' },
    cancelada: { bg: 'rgba(239,68,68,.1)', color: '#ef4444', border: 'rgba(239,68,68,.2)' },
  };
  
  // Vista de tabla (desktop)
  const tableView = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Usuario</th>
          <th>Evento</th>
          <th style="text-align:center;">Cantidad</th>
          <th style="text-align:right;">Precio Unit.</th>
          <th style="text-align:right;">Total</th>
          <th>Fecha Reserva</th>
          <th style="text-align:center;">Estado</th>
          <th style="text-align:center;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${reservations.map(r => {
          const colors = estadoColors[r.estado] || estadoColors.pendiente;
          return `
          <tr>
            <td class="text-sm">${r.usuarioId?.nombre || 'N/A'}</td>
            <td class="font-display font-semibold text-sm">${r.eventoId?.titulo || 'N/A'}</td>
            <td class="font-mono text-xs text-center">${r.cantidad}</td>
            <td class="font-mono text-xs text-right">${fmt.currency(r.precioUnitario)}</td>
            <td class="font-mono text-xs text-right" style="color:var(--primary);font-weight:600;">${fmt.currency(r.totalReserva)}</td>
            <td class="font-mono text-xs">${fmt.shortDate(r.fechaReserva)}</td>
            <td class="text-center">
              <span class="badge" style="background:${colors.bg};color:${colors.color};border:1px solid ${colors.border};">
                ${r.estado.charAt(0).toUpperCase() + r.estado.slice(1)}
              </span>
            </td>
            <td>
              <div class="flex gap-2 justify-center">
                <button class="btn-action btn-edit" onclick="editReservation('${r.id || r._id}')">✏️ Editar</button>
                ${r.estado !== 'cancelada' ? `<button class="btn-action btn-cancel" onclick="confirmCancelReservation('${r.id || r._id}')">❌ Cancelar</button>` : ''}
              </div>
            </td>
          </tr>
        `}).join('')}
      </tbody>
    </table>
  `;
  
  // Vista de cards (móvil)
  const cardsView = reservations.map(r => {
    const colors = estadoColors[r.estado] || estadoColors.pendiente;
    return `
    <div class="mobile-card">
      <div class="flex justify-between items-start mb-3">
        <div>
          <h3 class="font-display font-bold text-sm">${r.eventoId?.titulo || 'N/A'}</h3>
          <p class="text-xs" style="color:var(--text-muted);">${r.usuarioId?.nombre || 'N/A'}</p>
        </div>
        <span class="badge" style="background:${colors.bg};color:${colors.color};border:1px solid ${colors.border};">
          ${r.estado.charAt(0).toUpperCase() + r.estado.slice(1)}
        </span>
      </div>
      <div class="mobile-card-row">
        <span class="mobile-card-label">Cantidad</span>
        <span class="mobile-card-value font-mono">${r.cantidad}</span>
      </div>
      <div class="mobile-card-row">
        <span class="mobile-card-label">Precio Unit.</span>
        <span class="mobile-card-value font-mono">${fmt.currency(r.precioUnitario)}</span>
      </div>
      <div class="mobile-card-row">
        <span class="mobile-card-label">Total</span>
        <span class="mobile-card-value font-mono font-bold" style="color:var(--primary);">${fmt.currency(r.totalReserva)}</span>
      </div>
      <div class="mobile-card-row">
        <span class="mobile-card-label">Fecha</span>
        <span class="mobile-card-value font-mono">${fmt.shortDate(r.fechaReserva)}</span>
      </div>
      <div class="flex gap-2 mt-3">
        <button class="btn-action btn-edit flex-1" onclick="editReservation('${r.id || r._id}')">✏️ Editar</button>
        ${r.estado !== 'cancelada' ? `<button class="btn-action btn-cancel flex-1" onclick="confirmCancelReservation('${r.id || r._id}')">❌ Cancelar</button>` : ''}
      </div>
    </div>
  `}).join('');
  
  container.innerHTML = tableView + cardsView;
}

// ════════════════════════════════════════════════════════════════
//  MODAL RESERVA - CREAR/EDITAR
// ════════════════════════════════════════════════════════════════
let currentReservationId = null;

function openReservationModal(reservationId = null, eventoId = null, eventoTitulo = null) {
  currentReservationId = reservationId;
  const modal = document.getElementById('modal-reservation');
  const form = document.getElementById('reservation-form');
  form.reset();

  // Para usuarios regulares, pre-llenar y bloquear el campo de usuario
  const usuarioField = document.getElementById('reservation-usuarioId');
  const tipBox = form.querySelector('.p-3.rounded-lg');
  if (currentUser && currentUser.rol !== 'admin') {
    usuarioField.value = currentUser.id;
    usuarioField.readOnly = true;
    usuarioField.style.opacity = '.6';
    if (tipBox) tipBox.innerHTML = `<p class="text-xs" style="color:var(--text-muted);">Reservando como <strong>${currentUser.nombre}</strong></p>`;
  } else {
    usuarioField.readOnly = false;
    usuarioField.style.opacity = '1';
    if (tipBox) tipBox.innerHTML = `<p class="text-xs" style="color:var(--text-muted);">💡 <strong>Tip:</strong> Necesitas el ID del usuario y del evento. Puedes obtenerlos desde la sección Admin.</p>`;
  }

  if (reservationId) {
    // Modo edición
    document.getElementById('reservation-modal-subtitle').textContent = '// EDITAR RESERVA';
    document.getElementById('reservation-modal-title').textContent = 'Editar Reserva';
    document.getElementById('reservation-submit-btn').textContent = 'Guardar Cambios';
    
    // Cargar datos de la reserva
    const reservation = adminReservationsData.find(r => (r.id || r._id) === reservationId);
    if (reservation) {
      document.getElementById('reservation-id').value = reservationId;
      document.getElementById('reservation-usuarioId').value = reservation.usuarioId?._id || reservation.usuarioId?.id || reservation.usuarioId;
      document.getElementById('reservation-eventoId').value = reservation.eventoId?._id || reservation.eventoId?.id || reservation.eventoId;
      document.getElementById('reservation-cantidad').value = reservation.cantidad;
      document.getElementById('reservation-estado').value = reservation.estado;
      document.getElementById('reservation-notas').value = reservation.notas || '';
    }
  } else {
    // Modo creación
    document.getElementById('reservation-modal-subtitle').textContent = '// NUEVA RESERVA';
    document.getElementById('reservation-modal-title').textContent = eventoTitulo ? `Reservar: ${eventoTitulo}` : 'Crear Reserva';
    document.getElementById('reservation-submit-btn').textContent = 'Crear Reserva';
    
    // Si viene de un evento específico, pre-llenar el campo
    if (eventoId) {
      document.getElementById('reservation-eventoId').value = eventoId;
      document.getElementById('reservation-eventoId').readOnly = true;
      // Agregar un mensaje informativo
      const eventoField = document.getElementById('reservation-eventoId').parentElement;
      if (!eventoField.querySelector('.info-message')) {
        const info = document.createElement('p');
        info.className = 'info-message text-xs mt-1';
        info.style.color = 'var(--text-muted)';
        info.textContent = `Evento: ${eventoTitulo}`;
        eventoField.appendChild(info);
      }
    } else {
      document.getElementById('reservation-eventoId').readOnly = false;
      // Remover mensaje si existe
      const eventoField = document.getElementById('reservation-eventoId').parentElement;
      const info = eventoField.querySelector('.info-message');
      if (info) info.remove();
    }
  }
  
  modal.classList.add('open');
}

function closeReservationModal(e) {
  if (e && e.target !== document.getElementById('modal-reservation')) return;
  document.getElementById('modal-reservation').classList.remove('open');
  currentReservationId = null;
}

async function submitReservationForm(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  // Convertir tipos
  data.cantidad = Number(data.cantidad);
  delete data.id;
  
  try {
    const url = currentReservationId ? `${API}/reservations/${currentReservationId}` : `${API}/reservations`;
    const method = currentReservationId ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const json = await res.json();
    if (!json.ok) {
      // Mostrar errores de validación si existen
      if (json.errors && json.errors.length > 0) {
        throw new Error(json.errors.join(', '));
      }
      throw new Error(json.message);
    }
    
    showToast(currentReservationId ? 'Reserva actualizada ✓' : '¡Reserva creada exitosamente! 🎉');
    closeReservationModal();
    
    // Recargar reservas si estamos en la vista admin
    if (document.getElementById('admin-tab-reservas') && !document.getElementById('admin-tab-reservas').classList.contains('hidden')) {
      loadAdminReservations();
    }
  } catch (err) {
    showToast(err.message || 'Error al guardar reserva', 'error');
  }
}

function editReservation(id) {
  openReservationModal(id);
}

function confirmCancelReservation(id) {
  document.getElementById('confirm-title').textContent = '¿Cancelar reserva?';
  document.getElementById('confirm-message').textContent = 'La reserva será marcada como cancelada.';
  document.getElementById('confirm-action-btn').textContent = 'Cancelar Reserva';
  
  confirmAction = async () => {
    try {
      const res = await fetch(`${API}/reservations/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      
      showToast('Reserva cancelada ✓');
      closeConfirmModal();
      loadAdminReservations();
    } catch (err) {
      showToast(err.message || 'Error al cancelar reserva', 'error');
    }
  };
  
  document.getElementById('modal-confirm').classList.add('open');
}

// ════════════════════════════════════════════════════════════════
//  ADMINISTRACIÓN - USUARIOS
// ════════════════════════════════════════════════════════════════
let adminUsersData = [];
let allOrganizadores = [];

async function loadAdminUsers() {
  try {
    const q = document.getElementById('admin-search-usuarios')?.value || '';
    const rol = document.getElementById('admin-filter-rol')?.value || '';
    
    let url = `${API}/users?limit=100`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (rol) url += `&rol=${rol}`;
    
    const res = await fetch(url);
    const json = await res.json();
    adminUsersData = json.data || json;
    renderAdminUsersTable(adminUsersData);
  } catch (e) {
    console.error('Error loading admin users:', e);
    showToast('Error al cargar usuarios', 'error');
  }
}

async function loadOrganizadores() {
  try {
    const [resOrg, resAdmin] = await Promise.all([
      fetch(`${API}/users?rol=organizador&limit=100`),
      fetch(`${API}/users?rol=admin&limit=100`),
    ]);
    const [jOrg, jAdmin] = await Promise.all([resOrg.json(), resAdmin.json()]);
    allOrganizadores = [...(jOrg.data || []), ...(jAdmin.data || [])];
    
    // Actualizar el select de organizadores en el modal de eventos
    const select = document.getElementById('event-organizadorId');
    if (select) {
      const currentValue = select.value;
      select.innerHTML = '<option value="">Seleccionar organizador...</option>' +
        allOrganizadores.map(org => 
          `<option value="${org.id || org._id}">${org.nombre} (${org.correo})</option>`
        ).join('');
      if (currentValue) select.value = currentValue;
    }
  } catch (e) {
    console.error('Error loading organizadores:', e);
  }
}

function renderAdminUsersTable(users) {
  const container = document.getElementById('admin-usuarios-table');
  
  if (!users.length) {
    container.innerHTML = `<div class="text-center py-12" style="color:var(--text-muted);">
      <p class="text-3xl mb-2">📭</p>
      <p>No hay usuarios para mostrar</p>
    </div>`;
    return;
  }
  
  const rolColors = {
    admin: { bg: 'rgba(139,92,246,.1)', color: '#8b5cf6', border: 'rgba(139,92,246,.2)' },
    organizador: { bg: 'rgba(59,130,246,.1)', color: '#3b82f6', border: 'rgba(59,130,246,.2)' },
    cliente: { bg: 'rgba(100,116,139,.1)', color: '#64748b', border: 'rgba(100,116,139,.2)' },
  };
  
  // Vista de tabla (desktop)
  const tableView = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Correo</th>
          <th style="text-align:center;">Rol</th>
          <th>Iniciales</th>
          <th>Fecha Registro</th>
          <th style="text-align:center;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(u => {
          const colors = rolColors[u.rol] || rolColors.cliente;
          return `
          <tr>
            <td class="font-display font-semibold text-sm">${u.nombre}</td>
            <td class="text-xs">${u.correo}</td>
            <td class="text-center">
              <span class="badge" style="background:${colors.bg};color:${colors.color};border:1px solid ${colors.border};">
                ${u.rol.charAt(0).toUpperCase() + u.rol.slice(1)}
              </span>
            </td>
            <td class="text-center">
              <div class="inline-flex w-8 h-8 rounded-full items-center justify-center font-mono text-xs font-bold"
                   style="background:${colors.bg};color:${colors.color};">
                ${u.iniciales || u.nombre.charAt(0)}
              </div>
            </td>
            <td class="font-mono text-xs">${fmt.date(u.createdAt)}</td>
            <td>
              <div class="flex gap-2 justify-center">
                <button class="btn-action btn-edit" onclick="editUser('${u.id || u._id}')">✏️ Editar</button>
                <button class="btn-action btn-delete" onclick="confirmDeleteUser('${u.id || u._id}', '${u.nombre}')">🗑️ Eliminar</button>
              </div>
            </td>
          </tr>
        `}).join('')}
      </tbody>
    </table>
  `;
  
  // Vista de cards (móvil)
  const cardsView = users.map(u => {
    const colors = rolColors[u.rol] || rolColors.cliente;
    return `
    <div class="mobile-card">
      <div class="flex justify-between items-start mb-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full flex items-center justify-center font-mono text-sm font-bold"
               style="background:${colors.bg};color:${colors.color};">
            ${u.iniciales || u.nombre.charAt(0)}
          </div>
          <div>
            <h3 class="font-display font-bold text-sm">${u.nombre}</h3>
            <p class="text-xs" style="color:var(--text-muted);">${u.correo}</p>
          </div>
        </div>
        <span class="badge" style="background:${colors.bg};color:${colors.color};border:1px solid ${colors.border};">
          ${u.rol.charAt(0).toUpperCase() + u.rol.slice(1)}
        </span>
      </div>
      <div class="mobile-card-row">
        <span class="mobile-card-label">Fecha Registro</span>
        <span class="mobile-card-value font-mono text-xs">${fmt.date(u.createdAt)}</span>
      </div>
      <div class="flex gap-2 mt-3">
        <button class="btn-action btn-edit flex-1" onclick="editUser('${u.id || u._id}')">✏️ Editar</button>
        <button class="btn-action btn-delete flex-1" onclick="confirmDeleteUser('${u.id || u._id}', '${u.nombre}')">🗑️ Eliminar</button>
      </div>
    </div>
  `}).join('');
  
  container.innerHTML = tableView + cardsView;
}

// ════════════════════════════════════════════════════════════════
//  MODAL USUARIO - CREAR/EDITAR
// ════════════════════════════════════════════════════════════════
let currentUserId = null;

function openUserModal(userId = null) {
  currentUserId = userId;
  const modal = document.getElementById('modal-user');
  const form = document.getElementById('user-form');
  form.reset();
  
  if (userId) {
    // Modo edición
    document.getElementById('user-modal-subtitle').textContent = '// EDITAR USUARIO';
    document.getElementById('user-modal-title').textContent = 'Editar Usuario';
    document.getElementById('user-submit-btn').textContent = 'Guardar Cambios';
    
    // Cargar datos del usuario
    const user = adminUsersData.find(u => (u.id || u._id) === userId);
    if (user) {
      document.getElementById('user-id').value = userId;
      document.getElementById('user-nombre').value = user.nombre;
      document.getElementById('user-correo').value = user.correo;
      document.getElementById('user-rol').value = user.rol;
      document.getElementById('user-avatar').value = user.avatar || '';
    }
  } else {
    // Modo creación
    document.getElementById('user-modal-subtitle').textContent = '// NUEVO USUARIO';
    document.getElementById('user-modal-title').textContent = 'Crear Usuario';
    document.getElementById('user-submit-btn').textContent = 'Crear Usuario';
  }
  
  modal.classList.add('open');
}

function closeUserModal(e) {
  if (e && e.target !== document.getElementById('modal-user')) return;
  document.getElementById('modal-user').classList.remove('open');
  currentUserId = null;
}

async function submitUserForm(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  delete data.id;
  if (!data.avatar) delete data.avatar;
  if (!data.password) delete data.password;
  
  try {
    const url = currentUserId ? `${API}/users/${currentUserId}` : `${API}/users`;
    const method = currentUserId ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);
    
    showToast(currentUserId ? 'Usuario actualizado ✓' : 'Usuario creado ✓');
    closeUserModal();
    loadAdminUsers();
    loadOrganizadores(); // Actualizar lista de organizadores
  } catch (err) {
    showToast(err.message || 'Error al guardar usuario', 'error');
  }
}

function editUser(id) {
  openUserModal(id);
}

function confirmDeleteUser(id, nombre) {
  document.getElementById('confirm-title').textContent = '¿Eliminar usuario?';
  document.getElementById('confirm-message').textContent = `Se eliminará permanentemente el usuario "${nombre}".`;
  document.getElementById('confirm-action-btn').textContent = 'Eliminar';
  
  confirmAction = async () => {
    try {
      const res = await fetch(`${API}/users/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      
      showToast('Usuario eliminado ✓');
      closeConfirmModal();
      loadAdminUsers();
      loadOrganizadores(); // Actualizar lista de organizadores
    } catch (err) {
      showToast(err.message || 'Error al eliminar usuario', 'error');
    }
  };
  
  document.getElementById('modal-confirm').classList.add('open');
}

// Exponer nuevas funciones globales
window.switchAdminTab = switchAdminTab;
window.loadAdminEvents = loadAdminEvents;
window.loadAdminReservations = loadAdminReservations;
window.loadAdminUsers = loadAdminUsers;
window.openEventModal = openEventModal;
window.closeEventModal = closeEventModal;
window.submitEventForm = submitEventForm;
window.editEvent = editEvent;
window.confirmDeleteEvent = confirmDeleteEvent;
window.closeConfirmModal = closeConfirmModal;
window.executeConfirmAction = executeConfirmAction;
window.openReservationModal = openReservationModal;
window.closeReservationModal = closeReservationModal;
window.submitReservationForm = submitReservationForm;
window.editReservation = editReservation;
window.confirmCancelReservation = confirmCancelReservation;
window.openUserModal = openUserModal;
window.closeUserModal = closeUserModal;
window.submitUserForm = submitUserForm;
window.editUser = editUser;
window.confirmDeleteUser = confirmDeleteUser;
window.toggleMobileMenu = toggleMobileMenu;

// ════════════════════════════════════════════════════════════════
//  EVENTOS CONCLUIDOS
// ════════════════════════════════════════════════════════════════
const EMOJIS_CAT = { Música:'🎵', Tecnología:'💻', Arte:'🎨', Deportes:'⚽', Educación:'📚', Negocios:'💼', Otro:'🎪' };

let concludedEvents = [];

async function loadConcludedEvents() {
  const grid = document.getElementById('concluded-grid');
  const empty = document.getElementById('concluded-empty');
  grid.innerHTML = `
    <div class="skeleton h-64 rounded-2xl"></div>
    <div class="skeleton h-64 rounded-2xl"></div>
    <div class="skeleton h-64 rounded-2xl"></div>`;
  empty.classList.add('hidden');

  try {
    const res = await fetch(`${API}/events?past=true&limit=100`);
    const json = await res.json();
    concludedEvents = json.data || [];
    renderConcluded(concludedEvents);
  } catch {
    grid.innerHTML = `<p class="col-span-3 text-center py-10" style="color:var(--text-muted);">Error al cargar eventos concluidos.</p>`;
  }
}

function filterConcluded() {
  const q = document.getElementById('concluded-search').value.toLowerCase();
  const cat = document.getElementById('concluded-categoria').value;
  const filtered = concludedEvents.filter(e =>
    (!q || e.titulo.toLowerCase().includes(q)) &&
    (!cat || e.categoria === cat)
  );
  renderConcluded(filtered);
}

function renderConcluded(events) {
  const grid = document.getElementById('concluded-grid');
  const empty = document.getElementById('concluded-empty');

  if (!events.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = events.map(e => {
    const id = e.id || e._id;
    const titulo = e.titulo.replace(/'/g, "\\'");
    const emoji = EMOJIS_CAT[e.categoria] || '🎪';
    const fechaStr = fmt.date(e.fecha);
    return `
    <div class="concluded-card fade-up">
      <div class="flex items-center justify-center text-5xl" style="height:120px;background:linear-gradient(135deg,#fef3c7,#d1fae5);">
        ${emoji}
      </div>
      <div class="p-5 flex flex-col flex-1 gap-3">
        <div>
          <span class="badge cat-${e.categoria}" style="margin-bottom:.5rem;">${e.categoria}</span>
          <h3 class="font-display font-bold text-base leading-snug mt-2">${e.titulo}</h3>
          <p class="text-xs mt-1" style="color:var(--text-muted);">📅 ${fechaStr} · 📍 ${e.lugar}</p>
        </div>
        ${e.descripcion ? `<p class="text-sm" style="color:var(--text-muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${e.descripcion}</p>` : ''}
        <div class="flex gap-2 mt-auto pt-3" style="border-top:1px solid var(--border);">
          <button class="btn btn-ghost flex-1" style="font-size:.78rem;padding:.45rem .5rem;"
                  onclick="openViewReviewsModal('${id}', '${titulo}')">
            Ver Reseñas
          </button>
          <button class="btn btn-primary flex-1" style="font-size:.78rem;padding:.45rem .5rem;"
                  onclick="openAddReviewModal('${id}', '${titulo}')">
            Agregar Reseña
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ════════════════════════════════════════════════════════════════
//  MODAL: VER RESEÑAS
// ════════════════════════════════════════════════════════════════
async function openViewReviewsModal(eventoId, titulo) {
  document.getElementById('view-reviews-title').textContent = titulo;
  document.getElementById('modal-view-reviews').classList.add('open');
  await loadReviews(eventoId);
}

function closeViewReviewsModal(e) {
  if (e && e.target !== document.getElementById('modal-view-reviews')) return;
  document.getElementById('modal-view-reviews').classList.remove('open');
}

async function loadReviews(eventoId) {
  const list = document.getElementById('view-reviews-list');
  const avgEl = document.getElementById('view-reviews-avg');
  list.innerHTML = '<div class="skeleton h-14 rounded-xl"></div><div class="skeleton h-14 rounded-xl mt-2"></div>';

  try {
    const res = await fetch(`${API}/reviews/${eventoId}`);
    const json = await res.json();
    const reviews = json.data || [];
    const promedio = json.promedio || 0;

    avgEl.innerHTML = promedio > 0
      ? `<span style="color:#f59e0b;font-size:1.1rem;">${'★'.repeat(Math.round(promedio))}${'☆'.repeat(5 - Math.round(promedio))}</span>
         <span class="font-mono text-sm font-bold">${promedio.toFixed(1)}</span>
         <span class="text-xs" style="color:var(--text-muted);">(${json.total} reseña${json.total !== 1 ? 's' : ''})</span>`
      : `<span class="text-xs" style="color:var(--text-muted);">Sin reseñas aún</span>`;

    if (!reviews.length) {
      list.innerHTML = `<p class="text-sm py-6 text-center" style="color:var(--text-muted);">Nadie ha dejado una reseña todavía.</p>`;
      return;
    }

    list.innerHTML = reviews.map(r => `
      <div class="review-card">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="font-display font-bold text-sm">${r.autorNombre}</p>
            <span style="color:#f59e0b;font-size:.9rem;">${'★'.repeat(r.calificacion)}${'☆'.repeat(5 - r.calificacion)}</span>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <p class="font-mono text-xs" style="color:var(--text-muted);">${fmt.date(r.createdAt)}</p>
            ${currentUser?.rol === 'admin' ? `<button onclick="deleteReview('${r.id || r._id}', '${eventoId}')"
                    title="Eliminar reseña"
                    style="color:var(--text-muted);background:none;border:none;cursor:pointer;font-size:1rem;padding:0;width:auto;line-height:1;">✕</button>` : ''}
          </div>
        </div>
        <p class="text-sm mt-2" style="color:var(--text-main);">${r.comentario}</p>
      </div>`).join('');
  } catch {
    list.innerHTML = `<p class="text-sm py-4 text-center" style="color:var(--text-muted);">Error al cargar reseñas.</p>`;
  }
}

async function deleteReview(reviewId, eventoId) {
  try {
    const res = await fetch(`${API}/reviews/${reviewId}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);
    showToast('Reseña eliminada');
    await loadReviews(eventoId);
  } catch (err) {
    showToast(err.message || 'Error al eliminar', 'error');
  }
}

// ════════════════════════════════════════════════════════════════
//  MODAL: AGREGAR RESEÑA
// ════════════════════════════════════════════════════════════════
function openAddReviewModal(eventoId, titulo) {
  document.getElementById('review-eventoId').value = eventoId;
  document.getElementById('add-review-title').textContent = titulo;
  document.getElementById('review-form').reset();
  if (currentUser) {
    document.getElementById('review-autorNombre').value = currentUser.nombre;
  }
  document.getElementById('modal-add-review').classList.add('open');
}

function closeAddReviewModal(e) {
  if (e && e.target !== document.getElementById('modal-add-review')) return;
  document.getElementById('modal-add-review').classList.remove('open');
}

async function submitReview(e) {
  e.preventDefault();
  const btn = document.getElementById('review-submit-btn');
  const eventoId = document.getElementById('review-eventoId').value;
  const calificacion = document.querySelector('input[name="calificacion"]:checked')?.value;

  if (!calificacion) { showToast('Selecciona una calificación de 1 a 5 estrellas', 'error'); return; }

  btn.disabled = true;
  btn.textContent = 'Publicando...';

  try {
    const body = {
      eventoId,
      usuarioId: currentUser?.id || undefined,
      autorNombre: document.getElementById('review-autorNombre').value.trim(),
      calificacion: parseInt(calificacion),
      comentario: document.getElementById('review-comentario').value.trim(),
    };

    const res = await fetch(`${API}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();

    if (!json.ok) throw new Error(json.errors?.join(', ') || json.message);

    showToast('Reseña publicada exitosamente ✓');
    closeAddReviewModal();
  } catch (err) {
    showToast(err.message || 'Error al publicar la reseña', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Publicar Reseña';
  }
}

window.loadConcludedEvents    = loadConcludedEvents;
window.filterConcluded        = filterConcluded;
window.openViewReviewsModal   = openViewReviewsModal;
window.closeViewReviewsModal  = closeViewReviewsModal;
window.openAddReviewModal     = openAddReviewModal;
window.closeAddReviewModal    = closeAddReviewModal;
window.submitReview           = submitReview;
window.deleteReview           = deleteReview;

// ════════════════════════════════════════════════════════════════
//  INIT — Carga inicial
// ════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const ys = document.getElementById('year-select');
  const now = new Date().getFullYear();
  if (ys) {
    ys.innerHTML = `
      <option value="${now}">${now}</option>
      <option value="${now-1}">${now-1}</option>
      <option value="${now+1}">${now+1}</option>`;
  }

  // Verificar sesión existente en localStorage
  try {
    const saved = localStorage.getItem('ef_user');
    if (saved) {
      currentUser = JSON.parse(saved);
      showApp();
    } else {
      showLogin();
    }
  } catch {
    localStorage.removeItem('ef_user');
    showLogin();
  }
});
