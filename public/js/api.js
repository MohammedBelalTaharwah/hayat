const API = {
  base: '/api',
  getToken() { return localStorage.getItem('token'); },
  getHeaders() {
    const h = { 'Content-Type': 'application/json' };
    const t = this.getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
  },
  async request(method, path, body) {
    const opts = { method, headers: this.getHeaders() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(this.base + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },
  get: (p) => API.request('GET', p),
  post: (p, b) => API.request('POST', p, b),
  put: (p, b) => API.request('PUT', p, b),
  del: (p) => API.request('DELETE', p),

  isLoggedIn() { return !!this.getToken(); },
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/sign-in.html';
  },
  getUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  },
  async login(email, password) {
    const data = await this.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },
  async signup(name, email, password) {
    const data = await this.post('/auth/signup', { name, email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  }
};

function escapeHtml(str) {
  if (typeof str !== 'string' && typeof str !== 'number') return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
  return String(str).replace(/[&<>"']/g, function(m) { return map[m]; });
}

function requireAuth() {
  if (!API.isLoggedIn() && !window.location.pathname.includes('sign-in') && !window.location.pathname.includes('create-account') && !window.location.pathname.includes('forgot-password') && window.location.pathname !== '/' && !window.location.pathname.endsWith('index.html')) {
    window.location.href = '/sign-in.html';
  }
}
if (document.readyState !== 'loading') requireAuth(); else document.addEventListener('DOMContentLoaded', requireAuth);
