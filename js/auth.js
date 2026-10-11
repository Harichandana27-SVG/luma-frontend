// LUMA Auth State & User Session Management
let currentUser = null;

async function initAuth() {
    const token = API.getToken();
    if (token) {
        try {
            const res = await API.getMe();
            if (res && res.success) {
                currentUser = res.data;
                updateAuthUI();
                return;
            }
        } catch (e) {
            console.warn('Session expired or invalid token:', e);
            API.setToken(null);
        }
    }

    // Default to 'hari' demo user on initial load for instant demonstration
    await quickSwitchUser('hari');
}

async function quickSwitchUser(username) {
    try {
        showToast(`Switching account to @${username}...`);
        const res = await API.login(username, 'password123');
        if (res.success) {
            API.setToken(res.data.token);
            currentUser = res.data.user;
            sessionStorage.removeItem('luma_vault_unlocked'); // Lock vault on user switch
            updateAuthUI();
            
            // Sync demo switcher select
            const select = document.getElementById('demoUserSelect');
            if (select) select.value = username;

            // Refresh current view
            if (window.currentView === 'feed') {
                loadFeed();
            } else if (window.currentView === 'vault') {
                resetVaultState();
            } else if (window.currentView === 'profile') {
                loadProfile(currentUser.username);
            }
            
            loadSidebarUser();
            loadSuggestedUsers();
            refreshNotificationsBadge();

            showToast(`Welcome back, ${currentUser.fullName}!`, 'success');
        }
    } catch (err) {
        showToast(err.message || 'Login failed', 'error');
    }
}

function updateAuthUI() {
    if (!currentUser) return;

    const navAvatar = document.getElementById('navUserAvatar');
    const navUsername = document.getElementById('navUsername');
    const composerAvatar = document.getElementById('composerAvatar');
    const dropdownFullName = document.getElementById('dropdownFullName');
    const dropdownHandle = document.getElementById('dropdownHandle');

    if (navAvatar) navAvatar.src = currentUser.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + currentUser.username;
    if (navUsername) navUsername.textContent = currentUser.fullName.split(' ')[0];
    if (composerAvatar) composerAvatar.src = currentUser.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + currentUser.username;
    if (dropdownFullName) dropdownFullName.textContent = currentUser.fullName;
    if (dropdownHandle) dropdownHandle.textContent = '@' + currentUser.username;
}

function toggleUserDropdown() {
    const menu = document.getElementById('userDropdownMenu');
    if (menu) {
        menu.classList.toggle('active');
    }
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('userMenuWrapper');
    const menu = document.getElementById('userDropdownMenu');
    if (wrapper && menu && !wrapper.contains(e.target)) {
        menu.classList.remove('active');
    }
});

function logout() {
    API.setToken(null);
    currentUser = null;
    sessionStorage.removeItem('luma_vault_unlocked');
    showToast('Signed out of LUMA');
    quickSwitchUser('hari');
}

async function submitChangePin() {
    const pin = document.getElementById('newPinInput').value;
    if (!pin || pin.length < 4) {
        showToast('PIN must be at least 4 digits', 'error');
        return;
    }

    try {
        await API.setVaultPin(pin);
        closeModal('changePinModal');
        showToast('Vault PIN updated successfully!', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function openChangePinModal() {
    const menu = document.getElementById('userDropdownMenu');
    if (menu) menu.classList.remove('active');
    openModal('changePinModal');
}
