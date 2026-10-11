// LUMA Master Application Controller
window.currentView = 'feed';

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Auth & App
    await initAuth();
    navigateTo('feed');
    loadSidebarUser();
    loadSuggestedUsers();
    refreshNotificationsBadge();

    // Background poll for notification updates
    setInterval(refreshNotificationsBadge, 15000);
});

// View Navigation Router
function navigateTo(view) {
    window.currentView = view;

    // Update Sidebar Navigation state
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navItem = document.getElementById(`nav-${view}`);
    if (navItem) navItem.classList.add('active');

    // Switch View Section
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const targetSection = document.getElementById(`view-${view}`);
    if (targetSection) targetSection.classList.add('active');

    // Load View Data
    if (view === 'feed') {
        loadFeed();
    } else if (view === 'explore') {
        loadExplore();
    } else if (view === 'vault') {
        initVault();
    } else if (view === 'notifications') {
        loadNotifications();
    } else if (view === 'saved') {
        loadSavedPosts('savedPostsContainer');
    } else if (view === 'profile') {
        if (currentUser) loadProfile(currentUser.username);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Sidebar Widgets
async function loadSidebarUser() {
    if (!currentUser) return;

    try {
        const res = await API.getUserProfile(currentUser.username);
        if (res.success && res.data) {
            const data = res.data;
            const u = data.user;

            const avatarEl = document.getElementById('widgetAvatar');
            const nameEl = document.getElementById('widgetFullName');
            const handleEl = document.getElementById('widgetUsername');
            const bioEl = document.getElementById('widgetBio');

            if (avatarEl) avatarEl.src = u.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + u.username;
            if (nameEl) nameEl.textContent = u.fullName;
            if (handleEl) handleEl.textContent = '@' + u.username;
            if (bioEl) bioEl.textContent = u.bio || 'Exploring the LUMA universe.';

            const postsEl = document.getElementById('widgetPostsCount');
            const followersEl = document.getElementById('widgetFollowersCount');
            const followingEl = document.getElementById('widgetFollowingCount');

            if (postsEl) postsEl.textContent = data.postsCount || 0;
            if (followersEl) followersEl.textContent = data.followersCount || 0;
            if (followingEl) followingEl.textContent = data.followingCount || 0;
        }
    } catch (e) {
        console.warn('Failed to load sidebar user card', e);
    }
}

async function loadSuggestedUsers() {
    const container = document.getElementById('suggestedUsersContainer');
    if (!container) return;

    try {
        const res = await API.getSuggestedUsers();
        if (res.success && res.data) {
            const users = res.data;
            if (users.length === 0) {
                container.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted);">No suggestions right now</div>';
                return;
            }

            container.innerHTML = users.map(u => `
                <div class="suggested-user-item">
                    <div class="s-info" onclick="loadProfile('${u.username}')">
                        <img src="${u.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + u.username}" class="avatar-sm" alt="${escapeHtml(u.fullName)}">
                        <div class="s-names">
                            <strong>${escapeHtml(u.fullName)}</strong>
                            <span>@${escapeHtml(u.username)}</span>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-outline" onclick="quickFollow('${u.username}', this)">Follow</button>
                </div>
            `).join('');
        }
    } catch (e) {
        console.warn('Failed to load suggested users', e);
    }
}

async function quickFollow(username, btn) {
    try {
        await API.followUser(username);
        btn.textContent = 'Following';
        btn.disabled = true;
        showToast(`Started following @${username}!`, 'success');
        loadSidebarUser();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Explore View
let currentExploreTag = '';

async function loadExplore(searchQuery = '') {
    const container = document.getElementById('explorePostsGrid');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner">Discovering new perspectives...</div>';

    try {
        const res = await API.getPosts('all', currentExploreTag, searchQuery);
        if (res.success && res.data) {
            renderExploreGrid(res.data, container);
        }
    } catch (err) {
        container.innerHTML = `<div class="error-state">Failed to load explore feed: ${err.message}</div>`;
    }
}

function renderExploreGrid(posts, container) {
    if (!posts || posts.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem;">No moments matched your criteria.</div>';
        return;
    }

    container.innerHTML = posts.map(post => {
        const author = post.author || {};
        return `
            <div class="grid-post-card" onclick="openPostDetail(${post.id})">
                ${post.mediaUrl ? `
                    <img src="${escapeHtml(post.mediaUrl)}" class="grid-post-img" alt="Explore moment">
                ` : `
                    <div style="height: 140px; background: var(--bg-surface-elevated); display: flex; align-items: center; justify-content: center;">
                        <svg class="svg-icon" style="width: 32px; height: 32px; opacity: 0.4;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                    </div>
                `}
                <div class="grid-post-info">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                        <img src="${author.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + author.username}" class="avatar-sm">
                        <span style="font-size: 0.8rem; font-weight: 700;">@${escapeHtml(author.username)}</span>
                    </div>
                    <p style="font-size: 0.85rem; color: #D1D5DB; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${escapeHtml(post.caption || '')}
                    </p>
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.6rem;">
                        <span style="display: flex; align-items: center; gap: 0.3rem;"><svg class="svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> ${post.likesCount || 0}</span>
                        <span style="display: flex; align-items: center; gap: 0.3rem;"><svg class="svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> ${post.commentsCount || 0}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterExploreTag(tag) {
    currentExploreTag = tag;
    document.querySelectorAll('.tag-filter-row .tag-filter-btn').forEach(b => b.classList.remove('active'));

    const btns = document.querySelectorAll('.tag-filter-row .tag-filter-btn');
    btns.forEach(b => {
        if ((!tag && b.textContent.includes('All')) || (tag && b.textContent.includes(tag))) {
            b.classList.add('active');
        }
    });

    loadExplore();
}

function handleExploreSearch(e) {
    if (e.key === 'Enter') {
        triggerExploreSearch();
    }
}

function triggerExploreSearch() {
    const input = document.getElementById('exploreSearchInput');
    const query = input ? input.value.trim() : '';
    loadExplore(query);
}

function handleGlobalSearch(e) {
    if (e.key === 'Enter') {
        const query = e.target.value.trim();
        if (!query) return;

        navigateTo('explore');
        const exploreInput = document.getElementById('exploreSearchInput');
        if (exploreInput) exploreInput.value = query;
        loadExplore(query);
    }
}

function openPostDetail(postId) {
    navigateTo('feed');
    const postEl = document.getElementById(`post-${postId}`);
    if (postEl) {
        postEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        postEl.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.5)';
        setTimeout(() => postEl.style.boxShadow = '', 2000);
    }
}

// Modal System
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        if (id === 'mediaLightboxModal') {
            const vid = document.getElementById('lightboxVideo');
            if (vid) {
                vid.pause();
                vid.src = '';
            }
        }
    }
}

// Close modals when clicking backdrop
document.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('modal-backdrop')) {
        e.target.style.display = 'none';
        document.body.style.overflow = 'auto';
        const vid = document.getElementById('lightboxVideo');
        if (vid) {
            vid.pause();
            vid.src = '';
        }
    }
});

// Close modals when pressing Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop').forEach(m => {
            m.style.display = 'none';
        });
        document.body.style.overflow = 'auto';
        const vid = document.getElementById('lightboxVideo');
        if (vid) {
            vid.pause();
            vid.src = '';
        }
    }
});

// Toast System
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'toast-success' : (type === 'error' ? 'toast-error' : '')}`;

    let icon = '<svg class="svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    if (type === 'success') {
        icon = '<svg class="svg-icon-xs text-vault" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'error') {
        icon = '<svg class="svg-icon-xs text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Utility Formatting Functions
function formatTimeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function isVideoUrl(url) {
    if (!url) return false;
    const clean = url.toLowerCase().split('?')[0];
    return clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.ogg') || clean.endsWith('.mov') || clean.endsWith('.mkv');
}
