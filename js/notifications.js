// LUMA Notifications & Real-Time Alerts
async function refreshNotificationsBadge() {
    if (!currentUser) return;

    try {
        const res = await API.getUnreadNotifCount();
        if (res.success) {
            const count = res.data || 0;
            const topBadge = document.getElementById('unreadNotifBadge');
            const sideBadge = document.getElementById('sidebarNotifBadge');

            if (count > 0) {
                if (topBadge) {
                    topBadge.textContent = count;
                    topBadge.style.display = 'inline-block';
                }
                if (sideBadge) {
                    sideBadge.textContent = count;
                    sideBadge.style.display = 'inline-block';
                }
            } else {
                if (topBadge) topBadge.style.display = 'none';
                if (sideBadge) sideBadge.style.display = 'none';
            }
        }
    } catch (e) {
        // Silently ignore badge error on background poll
    }
}

async function loadNotifications() {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner">Loading notification events...</div>';

    try {
        const res = await API.getNotifications();
        if (res.success && res.data) {
            renderNotifications(res.data, container);
        }
    } catch (err) {
        container.innerHTML = `<div class="error-state">Failed to load notifications: ${err.message}</div>`;
    }
}

function renderNotifications(notifs, container) {
    if (!notifs || notifs.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
                <svg class="svg-icon" style="width: 36px; height: 36px; opacity: 0.5; margin-bottom: 0.75rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                <h3>All Notifications Acknowledged</h3>
                <p>When companion accounts interact with your publications or share vault records, events will appear here.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = notifs.map(n => {
        let iconSvg = '<svg class="svg-icon text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path></svg>';
        
        if (n.type === 'LIKE') {
            iconSvg = '<svg class="svg-icon text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
        } else if (n.type === 'COMMENT') {
            iconSvg = '<svg class="svg-icon text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
        } else if (n.type === 'FOLLOW') {
            iconSvg = '<svg class="svg-icon" style="color: #60A5FA;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>';
        } else if (n.type === 'VAULT_SHARED') {
            iconSvg = '<svg class="svg-icon text-vault" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
        } else if (n.type === 'CAPSULE_RECEIVED' || n.type === 'CAPSULE_UNLOCKED') {
            iconSvg = '<svg class="svg-icon" style="color: #A78BFA;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
        }

        return `
            <div class="notif-item ${!n.read ? 'unread' : ''}">
                <div>${iconSvg}</div>
                <div class="notif-content">
                    <p class="notif-text">${escapeHtml(n.message)}</p>
                    <span class="notif-time">${formatTimeAgo(n.createdAt)}</span>
                </div>
            </div>
        `;
    }).join('');
}

async function markAllNotificationsRead() {
    try {
        await API.markAllNotificationsRead();
        refreshNotificationsBadge();
        loadNotifications();
        showToast('All notifications acknowledged', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}
