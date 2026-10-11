// LUMA API Client
// In local testing, requests default to relative path ('').
// In cloud deployment (e.g. Vercel frontend), optionally point to your deployed backend:
const API_BASE = window.LUMA_BACKEND_URL || localStorage.getItem('luma_backend_url') || '';

const API = {
    getToken() {
        return localStorage.getItem('luma_token');
    },

    setToken(token) {
        if (token) {
            localStorage.setItem('luma_token', token);
        } else {
            localStorage.removeItem('luma_token');
        }
    },

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...(options.headers || {})
            }
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json().catch(() => null);

            if (!response.ok) {
                const errorMsg = (data && data.message) ? data.message : `Request failed with status ${response.status}`;
                throw new Error(errorMsg);
            }

            return data;
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error);
            throw error;
        }
    },

    // Auth endpoints
    login(usernameOrEmail, password) {
        return this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ usernameOrEmail, password })
        });
    },

    register(username, email, password, fullName) {
        return this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password, fullName })
        });
    },

    getMe() {
        return this.request('/api/auth/me');
    },

    verifyVaultPin(pin) {
        return this.request('/api/auth/vault-pin/verify', {
            method: 'POST',
            body: JSON.stringify({ pin })
        });
    },

    setVaultPin(pin) {
        return this.request('/api/auth/vault-pin/set', {
            method: 'POST',
            body: JSON.stringify({ pin })
        });
    },

    // Posts endpoints
    getPosts(feed = 'all', tag = '', query = '') {
        const params = new URLSearchParams();
        if (feed) params.append('feed', feed);
        if (tag) params.append('tag', tag);
        if (query) params.append('query', query);
        return this.request(`/api/posts?${params.toString()}`);
    },

    createPost(caption, mediaUrl, tag) {
        return this.request('/api/posts', {
            method: 'POST',
            body: JSON.stringify({ caption, mediaUrl, tag })
        });
    },

    getPostById(id) {
        return this.request(`/api/posts/${id}`);
    },

    deletePost(id) {
        return this.request(`/api/posts/${id}`, { method: 'DELETE' });
    },

    toggleLike(id) {
        return this.request(`/api/posts/${id}/like`, { method: 'POST' });
    },

    toggleSave(id) {
        return this.request(`/api/posts/${id}/save`, { method: 'POST' });
    },

    getSavedPosts() {
        return this.request('/api/posts/saved');
    },

    getUserPosts(username) {
        return this.request(`/api/posts/user/${username}`);
    },

    // Comments endpoints
    getComments(postId) {
        return this.request(`/api/comments/post/${postId}`);
    },

    addComment(postId, text) {
        return this.request(`/api/comments/post/${postId}`, {
            method: 'POST',
            body: JSON.stringify({ text })
        });
    },

    deleteComment(commentId) {
        return this.request(`/api/comments/${commentId}`, { method: 'DELETE' });
    },

    // Users & Profile endpoints
    getUserProfile(username) {
        return this.request(`/api/users/${username}`);
    },

    updateProfile(fullName, bio, avatarUrl) {
        return this.request('/api/users/profile', {
            method: 'PUT',
            body: JSON.stringify({ fullName, bio, avatarUrl })
        });
    },

    followUser(username) {
        return this.request(`/api/users/${username}/follow`, { method: 'POST' });
    },

    unfollowUser(username) {
        return this.request(`/api/users/${username}/follow`, { method: 'DELETE' });
    },

    searchUsers(query) {
        return this.request(`/api/users/search?q=${encodeURIComponent(query)}`);
    },

    getSuggestedUsers() {
        return this.request('/api/users/suggested');
    },

    // LUMA Vault endpoints
    getVaultEntries(type = '') {
        const query = type ? `?type=${type}` : '';
        return this.request(`/api/vault/entries${query}`);
    },

    createVaultEntry(entry) {
        return this.request('/api/vault/entries', {
            method: 'POST',
            body: JSON.stringify(entry)
        });
    },

    getVaultEntry(id) {
        return this.request(`/api/vault/entries/${id}`);
    },

    deleteVaultEntry(id) {
        return this.request(`/api/vault/entries/${id}`, { method: 'DELETE' });
    },

    getSharedVaultEntries() {
        return this.request('/api/vault/shared');
    },

    getVaultStats() {
        return this.request('/api/vault/stats');
    },

    getVaultAuditLogs() {
        return this.request('/api/vault/audit-logs');
    },

    // "Open When" Digital Capsules
    getMyCapsules() {
        return this.request('/api/open-when/my');
    },

    getReceivedCapsules() {
        return this.request('/api/open-when/received');
    },

    createCapsule(capsule) {
        return this.request('/api/open-when', {
            method: 'POST',
            body: JSON.stringify(capsule)
        });
    },

    unlockCapsule(id, passcode = '') {
        return this.request(`/api/open-when/${id}/unlock`, {
            method: 'POST',
            body: JSON.stringify({ passcode })
        });
    },

    // Notifications endpoints
    getNotifications() {
        return this.request('/api/notifications');
    },

    getUnreadNotifCount() {
        return this.request('/api/notifications/unread-count');
    },

    markAllNotificationsRead() {
        return this.request('/api/notifications/read-all', { method: 'POST' });
    },

    // Media File Upload
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const token = this.getToken();
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            headers,
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'File upload failed');
        return data.data.url;
    }
};
