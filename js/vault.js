// LUMA Vault — The Private Space for Expression
let currentVaultTypeFilter = '';

function isVaultUnlocked() {
    return sessionStorage.getItem('luma_vault_unlocked') === 'true';
}

function initVault() {
    if (isVaultUnlocked()) {
        showVaultDashboard();
    } else {
        showVaultLockScreen();
    }
}

function resetVaultState() {
    sessionStorage.removeItem('luma_vault_unlocked');
    showVaultLockScreen();
}

function showVaultLockScreen() {
    document.getElementById('vaultLockScreen').style.display = 'flex';
    document.getElementById('vaultMainContent').style.display = 'none';
    const pinInput = document.getElementById('vaultPinInput');
    if (pinInput) {
        pinInput.value = '';
        pinInput.focus();
    }
}

function showVaultDashboard() {
    document.getElementById('vaultLockScreen').style.display = 'none';
    document.getElementById('vaultMainContent').style.display = 'block';
    loadVaultStats();
    loadVaultEntries();
}

function quickFillPin(pin) {
    const input = document.getElementById('vaultPinInput');
    if (input) {
        input.value = pin;
        input.focus();
    }
}

async function unlockVault() {
    const pin = document.getElementById('vaultPinInput').value.trim();
    if (!pin) {
        showToast('Please enter your Master Vault PIN', 'error');
        return;
    }

    try {
        const res = await API.verifyVaultPin(pin);
        if (res.success && res.data) {
            sessionStorage.setItem('luma_vault_unlocked', 'true');
            showToast('LUMA Vault unlocked: Cryptographic session authenticated', 'success');
            showVaultDashboard();
        }
    } catch (err) {
        showToast('Authentication failed: Invalid Master PIN', 'error');
    }
}

function lockVault() {
    sessionStorage.removeItem('luma_vault_unlocked');
    showToast('LUMA Vault session terminated and locked.');
    showVaultLockScreen();
}

// Vault Statistics
async function loadVaultStats() {
    try {
        const res = await API.getVaultStats();
        if (res.success && res.data) {
            const stats = res.data;
            document.getElementById('metricTotalMemories').textContent = stats.totalMemories || 0;
            document.getElementById('metricEncrypted').textContent = stats.encryptedMemories || 0;
            document.getElementById('metricShared').textContent = stats.sharedWithTrusted || 0;
            document.getElementById('metricCapsules').textContent = stats.openWhenCapsules || 0;
        }
    } catch (e) {
        console.error('Failed to load vault stats', e);
    }
}

// Vault Tab Switcher
function switchVaultTab(tab) {
    document.querySelectorAll('.vault-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.vault-tab-panel').forEach(p => p.classList.remove('active'));

    const tabBtn = document.getElementById(`vtab-${tab}`);
    const panel = document.getElementById(`vpanel-${tab}`);

    if (tabBtn) tabBtn.classList.add('active');
    if (panel) panel.classList.add('active');

    if (tab === 'memories') loadVaultEntries();
    else if (tab === 'open-when') loadOpenWhenCapsules();
    else if (tab === 'shared') loadSharedVaultEntries();
    else if (tab === 'audit') loadVaultAuditLogs();
}

// Vault Entries
async function loadVaultEntries() {
    const container = document.getElementById('vaultEntriesContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner">Decrypting confidential records...</div>';

    try {
        const res = await API.getVaultEntries(currentVaultTypeFilter);
        if (res.success && res.data) {
            renderVaultEntries(res.data, container, true);
        }
    } catch (err) {
        container.innerHTML = `<div class="error-state">Failed to load records: ${err.message}</div>`;
    }
}

function filterVaultType(type) {
    currentVaultTypeFilter = type;
    document.querySelectorAll('.type-filter-group .filter-pill').forEach(p => p.classList.remove('active'));
    
    const pills = document.querySelectorAll('.type-filter-group .filter-pill');
    pills.forEach(p => {
        if ((type === '' && p.textContent.includes('All')) || (type && p.textContent.toUpperCase().includes(type))) {
            p.classList.add('active');
        }
    });

    loadVaultEntries();
}

function renderVaultEntries(entries, container, allowDelete = true) {
    if (!entries || entries.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
                <svg class="svg-icon" style="width: 36px; height: 36px; opacity: 0.5; margin-bottom: 0.75rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <h3>Vault partition empty</h3>
                <p>This repository remains isolated from public feeds. You may commit confidential notes or media here.</p>
                <button class="btn btn-vault-action mt-2" onclick="openCreateVaultModal()">+ New Vault Record</button>
            </div>
        `;
        return;
    }

    container.innerHTML = entries.map(entry => {
        let visBadge = '';
        if (entry.visibility === 'PRIVATE') {
            visBadge = '<span class="badge-vis badge-vis-private">Private</span>';
        } else if (entry.visibility === 'TRUSTED_CIRCLE') {
            visBadge = `<span class="badge-vis badge-vis-trusted" title="Delegated to: ${escapeHtml(entry.trustedUsernames || '')}">Trusted Circle</span>`;
        } else if (entry.visibility === 'TEMPORARY_ACCESS') {
            visBadge = `<span class="badge-vis badge-vis-temp">Expires: ${formatDateTime(entry.expiresAt)}</span>`;
        }

        const tagCode = (entry.moodEmoji && entry.moodEmoji.length > 1 && !entry.moodEmoji.includes('💭')) ? entry.moodEmoji : entry.type;

        return `
            <div class="vault-entry-card" id="vault-entry-${entry.id}">
                <div class="vec-header">
                    <span class="vec-code">${escapeHtml(tagCode)}</span>
                    <div class="vec-badges">
                        <span class="badge-enc">AES-256</span>
                        ${visBadge}
                    </div>
                </div>

                <h4 class="vec-title">${escapeHtml(entry.title)}</h4>
                <p class="vec-content">${escapeHtml(entry.content || '')}</p>

                ${entry.mediaUrl ? `
                    ${isVideoUrl(entry.mediaUrl) ? `
                        <video controls src="${escapeHtml(entry.mediaUrl)}" class="vec-media" playsinline preload="metadata"></video>
                    ` : `
                        <img src="${escapeHtml(entry.mediaUrl)}" class="vec-media" alt="Confidential attachment" loading="lazy" onclick="openMediaLightbox('${escapeHtml(entry.mediaUrl)}', '${escapeHtml(entry.title)}')">
                    `}
                ` : ''}

                <div class="vec-footer">
                    <span>${formatTimeAgo(entry.createdAt)}</span>
                    ${allowDelete ? `
                        <button class="btn-icon-danger" title="Purge record" onclick="deleteVaultEntry(${entry.id})">
                            <svg class="svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    ` : `
                        <span>Originator: @${escapeHtml(entry.owner.username)}</span>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

async function loadSharedVaultEntries() {
    const container = document.getElementById('vaultSharedContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner">Inspecting companion delegated records...</div>';

    try {
        const res = await API.getSharedVaultEntries();
        if (res.success && res.data) {
            renderVaultEntries(res.data, container, false);
        }
    } catch (err) {
        container.innerHTML = `<div class="error-state">Failed to load delegated records: ${err.message}</div>`;
    }
}

async function deleteVaultEntry(id) {
    if (!confirm('Confirm permanent erasure of this encrypted record?')) return;

    try {
        await API.deleteVaultEntry(id);
        const el = document.getElementById(`vault-entry-${id}`);
        if (el) el.remove();
        loadVaultStats();
        showToast('Record purged from Vault partition', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Create Vault Memory Modal
function openCreateVaultModal() {
    openModal('createVaultModal');
}

function toggleVaultVisibilityFields(vis) {
    const trustedGroup = document.getElementById('vaultTrustedUsersGroup');
    const expiryGroup = document.getElementById('vaultExpiryGroup');

    if (vis === 'TRUSTED_CIRCLE') {
        trustedGroup.style.display = 'block';
        expiryGroup.style.display = 'none';
    } else if (vis === 'TEMPORARY_ACCESS') {
        trustedGroup.style.display = 'block';
        expiryGroup.style.display = 'block';
    } else {
        trustedGroup.style.display = 'none';
        expiryGroup.style.display = 'none';
    }
}

async function submitCreateVaultEntry() {
    const title = document.getElementById('vaultTitleInput').value.trim();
    const type = document.getElementById('vaultTypeSelect').value;
    const moodEmoji = document.getElementById('vaultMoodInput').value.trim() || 'CONFIDENTIAL';
    const content = document.getElementById('vaultContentInput').value.trim();
    const mediaUrl = document.getElementById('vaultMediaUrlInput').value.trim();
    const visibility = document.getElementById('vaultVisibilitySelect').value;
    const trustedUsernames = document.getElementById('vaultTrustedUsersInput').value.trim();
    const expiresAt = document.getElementById('vaultExpiresAtInput').value;

    if (!title) {
        showToast('Please provide an artifact title', 'error');
        return;
    }

    try {
        const payload = {
            title,
            type,
            moodEmoji,
            content,
            mediaUrl,
            visibility,
            trustedUsernames: (visibility !== 'PRIVATE') ? trustedUsernames : null,
            expiresAt: (visibility === 'TEMPORARY_ACCESS' && expiresAt) ? expiresAt : null,
            encrypted: true
        };

        const res = await API.createVaultEntry(payload);
        if (res.success) {
            closeModal('createVaultModal');
            document.getElementById('vaultTitleInput').value = '';
            document.getElementById('vaultContentInput').value = '';
            document.getElementById('vaultMediaUrlInput').value = '';
            document.getElementById('vaultMoodInput').value = '';

            showToast('Confidential artifact committed to Vault', 'success');
            loadVaultStats();
            loadVaultEntries();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Security Audit Logs
async function loadVaultAuditLogs() {
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Retrieving cryptographic audit logs...</td></tr>';

    try {
        const res = await API.getVaultAuditLogs();
        if (res.success && res.data) {
            const logs = res.data;
            if (logs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No audit entries recorded.</td></tr>';
                return;
            }

            tbody.innerHTML = logs.map(log => `
                <tr>
                    <td style="font-family: var(--font-mono); font-size: 0.78rem;">${formatDateTime(log.timestamp)}</td>
                    <td><span class="audit-action-tag">${escapeHtml(log.action)}</span></td>
                    <td>${escapeHtml(log.details || '')}</td>
                    <td style="font-family: var(--font-mono); font-size: 0.78rem;">${escapeHtml(log.ipAddress || '127.0.0.1')}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" style="color: var(--danger);">Failed to retrieve audit log: ${err.message}</td></tr>`;
    }
}
