/**
 * main.js - .NET Design Patterns Learning Website
 * Handles: navigation, phase cards, filtering, progress, animations
 */

'use strict';

// ── Utility Functions ──────────────────────────────────────
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const on = (el, event, fn, opts) => el?.addEventListener(event, fn, opts);
const qs = (key) => new URLSearchParams(window.location.search).get(key);

// ── Navigation ─────────────────────────────────────────────
function initNavigation() {
  const navbar = $('.navbar');
  const mobileToggle = $('.nav-mobile-toggle');
  const navLinks = $('.nav-links');

  // Scroll effect
  let lastScroll = 0;
  const handleScroll = () => {
    const currentScroll = window.scrollY;
    navbar?.classList.toggle('scrolled', currentScroll > 20);
    lastScroll = currentScroll;
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Mobile toggle
  on(mobileToggle, 'click', () => {
    const isOpen = navLinks?.classList.toggle('open');
    mobileToggle.setAttribute('aria-expanded', isOpen);
    // Animate hamburger
    const spans = $$('span', mobileToggle);
    if (isOpen) {
      spans[0]?.style.setProperty('transform', 'rotate(45deg) translate(5px, 5px)');
      spans[1]?.style.setProperty('opacity', '0');
      spans[2]?.style.setProperty('transform', 'rotate(-45deg) translate(5px, -5px)');
    } else {
      spans.forEach(s => s.removeAttribute('style'));
    }
  });

  // Close mobile menu on link click
  $$('.nav-links a').forEach(link => {
    on(link, 'click', () => {
      navLinks?.classList.remove('open');
      $$('span', mobileToggle).forEach(s => s.removeAttribute('style'));
    });
  });

  // Close on outside click
  on(document, 'click', (e) => {
    if (navLinks?.classList.contains('open') &&
        !navLinks.contains(e.target) &&
        !mobileToggle?.contains(e.target)) {
      navLinks.classList.remove('open');
      $$('span', mobileToggle).forEach(s => s.removeAttribute('style'));
    }
  });

  // Active link highlighting
  setActiveNavLink();
}

function setActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  $$('.nav-links a').forEach(link => {
    const href = link.getAttribute('href')?.split('/').pop() || '';
    link.classList.toggle('active', href === currentPath);
  });
}

// ── Smooth Scroll ──────────────────────────────────────────
function initSmoothScroll() {
  on(document, 'click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    e.preventDefault();
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (target) {
      const navHeight = 64;
      const targetPos = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
      window.scrollTo({ top: targetPos, behavior: 'smooth' });
    }
  });
}

// ── Phase Cards (Accordion) ────────────────────────────────
function initPhaseCards() {
  const phaseCards = $$('.phase-card');

  phaseCards.forEach(card => {
    const header = $('.phase-card-header', card);
    if (!header) return;

    on(header, 'click', () => {
      const isExpanded = card.classList.contains('expanded');

      // Close others (optional - comment out for multi-open)
      phaseCards.forEach(other => {
        if (other !== card) other.classList.remove('expanded');
      });

      card.classList.toggle('expanded', !isExpanded);
    });

    // Keyboard support
    header.setAttribute('tabindex', '0');
    header.setAttribute('role', 'button');
    on(header, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        header.click();
      }
    });
  });

  // Auto-open first card
  phaseCards[0]?.classList.add('expanded');
}

// ── Pattern Filtering ──────────────────────────────────────
function initPatternFiltering() {
  const filterBtns = $$('.filter-btn');
  const patternCards = $$('.pattern-card[data-category]');
  const searchInput = $('.search-input');
  const resultsCount = $('.results-count');

  let activeCategory = 'all';
  let searchQuery = '';

  function applyFilters() {
    let visible = 0;

    patternCards.forEach(card => {
      const category = card.dataset.category || '';
      const name = (card.dataset.name || '').toLowerCase();
      const description = (card.dataset.description || '').toLowerCase();

      const categoryMatch = activeCategory === 'all' || category === activeCategory;
      const searchMatch = !searchQuery ||
        name.includes(searchQuery) ||
        description.includes(searchQuery);

      const show = categoryMatch && searchMatch;
      card.style.display = show ? '' : 'none';
      card.classList.toggle('hidden', !show);
      if (show) visible++;
    });

    if (resultsCount) {
      resultsCount.textContent = `${visible} pattern${visible !== 1 ? 's' : ''}`;
    }

    // Show empty state
    const grid = $('.patterns-grid');
    const emptyState = $('.empty-state');
    if (grid && emptyState) {
      emptyState.classList.toggle('hidden', visible > 0);
    }
  }

  filterBtns.forEach(btn => {
    on(btn, 'click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.filter || 'all';
      applyFilters();
    });
  });

  if (searchInput) {
    let searchTimeout;
    on(searchInput, 'input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchQuery = e.target.value.toLowerCase().trim();
        applyFilters();
      }, 200);
    });

    // Clear on Escape
    on(searchInput, 'keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchQuery = '';
        applyFilters();
      }
    });
  }

  // Initialize
  applyFilters();
}

// ── Pattern of the Day ─────────────────────────────────────
function initPatternOfDay() {
  const potdContainer = document.getElementById('potd-container');
  if (!potdContainer || typeof PATTERNS_DATA === 'undefined') return;

  const pattern = getPatternOfTheDay();
  if (!pattern) return;

  const categoryLabels = {
    creational: 'Creational',
    structural: 'Structural',
    behavioral: 'Behavioral'
  };

  const priorityLabels = {
    high: 'Ưu tiên Cao',
    medium: 'Ưu tiên Trung bình',
    low: 'Ưu tiên Thấp'
  };

  // Preview code (first 15 lines)
  const codePreview = pattern.codeExample
    .split('\n')
    .slice(0, 20)
    .join('\n');

  potdContainer.innerHTML = `
    <div class="potd-card">
      <div class="potd-info">
        <div class="potd-label">
          <i class="fas fa-star"></i>
          Pattern của ngày hôm nay
        </div>
        <h2 class="potd-title">${pattern.name}</h2>
        <p class="potd-category">
          <span class="badge badge-${pattern.category}">${categoryLabels[pattern.category]}</span>
          &nbsp;
          <span class="badge badge-${pattern.priority === 'high' ? 'high' : pattern.priority === 'medium' ? 'medium' : 'low'}">
            ${priorityLabels[pattern.priority]}
          </span>
        </p>
        <p class="potd-description">${pattern.description}</p>
        <div class="potd-meta">
          <span class="potd-meta-item">
            <i class="fas fa-clock"></i>
            ${pattern.readingTime} phút đọc
          </span>
          <span class="potd-meta-item">
            <i class="fas fa-code-branch"></i>
            Giai đoạn ${pattern.phase}
          </span>
          <span class="potd-meta-item">
            <i class="fas fa-dot-circle" style="color: var(--accent-green)"></i>
            .NET: ${pattern.dotnetExample.split(',')[0]}
          </span>
        </div>
        <a href="pattern-detail.html?id=${pattern.id}" class="btn btn-primary">
          <i class="fas fa-book-open"></i>
          Học ngay
        </a>
      </div>
      <div class="potd-code">
        <div class="potd-code-header">
          <div class="potd-code-dots">
            <span></span><span></span><span></span>
          </div>
          <span class="potd-code-lang">C# / .NET 8</span>
        </div>
        <pre><code class="language-csharp">${escapeHtml(codePreview)}
// ... xem thêm trong chi tiết pattern</code></pre>
      </div>
    </div>
  `;

  // Apply syntax highlighting
  potdContainer.querySelectorAll('pre code').forEach(block => {
    if (window.hljs) hljs.highlightElement(block);
  });
}

// ── Progress Tracker ────────────────────────────────────────
const PROGRESS_KEY = 'dotnet_patterns_progress';
const NOTES_KEY = 'dotnet_patterns_notes';

function loadProgress() {
  try {
    const saved = localStorage.getItem(PROGRESS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn('Could not save progress:', e);
  }
}

function getProgressStats(progress) {
  const total = typeof PATTERNS_DATA !== 'undefined' ? PATTERNS_DATA.length : 23;
  const completed = Object.values(progress).filter(Boolean).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percentage };
}

function initProgressTracker() {
  const checkItems = $$('.pattern-check-item');
  if (checkItems.length === 0) return;

  const progress = loadProgress();

  // Restore saved state
  checkItems.forEach(item => {
    const patternId = item.dataset.patternId;
    if (patternId && progress[patternId]) {
      item.classList.add('checked');
      const checkbox = $('.custom-checkbox', item);
      if (checkbox) checkbox.innerHTML = '<i class="fas fa-check"></i>';
    }
  });

  updateAllProgressBars(progress);

  // Toggle on click
  checkItems.forEach(item => {
    on(item, 'click', () => {
      const patternId = item.dataset.patternId;
      if (!patternId) return;

      const isChecked = item.classList.toggle('checked');
      const checkbox = $('.custom-checkbox', item);

      if (isChecked) {
        if (checkbox) checkbox.innerHTML = '<i class="fas fa-check"></i>';
        progress[patternId] = true;
        showToast(`Đã học: ${item.dataset.patternName || patternId}`, 'success');
      } else {
        if (checkbox) checkbox.innerHTML = '';
        delete progress[patternId];
      }

      saveProgress(progress);
      updateAllProgressBars(progress);
    });

    // Keyboard support
    item.setAttribute('tabindex', '0');
    on(item, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }
    });
  });
}

function updateAllProgressBars(progress) {
  // Phase progress bars
  $$('[data-phase-id]').forEach(phaseEl => {
    const phaseId = parseInt(phaseEl.dataset.phaseId);
    const patternIds = (phaseEl.dataset.patterns || '').split(',').filter(Boolean);
    if (patternIds.length === 0) return;

    const completed = patternIds.filter(id => progress[id]).length;
    const pct = Math.round((completed / patternIds.length) * 100);

    // Update progress bar
    const bar = phaseEl.querySelector('.progress-bar-fill');
    if (bar) bar.style.width = `${pct}%`;

    // Update mini progress in phase cards
    const miniBar = phaseEl.querySelector('.phase-progress-mini-fill');
    if (miniBar) miniBar.style.width = `${pct}%`;

    const miniText = phaseEl.querySelector('.phase-progress-mini-text');
    if (miniText) miniText.textContent = `${completed}/${patternIds.length}`;

    const phasePercent = phaseEl.querySelector('.phase-percent-badge');
    if (phasePercent) {
      phasePercent.textContent = `${pct}%`;
      phasePercent.classList.toggle('complete', pct === 100);
    }

    const progressText = phaseEl.querySelector('.progress-text');
    if (progressText) progressText.textContent = `${completed}/${patternIds.length} patterns`;
  });

  // Overall progress
  const stats = getProgressStats(progress);
  updateOverallProgress(stats);

  // Nav badge
  const navBadge = $('.nav-badge');
  if (navBadge) {
    navBadge.textContent = `${stats.percentage}%`;
  }
}

function updateOverallProgress(stats) {
  const overallPercent = document.getElementById('overall-percent');
  const overallBar = document.getElementById('overall-bar');
  const completedCount = document.getElementById('completed-count');
  const remainingCount = document.getElementById('remaining-count');
  const progressPct = document.getElementById('progress-pct');

  if (overallPercent) overallPercent.textContent = `${stats.percentage}%`;
  if (overallBar) overallBar.style.width = `${stats.percentage}%`;
  if (completedCount) completedCount.textContent = stats.completed;
  if (remainingCount) remainingCount.textContent = stats.total - stats.completed;
  if (progressPct) progressPct.textContent = `${stats.percentage}%`;
}

// Initialize progress display on other pages (nav badge, etc.)
function initProgressDisplay() {
  const progress = loadProgress();
  updateAllProgressBars(progress);

  // Update phase mini progress on index page
  $$('.phase-card[data-phase-id]').forEach(card => {
    const phaseId = parseInt(card.dataset.phaseId);
    const patternIds = (card.dataset.patterns || '').split(',').filter(Boolean);
    if (patternIds.length === 0) return;

    const completed = patternIds.filter(id => progress[id]).length;
    const pct = Math.round((completed / patternIds.length) * 100);

    const miniBar = card.querySelector('.phase-progress-mini-fill');
    if (miniBar) miniBar.style.width = `${pct}%`;

    const miniText = card.querySelector('.phase-progress-mini-text');
    if (miniText) miniText.textContent = `${completed}/${patternIds.length}`;

    // Mark learned patterns
    $$('.pattern-tag[data-pattern-id]', card).forEach(tag => {
      const isLearned = progress[tag.dataset.patternId];
      tag.classList.toggle('learned', !!isLearned);
    });
  });
}

// ── Code Copy Buttons ──────────────────────────────────────
function initCodeCopy() {
  $$('.copy-btn').forEach(btn => {
    on(btn, 'click', async () => {
      const wrapper = btn.closest('.code-block-wrapper');
      const code = $('code', wrapper);
      if (!code) return;

      try {
        await navigator.clipboard.writeText(code.textContent || '');
        btn.classList.add('copied');
        btn.innerHTML = '<i class="fas fa-check"></i> Đã copy';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = '<i class="fas fa-copy"></i> Copy';
        }, 2000);
      } catch {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = code.textContent || '';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        btn.textContent = 'Đã copy!';
        setTimeout(() => btn.innerHTML = '<i class="fas fa-copy"></i> Copy', 2000);
      }
    });
  });
}

// ── Toast Notifications ────────────────────────────────────
function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const iconMap = { success: 'check-circle', info: 'info-circle', error: 'exclamation-circle' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fas fa-${iconMap[type] || 'info-circle'}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Pattern Detail Page ────────────────────────────────────
function initPatternDetail() {
  const container = document.getElementById('pattern-detail-content');
  if (!container || typeof PATTERNS_DATA === 'undefined') return;

  const patternId = qs('id');
  if (!patternId) {
    container.innerHTML = '<div class="card"><p class="text-muted">Pattern không tìm thấy.</p></div>';
    return;
  }

  const patternIndex = PATTERNS_DATA.findIndex(p => p.id === patternId);
  if (patternIndex === -1) {
    container.innerHTML = '<div class="card"><p class="text-muted">Pattern không tìm thấy.</p></div>';
    return;
  }

  const pattern = PATTERNS_DATA[patternIndex];
  const prevPattern = patternIndex > 0 ? PATTERNS_DATA[patternIndex - 1] : null;
  const nextPattern = patternIndex < PATTERNS_DATA.length - 1 ? PATTERNS_DATA[patternIndex + 1] : null;

  // Update page title
  document.title = `${pattern.name} - .NET Design Patterns`;

  // Update breadcrumb
  const breadcrumbCurrent = document.getElementById('breadcrumb-current');
  if (breadcrumbCurrent) breadcrumbCurrent.textContent = pattern.name;

  // Update header
  const headerEl = document.getElementById('pattern-header');
  if (headerEl) {
    const categoryLabels = { creational: 'Creational', structural: 'Structural', behavioral: 'Behavioral' };
    const priorityLabels = { high: 'Ưu tiên Cao', medium: 'Ưu tiên Trung bình', low: 'Ưu tiên Thấp' };

    headerEl.innerHTML = `
      <div class="pattern-header-badges flex gap-2 mb-4 flex-wrap">
        <span class="badge badge-${pattern.category}">${categoryLabels[pattern.category]}</span>
        <span class="badge badge-${pattern.priority}">${priorityLabels[pattern.priority]}</span>
        <span class="badge" style="background:var(--accent-green-dim);color:var(--accent-green);border-color:var(--accent-green-border)">
          <i class="fas fa-clock" style="font-size:0.65rem"></i> ${pattern.readingTime} phút
        </span>
      </div>
      <h1>${pattern.name}</h1>
      <p style="font-size:1.1rem;color:var(--text-secondary);font-style:italic;margin-top:8px">${pattern.nameVi}</p>
    `;
  }

  // Update sidebar
  const sidebarEl = document.getElementById('pattern-sidebar');
  if (sidebarEl) {
    const categoryColors = { creational: 'blue', structural: 'green', behavioral: 'purple' };
    const progress = loadProgress();
    const isLearned = !!progress[pattern.id];

    sidebarEl.innerHTML = `
      <div class="sidebar-card">
        <div class="sidebar-card-title">Thông tin Pattern</div>
        <div class="sidebar-info-row">
          <span class="sidebar-info-label">Tên tiếng Việt</span>
          <span class="sidebar-info-value" style="font-size:0.8rem">${pattern.nameVi.split(' - ')[1] || ''}</span>
        </div>
        <div class="sidebar-info-row">
          <span class="sidebar-info-label">Nhóm</span>
          <span class="sidebar-info-value">
            <span class="badge badge-${pattern.category}" style="font-size:0.72rem">${pattern.category}</span>
          </span>
        </div>
        <div class="sidebar-info-row">
          <span class="sidebar-info-label">Ưu tiên</span>
          <span class="sidebar-info-value">
            <span class="badge badge-${pattern.priority}" style="font-size:0.72rem">${pattern.priority}</span>
          </span>
        </div>
        <div class="sidebar-info-row">
          <span class="sidebar-info-label">Giai đoạn</span>
          <span class="sidebar-info-value">Giai đoạn ${pattern.phase}</span>
        </div>
        <div class="sidebar-info-row">
          <span class="sidebar-info-label">Thời gian đọc</span>
          <span class="sidebar-info-value">${pattern.readingTime} phút</span>
        </div>
      </div>
      <div class="sidebar-card">
        <div class="sidebar-card-title">Trạng thái học</div>
        <button class="btn btn-block mt-2 ${isLearned ? 'btn-success' : 'btn-secondary'}"
          id="mark-learned-btn" data-pattern-id="${pattern.id}">
          ${isLearned
            ? '<i class="fas fa-check-circle"></i> Đã học xong'
            : '<i class="far fa-circle"></i> Đánh dấu đã học'}
        </button>
        <a href="progress.html" class="btn btn-ghost btn-block mt-2 btn-sm">
          <i class="fas fa-tasks"></i> Xem tiến độ tổng
        </a>
      </div>
      <div class="sidebar-card">
        <div class="sidebar-card-title">Tài nguyên .NET</div>
        <div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.6">
          ${pattern.dotnetExample}
        </div>
      </div>
    `;

    // Mark as learned
    const markBtn = document.getElementById('mark-learned-btn');
    on(markBtn, 'click', () => {
      const progress = loadProgress();
      const isNowLearned = !progress[pattern.id];
      if (isNowLearned) {
        progress[pattern.id] = true;
        markBtn.className = 'btn btn-block mt-2 btn-success';
        markBtn.innerHTML = '<i class="fas fa-check-circle"></i> Đã học xong';
        showToast(`Tuyệt vời! Bạn đã học ${pattern.name}`, 'success');
      } else {
        delete progress[pattern.id];
        markBtn.className = 'btn btn-block mt-2 btn-secondary';
        markBtn.innerHTML = '<i class="far fa-circle"></i> Đánh dấu đã học';
      }
      saveProgress(progress);
    });
  }

  // Render main content
  container.innerHTML = `
    <div class="detail-section">
      <h3 class="detail-section-title"><i class="fas fa-lightbulb"></i> Intent (Mục đích)</h3>
      <p style="font-size:0.95rem;line-height:1.75;color:var(--text-secondary)">${pattern.intent}</p>
    </div>

    <div class="detail-section">
      <h3 class="detail-section-title"><i class="fas fa-project-diagram"></i> Sơ đồ cấu trúc (UML)</h3>
      <div class="uml-diagram">${escapeHtml(pattern.umlDiagram)}</div>
    </div>

    <div class="detail-section">
      <h3 class="detail-section-title"><i class="fas fa-code"></i> Ví dụ C# .NET 8</h3>
      <div class="code-block-wrapper">
        <div class="code-block-header">
          <span class="code-block-lang">
            <span></span>
            C# / .NET 8
          </span>
          <button class="copy-btn" title="Copy code">
            <i class="fas fa-copy"></i> Copy
          </button>
        </div>
        <pre><code class="language-csharp">${escapeHtml(pattern.codeExample)}</code></pre>
      </div>
    </div>

    <div class="detail-section">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div>
          <h3 class="detail-section-title"><i class="fas fa-check-circle" style="color:var(--accent-green)"></i> Khi nào nên dùng</h3>
          <div class="use-list">
            ${pattern.whenToUse.map(item =>
              `<div class="use-item positive">
                <i class="fas fa-check-circle"></i>
                <span>${item}</span>
              </div>`
            ).join('')}
          </div>
        </div>
        <div>
          <h3 class="detail-section-title"><i class="fas fa-times-circle" style="color:var(--accent-red)"></i> Khi nào không nên dùng</h3>
          <div class="use-list">
            ${pattern.whenNotToUse.map(item =>
              `<div class="use-item negative">
                <i class="fas fa-times-circle"></i>
                <span>${item}</span>
              </div>`
            ).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <h3 class="detail-section-title"><i class="fas fa-dot-circle" style="color:var(--accent-green)"></i> Trong .NET Framework</h3>
      <div style="padding:16px;background:var(--accent-green-dim);border:1px solid var(--accent-green-border);border-radius:var(--radius-md);font-size:0.9rem;color:var(--text-secondary);line-height:1.7">
        <i class="fas fa-code" style="color:var(--accent-green);margin-right:8px"></i>
        ${pattern.dotnetExample}
      </div>
    </div>

    <div class="pattern-nav">
      ${prevPattern ? `
        <a href="pattern-detail.html?id=${prevPattern.id}" class="pattern-nav-link prev">
          <i class="fas fa-chevron-left" style="color:var(--text-muted)"></i>
          <div class="pattern-nav-info">
            <div class="pattern-nav-dir">← Trước</div>
            <div class="pattern-nav-name">${prevPattern.name}</div>
          </div>
        </a>
      ` : '<div></div>'}
      ${nextPattern ? `
        <a href="pattern-detail.html?id=${nextPattern.id}" class="pattern-nav-link next">
          <div class="pattern-nav-info">
            <div class="pattern-nav-dir">Tiếp →</div>
            <div class="pattern-nav-name">${nextPattern.name}</div>
          </div>
          <i class="fas fa-chevron-right" style="color:var(--text-muted)"></i>
        </a>
      ` : '<div></div>'}
    </div>
  `;

  // Apply syntax highlighting
  container.querySelectorAll('pre code').forEach(block => {
    if (window.hljs) hljs.highlightElement(block);
  });

  // Init copy buttons
  initCodeCopy();
}

// ── Patterns Page ──────────────────────────────────────────
function initPatternsPage() {
  const grid = document.getElementById('patterns-grid');
  if (!grid || typeof PATTERNS_DATA === 'undefined') return;

  const categoryIcons = {
    creational: 'fa-plus-circle',
    structural: 'fa-sitemap',
    behavioral: 'fa-exchange-alt'
  };

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...PATTERNS_DATA].sort((a, b) =>
    priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  const progress = loadProgress();

  grid.innerHTML = sorted.map(pattern => {
    const isLearned = !!progress[pattern.id];
    const categoryLabels = { creational: 'Creational', structural: 'Structural', behavioral: 'Behavioral' };
    const priorityLabels = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' };

    return `
      <a href="pattern-detail.html?id=${pattern.id}"
        class="pattern-card"
        data-category="${pattern.category}"
        data-name="${pattern.name.toLowerCase()} ${pattern.nameVi.toLowerCase()}"
        data-description="${pattern.description.toLowerCase()}">
        <div class="pattern-card-top">
          <div class="pattern-card-badges">
            <span class="badge badge-${pattern.category}">${categoryLabels[pattern.category]}</span>
            <span class="badge badge-${pattern.priority}">
              ${priorityLabels[pattern.priority]}
            </span>
            ${isLearned ? '<span class="badge" style="background:var(--accent-green-dim);color:var(--accent-green);border-color:var(--accent-green-border)"><i class="fas fa-check" style="font-size:0.65rem"></i> Đã học</span>' : ''}
          </div>
          <div class="pattern-card-icon">
            <i class="fas ${categoryIcons[pattern.category]}" style="color:var(--accent-blue)"></i>
          </div>
        </div>
        <div>
          <h3>${pattern.name}</h3>
          <p class="text-xs text-muted" style="margin-bottom:6px">${pattern.nameVi}</p>
          <p>${pattern.description}</p>
        </div>
        <div class="pattern-dotnet-tag">
          <i class="fas fa-code" style="font-size:0.65rem"></i>
          ${pattern.dotnetExample.split(',')[0].trim().slice(0, 40)}...
        </div>
        <div class="pattern-card-footer">
          <span><i class="fas fa-clock"></i> ${pattern.readingTime} phút</span>
          <span><i class="fas fa-layer-group"></i> Giai đoạn ${pattern.phase}</span>
          <span style="color:var(--accent-blue)">Xem chi tiết →</span>
        </div>
      </a>
    `;
  }).join('');

  // Init filtering after rendering
  initPatternFiltering();
}

// ── Progress Page Init ─────────────────────────────────────
function initProgressPage() {
  const container = document.getElementById('progress-phases-container');
  if (!container || typeof PATTERNS_DATA === 'undefined' || typeof PHASES_DATA === 'undefined') return;

  const progress = loadProgress();
  const categoryLabels = { creational: 'Creational', structural: 'Structural', behavioral: 'Behavioral' };
  const priorityLabels = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' };

  container.innerHTML = PHASES_DATA.map(phase => {
    const phasePatterns = PATTERNS_DATA.filter(p => phase.patterns.includes(p.id));
    const completed = phasePatterns.filter(p => progress[p.id]).length;
    const pct = phasePatterns.length > 0 ? Math.round((completed / phasePatterns.length) * 100) : 0;

    return `
      <div class="phase-progress-card"
        data-phase-id="${phase.id}"
        data-patterns="${phasePatterns.map(p => p.id).join(',')}">
        <div class="phase-progress-header" onclick="this.closest('.phase-progress-card').classList.toggle('expanded')">
          <div class="phase-progress-title-area">
            <div class="phase-icon" style="background:${phase.color};width:40px;height:40px;font-size:1rem">
              <i class="fas ${phase.icon}"></i>
            </div>
            <div>
              <div class="phase-progress-title">${phase.title}</div>
              <div class="phase-progress-subtitle">${phase.weeks} · ${phasePatterns.length} patterns</div>
            </div>
          </div>
          <div class="phase-progress-right">
            <div style="width:100px">
              <div class="progress-bar-track progress-bar-sm">
                <div class="progress-bar-fill" style="width:${pct}%"></div>
              </div>
            </div>
            <div class="phase-percent-badge ${pct === 100 ? 'complete' : ''}">${pct}%</div>
            <i class="fas fa-chevron-down" style="color:var(--text-muted);font-size:0.85rem;transition:transform 0.3s"></i>
          </div>
        </div>
        <div class="phase-progress-body" style="display:none">
          <div style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="font-size:0.82rem;color:var(--text-muted)">Tiến độ giai đoạn</span>
              <span class="progress-text" style="font-size:0.82rem;color:var(--text-muted)">${completed}/${phasePatterns.length} patterns</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width:${pct}%"></div>
            </div>
          </div>
          <div class="pattern-checklist">
            ${phasePatterns.map(p => {
              const isChecked = !!progress[p.id];
              return `
                <div class="pattern-check-item ${isChecked ? 'checked' : ''}"
                  data-pattern-id="${p.id}"
                  data-pattern-name="${p.name}"
                  tabindex="0"
                  role="checkbox"
                  aria-checked="${isChecked}">
                  <div class="custom-checkbox">
                    ${isChecked ? '<i class="fas fa-check"></i>' : ''}
                  </div>
                  <div class="check-pattern-info">
                    <div class="check-pattern-name">${p.name}</div>
                    <div class="check-pattern-category">
                      <span class="badge badge-${p.category}" style="font-size:0.65rem;padding:2px 7px">${categoryLabels[p.category]}</span>
                    </div>
                  </div>
                  <div class="check-priority-dot ${p.priority}" title="Ưu tiên ${priorityLabels[p.priority]}"></div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Handle phase expand/collapse
  $$('.phase-progress-card').forEach(card => {
    const header = card.querySelector('.phase-progress-header');
    const body = card.querySelector('.phase-progress-body');
    const chevron = card.querySelector('.fa-chevron-down');

    on(header, 'click', () => {
      const isExpanded = card.classList.toggle('expanded');
      if (body) body.style.display = isExpanded ? 'block' : 'none';
      if (chevron) chevron.style.transform = isExpanded ? 'rotate(180deg)' : '';
    });
  });

  // Auto-expand first phase
  const firstCard = $$('.phase-progress-card')[0];
  if (firstCard) {
    firstCard.classList.add('expanded');
    const body = firstCard.querySelector('.phase-progress-body');
    const chevron = firstCard.querySelector('.fa-chevron-down');
    if (body) body.style.display = 'block';
    if (chevron) chevron.style.transform = 'rotate(180deg)';
  }

  // Init progress tracker
  initProgressTracker();

  // Reset button
  const resetBtn = document.getElementById('reset-progress-btn');
  on(resetBtn, 'click', () => {
    if (!confirm('Bạn có chắc muốn xóa toàn bộ tiến độ học? Hành động này không thể hoàn tác.')) return;
    localStorage.removeItem(PROGRESS_KEY);
    showToast('Đã xóa tiến độ học', 'info');
    setTimeout(() => location.reload(), 1000);
  });
}

// ── Intersection Observer (Animations) ────────────────────
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in-up');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  $$('.card, .phase-card, .pattern-card, .stat-bar-item').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
  });
}

// ── Helper Functions ───────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Main Initialization ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Always init these
  initNavigation();
  initSmoothScroll();

  // Page-specific
  const pageId = document.body.dataset.page;

  switch (pageId) {
    case 'home':
      initPhaseCards();
      initProgressDisplay();
      if (typeof PATTERNS_DATA !== 'undefined') {
        initPatternOfDay();
      }
      break;

    case 'patterns':
      initPatternsPage();
      break;

    case 'pattern-detail':
      initPatternDetail();
      break;

    case 'progress':
      initProgressPage();
      break;
  }

  // Code highlighting (global)
  if (window.hljs) {
    document.querySelectorAll('pre code:not([data-highlighted])').forEach(block => {
      hljs.highlightElement(block);
    });
  }

  // Init code copy for static code blocks
  initCodeCopy();
});

// ── Keyboard Shortcuts ─────────────────────────────────────
document.addEventListener('keydown', (e) => {
  // Alt + Arrow keys for pattern navigation
  if (e.altKey && e.key === 'ArrowLeft') {
    const prevLink = $('.pattern-nav-link.prev');
    if (prevLink) prevLink.click();
  }
  if (e.altKey && e.key === 'ArrowRight') {
    const nextLink = $('.pattern-nav-link.next');
    if (nextLink) nextLink.click();
  }

  // Escape to clear search
  if (e.key === 'Escape') {
    const searchInput = $('.search-input');
    if (searchInput && document.activeElement === searchInput) {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
    }
  }

  // / to focus search
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    const searchInput = $('.search-input');
    if (searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
  }
});
