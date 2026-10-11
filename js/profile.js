// LUMA Profile & Bookmarks Management
let currentProfileUsername = '';
let currentProfileTab = 'posts';

async function loadProfile(username) {
    if (!username && currentUser) {
        username = currentUser.username;
    }
    if (!username) return;

    currentProfileUsername = username;

    // Switch view to profile directly without calling navigateTo (eliminates recursive glitch)
    window.currentView = 'profile';
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navItem = document.getElementById('nav-profile');
    if (navItem && currentUser && username === currentUser.username) {
        navItem.classList.add('active');
    }

    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const targetSection = document.getElementById('view-profile');
    if (targetSection) targetSection.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Reset profile tab
    currentProfileTab = 'posts';
    document.querySelectorAll('.profile-tab-btn').forEach(b => b.classList.remove('active'));
    const ptabPosts = document.getElementById('ptab-posts');
    if (ptabPosts) ptabPosts.classList.add('active');

    const container = document.getElementById('profilePostsContainer');
    if (container) {
        container.innerHTML = '<div class="loading-spinner">Loading publications...</div>';
    }

    try {
        const res = await API.getUserProfile(username);
        if (currentProfileUsername !== username) return; // Discard stale response

        if (res.success && res.data) {
            renderProfileHeader(res.data);
            await loadProfilePosts(username);
        } else {
            if (container) {
                container.innerHTML = '<div class="empty-state" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary);"><p>User profile could not be loaded.</p></div>';
            }
        }
    } catch (err) {
        if (currentProfileUsername !== username) return;
        showToast(err.message, 'error');
        if (container) {
            container.innerHTML = `<div class="error-state">Failed to load profile: ${err.message}</div>`;
        }
    }
}

function renderProfileHeader(data) {
    const user = data.user;
    const isSelf = currentUser && user.id === currentUser.id;

    const avatarEl = document.getElementById('profilePageAvatar');
    if (avatarEl) avatarEl.src = user.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + user.username;

    const nameEl = document.getElementById('profilePageFullName');
    if (nameEl) nameEl.textContent = user.fullName;

    const handleEl = document.getElementById('profilePageHandle');
    if (handleEl) handleEl.textContent = '@' + user.username;

    const bioEl = document.getElementById('profilePageBio');
    if (bioEl) bioEl.textContent = user.bio || 'Exploring the LUMA universe.';

    const countPosts = document.getElementById('profileCountPosts');
    if (countPosts) countPosts.textContent = data.postsCount || 0;

    const countFollowers = document.getElementById('profileCountFollowers');
    if (countFollowers) countFollowers.textContent = data.followersCount || 0;

    const countFollowing = document.getElementById('profileCountFollowing');
    if (countFollowing) countFollowing.textContent = data.followingCount || 0;

    // Show/hide Saved tab (only owner can view their own private archive)
    const savedTabBtn = document.getElementById('ptab-saved');
    if (savedTabBtn) {
        savedTabBtn.style.display = isSelf ? 'inline-block' : 'none';
    }

    const slot = document.getElementById('profileActionsSlot');
    if (slot) {
        if (isSelf) {
            slot.innerHTML = '<button class="btn btn-outline" onclick="openEditProfileModal()">Configure Identity</button>';
        } else {
            const isFollowing = data.following;
            slot.innerHTML = `
                <button class="btn ${isFollowing ? 'btn-outline' : 'btn-primary'}" onclick="toggleFollowProfile('${user.username}', ${isFollowing})">
                    ${isFollowing ? 'Following' : '+ Follow'}
                </button>
            `;
        }
    }
}

async function toggleFollowProfile(username, isFollowing) {
    try {
        if (isFollowing) {
            await API.unfollowUser(username);
            showToast(`Unfollowed @${username}`);
        } else {
            await API.followUser(username);
            showToast(`Following @${username}!`, 'success');
        }
        loadProfile(username);
        loadSidebarUser();
        loadSuggestedUsers();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function loadProfilePosts(username) {
    const container = document.getElementById('profilePostsContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner">Loading publications...</div>';

    try {
        const res = await API.getUserPosts(username);
        if (currentProfileUsername !== username) return; // Discard stale response

        if (res.success && res.data) {
            renderPosts(res.data, container);
        } else {
            container.innerHTML = '<div class="empty-state" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary);"><p>No publications recorded yet.</p></div>';
        }
    } catch (err) {
        if (currentProfileUsername !== username) return;
        container.innerHTML = `<div class="error-state">Failed to load publications: ${err.message}</div>`;
    }
}

function switchProfileTab(tab) {
    currentProfileTab = tab;
    document.querySelectorAll('.profile-tab-btn').forEach(b => b.classList.remove('active'));

    const tabBtn = document.getElementById(`ptab-${tab}`);
    if (tabBtn) tabBtn.classList.add('active');

    if (tab === 'posts') {
        loadProfilePosts(currentProfileUsername);
    } else if (tab === 'saved') {
        loadSavedPosts('profilePostsContainer');
    }
}

async function loadSavedPosts(containerId = 'savedPostsContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner">Loading archived publications...</div>';

    try {
        const res = await API.getSavedPosts();
        if (res.success && res.data) {
            renderPosts(res.data, container);
        } else {
            container.innerHTML = '<div class="empty-state" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary);"><p>No archived publications yet.</p></div>';
        }
    } catch (err) {
        container.innerHTML = `<div class="error-state">Failed to load archives: ${err.message}</div>`;
    }
}

// Edit Profile Modal
function openEditProfileModal() {
    if (!currentUser) return;
    document.getElementById('editFullNameInput').value = currentUser.fullName || '';
    document.getElementById('editBioInput').value = currentUser.bio || '';
    document.getElementById('editAvatarUrlInput').value = currentUser.avatarUrl || '';
    openModal('editProfileModal');
}

async function submitEditProfile() {
    const fullName = document.getElementById('editFullNameInput').value.trim();
    const bio = document.getElementById('editBioInput').value.trim();
    const avatarUrl = document.getElementById('editAvatarUrlInput').value.trim();

    try {
        const res = await API.updateProfile(fullName, bio, avatarUrl);
        if (res.success) {
            currentUser = res.data;
            updateAuthUI();
            loadSidebarUser();
            closeModal('editProfileModal');
            showToast('Profile updated!', 'success');
            loadProfile(currentUser.username);
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}
