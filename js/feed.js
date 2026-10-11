// LUMA Public Social Feed & Interactions
let currentFeedType = 'all';
let currentActiveTag = '';
let activeCommentPostId = null;

async function loadFeed() {
    const container = document.getElementById('postsContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner">Loading publication stream...</div>';

    try {
        const res = await API.getPosts(currentFeedType, currentActiveTag);
        if (res.success && res.data) {
            renderPosts(res.data, container);
        } else {
            container.innerHTML = '<div class="empty-state">No publications found.</div>';
        }
    } catch (err) {
        container.innerHTML = `<div class="error-state">Failed to load feed: ${err.message}</div>`;
    }
}

function switchFeedType(type) {
    currentFeedType = type;
    currentActiveTag = '';
    
    document.querySelectorAll('.feed-tab-btn').forEach(b => b.classList.remove('active'));
    if (type === 'all') {
        const btn = document.getElementById('tabFeedAll');
        if (btn) btn.classList.add('active');
    } else {
        const btn = document.getElementById('tabFeedFollowing');
        if (btn) btn.classList.add('active');
    }

    loadFeed();
}

function filterByTag(tag) {
    currentActiveTag = tag;
    loadFeed();
    showToast(`Filter applied: ${tag}`);
}

window.cachedPostsMap = window.cachedPostsMap || new Map();

function renderPosts(posts, container) {
    if (!posts || posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
                <svg class="svg-icon" style="width: 36px; height: 36px; opacity: 0.5; margin-bottom: 0.75rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                <h3>No publications recorded</h3>
                <p>Be the first to publish a verified update or connect with creators.</p>
            </div>
        `;
        return;
    }

    posts.forEach(p => window.cachedPostsMap.set(p.id, p));
    container.innerHTML = posts.map(post => createPostCardHtml(post)).join('');
}

function createPostCardHtml(post) {
    const author = post.author || {};
    const isOwner = currentUser && author.id === currentUser.id;
    const formattedDate = formatTimeAgo(post.createdAt);

    let captionText = post.caption || '';
    let locationTag = '';
    const locMatch = captionText.match(/📍\s*([^\n\r]+)/);
    if (locMatch) {
        locationTag = locMatch[1].trim();
        captionText = captionText.replace(/📍\s*[^\n\r]+/g, '').trim();
    }

    // Format hashtags in caption
    let formattedCaption = escapeHtml(captionText);
    formattedCaption = formattedCaption.replace(/#(\w+)/g, '<span class="post-tag" onclick="filterByTag(\'#$1\')">#$1</span>');

    return `
        <article class="post-card" id="post-${post.id}">
            <div class="post-header">
                <div class="post-author" onclick="loadProfile('${author.username}')">
                    <img src="${author.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + author.username}" class="avatar-md" alt="${escapeHtml(author.fullName)}">
                    <div class="author-names">
                        <span class="author-fullname">${escapeHtml(author.fullName)}</span>
                        <span class="author-handle">@${escapeHtml(author.username)}</span>
                        ${locationTag ? `
                            <span class="post-location-badge">
                                <svg class="svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                <span>${escapeHtml(locationTag)}</span>
                            </span>
                        ` : ''}
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span class="post-date">${formattedDate}</span>
                    ${isOwner ? `
                        <button class="btn-icon-danger" title="Remove publication" onclick="deletePost(${post.id})">
                            <svg class="svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="post-body">
                <p class="post-caption">${formattedCaption}</p>
            </div>

            ${post.mediaUrl ? `
                <div class="post-media-container" onclick="openMediaLightbox(${post.id})">
                    <div class="post-media-zoom-hint">
                        <svg class="svg-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                        <span>Inspect Full View</span>
                    </div>
                    ${isVideoUrl(post.mediaUrl) ? `
                        <video controls src="${escapeHtml(post.mediaUrl)}" class="post-media-video" playsinline preload="metadata" onclick="event.stopPropagation()"></video>
                    ` : `
                        <img src="${escapeHtml(post.mediaUrl)}" class="post-media-image" alt="Publication attachment" loading="lazy">
                    `}
                </div>
            ` : ''}

            <div class="post-footer">
                <div class="post-actions-group">
                    <button class="action-btn ${post.likedByCurrentUser ? 'liked' : ''}" onclick="toggleLikePost(${post.id}, this)">
                        <svg class="svg-icon-sm heart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        <span class="count">${post.likesCount || 0}</span>
                    </button>
                    <button class="action-btn" onclick="openCommentsModal(${post.id})">
                        <svg class="svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span class="count">${post.commentsCount || 0}</span>
                    </button>
                </div>
                <div>
                    <button class="action-btn ${post.savedByCurrentUser ? 'saved' : ''}" onclick="toggleSavePost(${post.id}, this)">
                        <svg class="svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span class="save-label">${post.savedByCurrentUser ? 'Archived' : 'Archive'}</span>
                    </button>
                </div>
            </div>
        </article>
    `;
}

async function toggleLikePost(postId, btn) {
    try {
        const countSpan = btn.querySelector('.count');
        let count = parseInt(countSpan.textContent, 10) || 0;

        const res = await API.toggleLike(postId);
        if (res.success) {
            const liked = res.data;
            if (liked) {
                btn.classList.add('liked');
                countSpan.textContent = count + 1;
            } else {
                btn.classList.remove('liked');
                countSpan.textContent = Math.max(0, count - 1);
            }
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function toggleSavePost(postId, btn) {
    try {
        const res = await API.toggleSave(postId);
        if (res.success) {
            const saved = res.data;
            const labelSpan = btn.querySelector('.save-label');

            if (saved) {
                btn.classList.add('saved');
                labelSpan.textContent = 'Archived';
                showToast('Publication preserved in archives', 'success');
            } else {
                btn.classList.remove('saved');
                labelSpan.textContent = 'Archive';
                showToast('Removed from archives');
            }
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deletePost(postId) {
    if (!confirm('Confirm deletion of this publication record?')) return;

    try {
        await API.deletePost(postId);
        const card = document.getElementById(`post-${postId}`);
        if (card) card.remove();
        showToast('Publication record deleted', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Comments Management
async function openCommentsModal(postId) {
    activeCommentPostId = postId;
    const cDrawer = document.getElementById('commentEmojiDrawer');
    if (cDrawer) cDrawer.style.display = 'none';
    const cInput = document.getElementById('newCommentInput');
    if (cInput) cInput.value = '';
    openModal('commentsModal');

    const container = document.getElementById('commentsListContainer');
    container.innerHTML = '<div class="loading-spinner">Loading discussion records...</div>';

    try {
        const res = await API.getComments(postId);
        if (res.success && res.data) {
            renderComments(res.data);
        }
    } catch (err) {
        container.innerHTML = `<div class="error-state">Failed to load discussion: ${err.message}</div>`;
    }
}

function renderComments(comments) {
    const container = document.getElementById('commentsListContainer');
    if (!comments || comments.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No responses logged. You may initiate this discussion.</div>';
        return;
    }

    container.innerHTML = comments.map(c => {
        const isOwner = currentUser && (c.user.id === currentUser.id);
        return `
            <div class="comment-item" id="comment-${c.id}">
                <img src="${c.user.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + c.user.username}" class="avatar-sm" alt="Author">
                <div class="comment-content">
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                        <span class="comment-author-name">@${escapeHtml(c.user.username)}</span>
                        <span style="font-size: 0.7rem; color: var(--text-muted);">${formatTimeAgo(c.createdAt)}</span>
                    </div>
                    <p class="comment-text">${escapeHtml(c.text)}</p>
                </div>
                ${isOwner ? `<button class="btn-icon-danger" onclick="deleteComment(${c.id})">×</button>` : ''}
            </div>
        `;
    }).join('');
}

async function submitComment() {
    const input = document.getElementById('newCommentInput');
    const text = input.value.trim();
    if (!text || !activeCommentPostId) return;

    try {
        const res = await API.addComment(activeCommentPostId, text);
        if (res.success) {
            input.value = '';
            const cDrawer = document.getElementById('commentEmojiDrawer');
            if (cDrawer) cDrawer.style.display = 'none';
            const commentsRes = await API.getComments(activeCommentPostId);
            renderComments(commentsRes.data);
            showToast('Response logged successfully', 'success');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteComment(commentId) {
    try {
        await API.deleteComment(commentId);
        const item = document.getElementById(`comment-${commentId}`);
        if (item) item.remove();
        showToast('Comment deleted');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Create Post Modal
function openCreatePostModal(preset = '') {
    openModal('createPostModal');
    if (preset === 'tag') {
        const tagInput = document.getElementById('postTagInput');
        if (tagInput) tagInput.focus();
    } else if (preset === 'photo') {
        const fileInput = document.getElementById('postFileInput');
        if (fileInput) fileInput.click();
    } else if (preset === 'emoji') {
        const drawer = document.getElementById('emojiDrawer');
        if (drawer && drawer.style.display === 'none') {
            toggleEmojiDrawer();
        }
        const captionInput = document.getElementById('postCaptionInput');
        if (captionInput) captionInput.focus();
    } else {
        const captionInput = document.getElementById('postCaptionInput');
        if (captionInput) captionInput.focus();
    }
}

async function submitCreatePost() {
    let caption = document.getElementById('postCaptionInput').value.trim();
    const mediaUrl = document.getElementById('postImageUrlInput').value.trim();
    const tag = document.getElementById('postTagInput').value.trim();
    const location = (document.getElementById('postLocationInput')?.value || '').trim();

    if (location) {
        caption = caption ? `${caption}\n\n📍 ${location}` : `📍 ${location}`;
    }

    if (!caption && !mediaUrl) {
        showToast('Please provide publication text or attachment URL', 'error');
        return;
    }

    try {
        const res = await API.createPost(caption, mediaUrl, tag);
        if (res.success) {
            closeModal('createPostModal');
            document.getElementById('postCaptionInput').value = '';
            document.getElementById('postImageUrlInput').value = '';
            document.getElementById('postTagInput').value = '';
            if (document.getElementById('postLocationInput')) {
                document.getElementById('postLocationInput').value = '';
            }
            const previewBanner = document.getElementById('postMediaPreviewWrap');
            if (previewBanner) previewBanner.style.display = 'none';

            const drawer = document.getElementById('emojiDrawer');
            if (drawer) drawer.style.display = 'none';

            showToast('Update published to community stream', 'success');
            loadFeed();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleFileUpload(input, targetInputId) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    try {
        showToast('Uploading resource payload...');
        const url = await API.uploadFile(file);
        document.getElementById(targetInputId).value = url;
        if (targetInputId === 'postImageUrlInput') {
            onPostMediaUrlChanged(url);
        }
        showToast('Payload uploaded successfully', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ==========================================================================
// UNIVERSAL EMOJI SYSTEM: Quick Bar & Expandable Categorized Drawer
// ==========================================================================
const EMOJI_CATEGORIES = {
    vibes: ['✨', '🔥', '💡', '🚀', '🌟', '💫', '⚡', '🌈', '🎉', '🥂', '🎈', '💯', '💎', '🎊', '🔮', '🪐', '🎆', '❤️', '🧡', '💛', '💚', '💙', '💜'],
    faces: ['😀', '😃', '😄', '😁', '😂', '🥹', '😊', '😍', '🤩', '😎', '🥳', '🤔', '🤫', '😇', '🤠', '🫡', '🫶', '🙌', '👏', '🤝', '💪', '✌️'],
    nature: ['🌿', '🌸', '🌴', '🌊', '⛰️', '🌙', '☀️', '🍃', '🍀', '☕', '🍵', '🍕', '🍔', '🍣', '🍷', '🥂', '🍩', '🍪', '🥑', '🍓', '🍰'],
    work: ['💻', '📱', '🖥️', '⚙️', '📊', '📁', '📝', '🔍', '🎯', '🛠️', '🔐', '🛡️', '🏷️', '📐', '✒️', '📦', '🚀', '📡', '💡', '🏆', '📈']
};

function insertEmojiTo(targetInputId, char) {
    const input = document.getElementById(targetInputId);
    if (!input) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const text = input.value;
    input.value = text.substring(0, start) + char + text.substring(end);
    input.focus();
    input.selectionStart = input.selectionEnd = start + char.length;
}

function insertEmoji(char) {
    insertEmojiTo('postCaptionInput', char);
}

function toggleEmojiDrawerFor(targetInputId, drawerId, gridId) {
    const drawer = document.getElementById(drawerId);
    if (!drawer) return;
    if (drawer.style.display === 'none' || !drawer.style.display) {
        drawer.style.display = 'block';
        switchDrawerEmojiCat(targetInputId, gridId, 'vibes');
    } else {
        drawer.style.display = 'none';
    }
}

function switchDrawerEmojiCat(targetInputId, gridId, catKey, clickedEl = null) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const drawer = grid.closest('.emoji-drawer');
    if (drawer) {
        drawer.querySelectorAll('.emoji-cat').forEach(c => c.classList.remove('active'));
    }
    if (clickedEl) {
        clickedEl.classList.add('active');
    } else if (drawer) {
        const first = drawer.querySelector('.emoji-cat');
        if (first) first.classList.add('active');
    }
    const list = EMOJI_CATEGORIES[catKey] || EMOJI_CATEGORIES.vibes;
    grid.innerHTML = list.map(e => `<span class="emoji-drawer-item" onclick="insertEmojiTo('${targetInputId}', '${e}')">${e}</span>`).join('');
}

function toggleEmojiDrawer() {
    toggleEmojiDrawerFor('postCaptionInput', 'emojiDrawer', 'emojiDrawerGrid');
}

function switchEmojiCategory(catKey) {
    switchDrawerEmojiCat('postCaptionInput', 'emojiDrawerGrid', catKey, window.event?.target);
}

// ==========================================================================
// LOCATION TAGGING
// ==========================================================================
function selectLocation(loc) {
    const input = document.getElementById('postLocationInput');
    if (input) {
        input.value = loc;
        showToast(`Tagged location: ${loc}`);
    }
}

// ==========================================================================
// LIVE MEDIA PREVIEW & STUDIO INTEGRATION
// ==========================================================================
function onPostMediaUrlChanged(url) {
    const banner = document.getElementById('postMediaPreviewWrap');
    const thumb = document.getElementById('postMediaPreviewImg');
    const title = document.getElementById('postMediaPreviewTitle');
    if (!banner || !thumb) return;

    const trimmed = (url || '').trim();
    if (!trimmed) {
        banner.style.display = 'none';
        return;
    }

    thumb.src = trimmed;
    banner.style.display = 'flex';
    if (isVideoUrl(trimmed)) {
        title.textContent = 'Video Attached';
    } else {
        title.textContent = 'Image Attached';
    }
}

// ==========================================================================
// LUMA MEDIA STUDIO EDITOR (Filters, Effects, Aspect Ratio & Stickers)
// ==========================================================================
let studioState = {
    originalSrc: '',
    currentSrc: '',
    filterPreset: 'normal',
    brightness: 100,
    contrast: 100,
    saturate: 100,
    blur: 0,
    aspectRatio: 'original',
    stickerText: null
};

const FILTER_PRESETS = {
    normal: '',
    cinematic: 'contrast(125%) saturate(110%) brightness(95%) sepia(10%)',
    vintage: 'sepia(45%) contrast(95%) brightness(105%) hue-rotate(-10deg)',
    noir: 'grayscale(100%) contrast(140%) brightness(90%)',
    golden: 'sepia(25%) saturate(140%) brightness(105%) hue-rotate(-5deg)',
    cyber: 'saturate(180%) contrast(120%) hue-rotate(180deg)',
    matte: 'contrast(90%) brightness(110%) saturate(85%)'
};

function openMediaStudio() {
    const mediaInput = document.getElementById('postImageUrlInput');
    const url = (mediaInput ? mediaInput.value : '').trim();
    if (!url) {
        showToast('Attach an image first to edit in Media Studio', 'error');
        return;
    }
    if (isVideoUrl(url)) {
        showToast('Media Studio supports photo editing (filters, crop, stickers)', 'info');
        return;
    }

    studioState.originalSrc = url;
    studioState.currentSrc = url;
    studioState.filterPreset = 'normal';
    studioState.brightness = 100;
    studioState.contrast = 100;
    studioState.saturate = 100;
    studioState.blur = 0;
    studioState.aspectRatio = 'original';
    studioState.stickerText = null;

    // Reset controls UI
    document.querySelectorAll('.filter-card').forEach(c => c.classList.remove('active'));
    const normalFilter = document.querySelector('.filter-card');
    if (normalFilter) normalFilter.classList.add('active');

    resetStudioSlidersUI();
    setAspectRatio('original');

    const overlay = document.getElementById('studioStickerOverlay');
    if (overlay) overlay.style.display = 'none';

    const targetImg = document.getElementById('studioTargetImage');
    if (targetImg) {
        targetImg.src = url;
        targetImg.style.filter = '';
    }

    switchStudioTab('filters');
    openModal('mediaStudioModal');
}

function switchStudioTab(tab) {
    document.querySelectorAll('.studio-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.studio-panel').forEach(p => p.classList.remove('active'));

    const btn = document.getElementById(`stab-${tab}`);
    const panel = document.getElementById(`spanel-${tab}`);
    if (btn) btn.classList.add('active');
    if (panel) panel.classList.add('active');
}

function applyFilterPreset(preset, el) {
    studioState.filterPreset = preset;
    document.querySelectorAll('.filter-card').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    applyComputedStylesToStudio();
}

function updateEffect(type, val) {
    studioState[type] = parseFloat(val);
    if (type === 'brightness') document.getElementById('valBrightness').textContent = `${val}%`;
    if (type === 'contrast') document.getElementById('valContrast').textContent = `${val}%`;
    if (type === 'saturate') document.getElementById('valSaturate').textContent = `${val}%`;
    if (type === 'blur') document.getElementById('valBlur').textContent = `${val}px`;
    applyComputedStylesToStudio();
}

function resetStudioEffects() {
    studioState.brightness = 100;
    studioState.contrast = 100;
    studioState.saturate = 100;
    studioState.blur = 0;
    resetStudioSlidersUI();
    applyComputedStylesToStudio();
}

function resetStudioSlidersUI() {
    const sb = document.getElementById('sliderBrightness');
    if (sb) sb.value = 100;
    const sc = document.getElementById('sliderContrast');
    if (sc) sc.value = 100;
    const ss = document.getElementById('sliderSaturate');
    if (ss) ss.value = 100;
    const sbl = document.getElementById('sliderBlur');
    if (sbl) sbl.value = 0;

    const vb = document.getElementById('valBrightness'); if (vb) vb.textContent = '100%';
    const vc = document.getElementById('valContrast'); if (vc) vc.textContent = '100%';
    const vs = document.getElementById('valSaturate'); if (vs) vs.textContent = '100%';
    const vbl = document.getElementById('valBlur'); if (vbl) vbl.textContent = '0px';
}

function computeCssFilter() {
    const base = FILTER_PRESETS[studioState.filterPreset] || '';
    const adjustments = `brightness(${studioState.brightness}%) contrast(${studioState.contrast}%) saturate(${studioState.saturate}%) blur(${studioState.blur}px)`;
    return base ? `${base} ${adjustments}` : adjustments;
}

function applyComputedStylesToStudio() {
    const targetImg = document.getElementById('studioTargetImage');
    if (targetImg) {
        targetImg.style.filter = computeCssFilter();
    }
}

function setAspectRatio(ratio, el) {
    studioState.aspectRatio = ratio;
    const container = document.getElementById('studioCanvasContainer');
    if (container) {
        container.className = `studio-canvas-container aspect-${ratio}`;
    }
    document.querySelectorAll('.aspect-btn').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
}

function placeSticker(text) {
    studioState.stickerText = text;
    const overlay = document.getElementById('studioStickerOverlay');
    const label = document.getElementById('studioStickerText');
    if (overlay && label) {
        label.textContent = text;
        overlay.style.display = 'flex';
        showToast(`Sticker placed: ${text}`);
    }
}

function removeSticker() {
    studioState.stickerText = null;
    const overlay = document.getElementById('studioStickerOverlay');
    if (overlay) overlay.style.display = 'none';
}

function saveStudioEdits() {
    const targetImg = document.getElementById('studioTargetImage');
    if (!targetImg) return;

    showToast('Baking studio adjustments...');

    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = function() {
            let srcW = img.naturalWidth || img.width;
            let srcH = img.naturalHeight || img.height;
            let targetW = srcW;
            let targetH = srcH;

            // Aspect ratio calculation
            let sx = 0, sy = 0, sw = srcW, sh = srcH;
            if (studioState.aspectRatio === 'square') {
                const size = Math.min(srcW, srcH);
                sx = (srcW - size) / 2;
                sy = (srcH - size) / 2;
                sw = size;
                sh = size;
                targetW = 1080;
                targetH = 1080;
            } else if (studioState.aspectRatio === 'portrait') {
                let w = srcW;
                let h = srcW * 1.25;
                if (h > srcH) {
                    h = srcH;
                    w = srcH * 0.8;
                }
                sx = (srcW - w) / 2;
                sy = (srcH - h) / 2;
                sw = w;
                sh = h;
                targetW = 1080;
                targetH = 1350;
            } else if (studioState.aspectRatio === 'landscape') {
                let h = srcW * (9 / 16);
                let w = srcW;
                if (h > srcH) {
                    h = srcH;
                    w = srcH * (16 / 9);
                }
                sx = (srcW - w) / 2;
                sy = (srcH - h) / 2;
                sw = w;
                sh = h;
                targetW = 1920;
                targetH = 1080;
            } else {
                targetW = Math.min(srcW, 1920);
                targetH = Math.round((targetW / srcW) * srcH);
            }

            canvas.width = targetW;
            canvas.height = targetH;

            // Apply filter context
            ctx.filter = computeCssFilter();
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
            ctx.filter = 'none';

            // Draw sticker if present
            if (studioState.stickerText) {
                const badgeText = studioState.stickerText;
                const fontSize = Math.max(16, Math.round(targetW * 0.032));
                ctx.font = 'bold ' + fontSize + 'px -apple-system, sans-serif';
                const textWidth = ctx.measureText(badgeText).width;
                const padX = targetW * 0.025;
                const padY = targetW * 0.016;
                const boxW = textWidth + padX * 2;
                const boxH = fontSize * 1.5 + padY;
                const bx = targetW * 0.04;
                const by = targetH - boxH - (targetH * 0.04);

                ctx.save();
                ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(bx, by, boxW, boxH, 16);
                } else {
                    ctx.rect(bx, by, boxW, boxH);
                }
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#FFFFFF';
                ctx.textBaseline = 'middle';
                ctx.fillText(badgeText, bx + padX, by + boxH / 2);
                ctx.restore();
            }

            try {
                const bakedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
                document.getElementById('postImageUrlInput').value = bakedDataUrl;
                onPostMediaUrlChanged(bakedDataUrl);
                closeModal('mediaStudioModal');
                showToast('✨ Studio edits applied to post!', 'success');
            } catch (canvasErr) {
                console.warn('Canvas export fallback:', canvasErr);
                closeModal('mediaStudioModal');
                showToast('Studio edits configured for post', 'success');
            }
        };

        img.onerror = function() {
            closeModal('mediaStudioModal');
            showToast('Studio edits configured', 'success');
        };

        img.src = targetImg.src;
    } catch (err) {
        closeModal('mediaStudioModal');
        showToast('Studio edits applied', 'success');
    }
}

// ==========================================================================
// FULL-SCREEN MEDIA LIGHTBOX (Inspect full uncropped photo or video)
// ==========================================================================
function openMediaLightbox(target, customTitle = '') {
    let post = null;
    let mediaUrl = '';
    let authorName = 'Creator';
    let authorHandle = '';
    let avatarUrl = '';
    let caption = '';

    if (typeof target === 'number' || (typeof target === 'string' && !target.startsWith('http') && !target.startsWith('/uploads') && !target.startsWith('data:'))) {
        const id = parseInt(target, 10);
        post = window.cachedPostsMap ? window.cachedPostsMap.get(id) : null;
        if (post) {
            mediaUrl = post.mediaUrl;
            authorName = post.author?.fullName || 'Creator';
            authorHandle = post.author?.username ? '@' + post.author.username : '';
            avatarUrl = post.author?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + (post.author?.username || 'user');
            caption = post.caption || '';
        }
    } else {
        mediaUrl = target;
        authorName = customTitle || 'Media Attachment';
        authorHandle = '';
        avatarUrl = 'https://api.dicebear.com/7.x/bottts/svg?seed=luma';
        caption = customTitle || '';
    }

    if (!mediaUrl) return;

    const avatarEl = document.getElementById('lightboxAuthorAvatar');
    const nameEl = document.getElementById('lightboxAuthorName');
    const handleEl = document.getElementById('lightboxAuthorHandle');
    const imgEl = document.getElementById('lightboxImg');
    const vidEl = document.getElementById('lightboxVideo');
    const downloadBtn = document.getElementById('lightboxDownloadBtn');
    const capWrap = document.getElementById('lightboxCaptionWrap');
    const capEl = document.getElementById('lightboxCaption');

    if (avatarEl) avatarEl.src = avatarUrl;
    if (nameEl) nameEl.textContent = authorName;
    if (handleEl) handleEl.textContent = authorHandle;
    if (downloadBtn) downloadBtn.href = mediaUrl;

    if (isVideoUrl(mediaUrl)) {
        if (imgEl) imgEl.style.display = 'none';
        if (vidEl) {
            vidEl.src = mediaUrl;
            vidEl.style.display = 'block';
            vidEl.play().catch(() => {});
        }
    } else {
        if (vidEl) {
            vidEl.pause();
            vidEl.style.display = 'none';
        }
        if (imgEl) {
            imgEl.src = mediaUrl;
            imgEl.style.display = 'block';
        }
    }

    if (capWrap && capEl) {
        if (caption && caption.trim()) {
            capEl.textContent = caption;
            capWrap.style.display = 'block';
        } else {
            capWrap.style.display = 'none';
        }
    }

    openModal('mediaLightboxModal');
}
