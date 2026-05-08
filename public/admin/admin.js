const AdminAPI = {
  async request(method, path, body) {
    const h = { 'Content-Type': 'application/json' };
    const t = localStorage.getItem('token');
    if (t) h['Authorization'] = 'Bearer ' + t;
    const opts = { method, headers: h };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch('/api/admin' + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },
  get: (p) => AdminAPI.request('GET', p),
  put: (p, b) => AdminAPI.request('PUT', p, b),
  del: (p) => AdminAPI.request('DELETE', p),
};

function requireAdmin() {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = '/sign-in.html'; return; }
  fetch('/api/auth/me', { headers: { 'Authorization': 'Bearer ' + token } })
    .then(r => r.json())
    .then(data => {
      if (data.error) { window.location.href = '/sign-in.html'; return; }
    })
    .catch(() => { window.location.href = '/sign-in.html'; });
}

function renderAdminSidebar(active) {
  const items = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', link: '/admin/' },
    { id: 'users', icon: 'group', label: 'Users', link: '/admin/users.html' },
    { id: 'tasks', icon: 'checklist', label: 'Tasks', link: '/admin/tasks.html' },
    { id: 'analytics', icon: 'analytics', label: 'Analytics', link: '/admin/analytics.html' },
    { id: 'activity', icon: 'history', label: 'Activity', link: '/admin/activity.html' },
    { id: 'settings', icon: 'settings', label: 'Settings', link: '/admin/settings.html' },
  ];
  return `
    <nav class="bg-inverse-surface fixed h-full w-[250px] start-0 top-0 flex flex-col py-lg px-md z-20">
      <div class="mb-xl px-md">
        <div class="flex items-center gap-sm mb-xs">
          <span class="material-symbols-outlined text-primary-container">admin_panel_settings</span>
          <h1 class="font-h1 text-h1 font-bold text-white" style="font-size:18px;">Admin Panel</h1>
        </div>
        <p class="text-white/40 font-body-sm text-body-sm">Hayati | حياتي</p>
      </div>
      <div class="flex-1 space-y-sm">
        ${items.map(i => `
          <a href="${i.link}" class="flex items-center gap-md px-md py-sm rounded-lg transition-all duration-200 ${active === i.id ? 'bg-white/10 text-white font-bold border-s-4 border-primary-container' : 'text-white/60 hover:text-white hover:bg-white/5'}">
            <span class="material-symbols-outlined" style="font-size:20px;">${i.icon}</span>
            <span class="text-body-sm">${i.label}</span>
          </a>
        `).join('')}
      </div>
      <div class="mt-xl pt-lg border-t border-white/10 space-y-sm">
        <a href="/dashboard.html" class="flex items-center gap-md px-md py-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all">
          <span class="material-symbols-outlined" style="font-size:20px;">arrow_back</span>
          <span class="text-body-sm">Back to App</span>
        </a>
        <a onclick="localStorage.removeItem('token');localStorage.removeItem('user');window.location.href='/sign-in.html'" class="flex items-center gap-md px-md py-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer transition-all">
          <span class="material-symbols-outlined" style="font-size:20px;">logout</span>
          <span class="text-body-sm">Sign Out</span>
        </a>
      </div>
    </nav>
  `;
}

function initAdminShell(activePage, title) {
  document.body.innerHTML = `
    ${renderAdminSidebar(activePage)}
    <div class="flex-1 flex flex-col ms-[250px] h-screen overflow-hidden">
      <header class="bg-surface shadow-sm flex items-center h-16 px-lg shrink-0 border-b border-surface-container">
        <h2 class="font-h2 text-h2 text-on-surface">${title}</h2>
      </header>
      <main class="flex-1 overflow-y-auto p-lg bg-surface" id="admin-main"></main>
    </div>
  `;
  document.body.className = 'bg-background text-on-background font-body-main antialiased h-screen overflow-hidden flex';
}
