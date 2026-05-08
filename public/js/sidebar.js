function renderSidebar(active) {
  const items = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', link: '/dashboard.html' },
    { id: 'todo', icon: 'checklist', label: 'To-Do List', link: '/todo.html' },
    { id: 'goals', icon: 'emoji_events', label: 'Goals', link: '/goals.html' },
    { id: 'courses', icon: 'school', label: 'Courses', link: '/courses.html' },
    { id: 'pomodoro', icon: 'timer', label: 'Pomodoro', link: '/pomodoro.html' },
    { id: 'habits', icon: 'history_edu', label: 'Habits & Journal', link: '/habits-journal.html' },
    { id: 'mood', icon: 'mood', label: 'Mood Log', link: '/mood-log.html' }
  ];
  const user = API.getUser();
  return `
    <nav class="bg-inverse-surface fixed h-full w-sidebar_width start-0 top-0 flex flex-col py-lg px-md z-20">
      <div class="mb-xxl px-md">
        <h1 class="font-h1 text-h1 font-bold text-white">Hayati | <span class="font-rtl-h1 text-rtl-h1">حياتي</span></h1>
        <p class="text-white/60 font-body-sm text-body-sm mt-xs">Personal Life Organizer</p>
      </div>
      <button onclick="window.location.href='/dashboard.html'" class="mb-xl w-full bg-primary text-white font-body-main py-sm px-md rounded-lg hover:bg-surface-tint active:scale-95 transition-all flex items-center justify-center gap-sm shadow-level-1">
        <span class="material-symbols-outlined fill">add</span> Quick Entry
      </button>
      <div class="flex-1 space-y-sm">
        ${items.map(i => `
          <a href="${i.link}" class="flex items-center gap-md px-md py-sm rounded-lg transition-all duration-200 ${active === i.id ? 'sidebar-active' : 'text-white/60 hover:text-white hover:bg-white/5'}">
            <span class="material-symbols-outlined ${active === i.id ? 'fill' : ''}">${i.icon}</span>
            <span>${i.label}</span>
          </a>
        `).join('')}
      </div>
      <div class="mt-xl pt-lg border-t border-white/10 space-y-sm">
        <div class="flex items-center gap-md px-md py-sm text-white/60">
          <span class="material-symbols-outlined">account_circle</span>
          <span class="text-body-sm">${user ? user.name : 'User'}</span>
        </div>
        <a onclick="API.logout()" class="flex items-center gap-md px-md py-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer transition-all">
          <span class="material-symbols-outlined">logout</span>
          <span>Sign Out</span>
        </a>
      </div>
    </nav>
  `;
}

function renderTopBar(title, subtitle) {
  return `
    <header class="bg-surface shadow-sm flex justify-between items-center h-16 ps-lg pe-lg w-full shrink-0">
      <div>
        <div class="font-h2 text-h2 text-primary font-bold">${title}</div>
        ${subtitle ? `<p class="font-body-sm text-body-sm text-on-surface-variant">${subtitle}</p>` : ''}
      </div>
      <div class="flex items-center gap-md">
        <button class="text-on-surface-variant hover:bg-surface-container-highest transition-colors p-sm rounded-full">
          <span class="material-symbols-outlined">notifications</span>
        </button>
        <button class="text-on-surface-variant hover:bg-surface-container-highest transition-colors p-sm rounded-full">
          <span class="material-symbols-outlined fill">account_circle</span>
        </button>
      </div>
    </header>
  `;
}

function initAppShell(activePage, title, subtitle) {
  document.body.innerHTML = `
    ${renderSidebar(activePage)}
    <div class="flex-1 flex flex-col ms-[280px] h-screen overflow-hidden">
      ${renderTopBar(title, subtitle)}
      <main class="flex-1 overflow-y-auto p-lg bg-surface" id="app-main"></main>
    </div>
  `;
  document.body.className = 'bg-background text-on-background font-body-main antialiased h-screen overflow-hidden flex';
}
