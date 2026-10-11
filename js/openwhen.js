// LUMA "Open When" Digital Capsules Feature
let currentCapsuleSubtab = 'my';
let countdownIntervals = [];

function switchCapsuleSubtab(subtab) {
    currentCapsuleSubtab = subtab;
    document.querySelectorAll('.capsule-subtab').forEach(b => b.classList.remove('active'));

    const activeBtn = document.getElementById(`csubtab-${subtab}`);
    if (activeBtn) activeBtn.classList.add('active');

    loadOpenWhenCapsules();
}

async function loadOpenWhenCapsules() {
    const container = document.getElementById('openWhenContainer');
    if (!container) return;

    countdownIntervals.forEach(clearInterval);
    countdownIntervals = [];

    container.innerHTML = '<div class="loading-spinner">Querying capsule registry...</div>';

    try {
        let res;
        if (currentCapsuleSubtab === 'my') {
            res = await API.getMyCapsules();
        } else {
            res = await API.getReceivedCapsules();
        }

        if (res.success && res.data) {
            renderCapsules(res.data, container);
        }
    } catch (err) {
        container.innerHTML = `<div class="error-state">Failed to query capsules: ${err.message}</div>`;
    }
}

function renderCapsules(capsules, container) {
    if (!capsules || capsules.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
                <svg class="svg-icon" style="width: 36px; height: 36px; opacity: 0.5; margin-bottom: 0.75rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <h3>No ${currentCapsuleSubtab === 'my' ? 'originating' : 'received'} capsules registered</h3>
                <p>Preserve milestones with automated cryptographic unlock dates.</p>
                <button class="btn btn-vault-action mt-2" onclick="openCreateCapsuleModal()">+ Configure New Capsule</button>
            </div>
        `;
        return;
    }

    container.innerHTML = capsules.map(capsule => createCapsuleCardHtml(capsule)).join('');

    capsules.forEach(capsule => {
        if (!capsule.isUnlocked && capsule.unlockDate) {
            startCountdownTimer(capsule.id, capsule.unlockDate);
        }
    });
}

function createCapsuleCardHtml(capsule) {
    const isUnlocked = capsule.isUnlocked;
    const isSelf = capsule.recipientUsername.toLowerCase() === capsule.creator.username.toLowerCase();
    const recipientLabel = isSelf ? 'Self' : `@${escapeHtml(capsule.recipientUsername)}`;

    return `
        <div class="capsule-card ${isUnlocked ? 'unlocked-state' : 'locked-state'}" id="capsule-${capsule.id}">
            <div class="capsule-top">
                <span class="capsule-badge-occasion">${capsule.occasionType || 'MILESTONE'}</span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">Target: ${recipientLabel}</span>
            </div>

            <h4 class="capsule-title">${escapeHtml(capsule.title)}</h4>

            ${capsule.unlockHint ? `
                <div class="capsule-hint-box">
                    <span>Verification Note: "${escapeHtml(capsule.unlockHint)}"</span>
                </div>
            ` : ''}

            ${!isUnlocked && capsule.unlockDate ? `
                <div class="countdown-box">
                    <div class="countdown-label">Time Remaining to Unlock:</div>
                    <div class="countdown-timer" id="countdown-${capsule.id}">Synchronizing...</div>
                </div>
            ` : ''}

            <div class="capsule-action-wrap">
                ${isUnlocked ? `
                    <button class="btn btn-capsule-unlocked" onclick="viewRevealedCapsule(${capsule.id})">
                        <svg class="svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        <span>Inspect Unlocked Payload</span>
                    </button>
                ` : `
                    <button class="btn btn-capsule-unlock" onclick="handleUnlockClick(${capsule.id}, ${capsule.canBeUnlockedNow}, ${capsule.hasPasscode})">
                        <svg class="svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        <span>${capsule.canBeUnlockedNow ? 'Trigger Verification & Unlock' : (capsule.hasPasscode ? 'Bypass with Passcode' : 'Chronologically Locked')}</span>
                    </button>
                `}
            </div>
        </div>
    `;
}

function startCountdownTimer(capsuleId, targetDateString) {
    const timerEl = document.getElementById(`countdown-${capsuleId}`);
    if (!timerEl) return;

    const targetDate = new Date(targetDateString).getTime();

    function update() {
        const now = new Date().getTime();
        const diff = targetDate - now;

        if (diff <= 0) {
            timerEl.textContent = "Condition Satisfied: Ready to Unlock";
            const btn = document.querySelector(`#capsule-${capsuleId} .btn-capsule-unlock`);
            if (btn) {
                btn.innerHTML = `
                    <svg class="svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                    <span>Trigger Verification & Unlock</span>
                `;
            }
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        let str = '';
        if (days > 0) str += `${days}d `;
        str += `${hours.toString().padStart(2, '0')}h : ${minutes.toString().padStart(2, '0')}m : ${seconds.toString().padStart(2, '0')}s`;

        timerEl.textContent = str;
    }

    update();
    const intervalId = setInterval(update, 1000);
    countdownIntervals.push(intervalId);
}

async function handleUnlockClick(capsuleId, canBeUnlockedNow, hasPasscode) {
    let passcode = '';

    if (!canBeUnlockedNow && hasPasscode) {
        passcode = prompt("Capsule is chronologically locked. Please provide authorization bypass passcode:");
        if (passcode === null) return;
    } else if (!canBeUnlockedNow && !hasPasscode) {
        showToast("Access Restricted: Timestamp has not reached scheduled release.", 'error');
        return;
    }

    try {
        showToast("Validating unlock criteria...");
        const res = await API.unlockCapsule(capsuleId, passcode);
        if (res.success && res.data) {
            showToast("Unlock criteria confirmed: Memory revealed", 'success');
            displayCapsuleRevealModal(res.data);
            loadOpenWhenCapsules();
            loadVaultStats();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function viewRevealedCapsule(capsuleId) {
    try {
        const res = await API.unlockCapsule(capsuleId);
        if (res.success && res.data) {
            displayCapsuleRevealModal(res.data);
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function displayCapsuleRevealModal(capsule) {
    document.getElementById('revealCapsuleTitle').textContent = capsule.title;
    document.getElementById('revealCapsuleMeta').textContent = `Sealed by @${capsule.creator.username} on ${formatDate(capsule.createdAt)}`;
    document.getElementById('revealCapsuleMessage').textContent = capsule.lockedMessage || '(No message content)';

    const mediaWrap = document.getElementById('revealCapsuleMediaWrap');
    const imageEl = document.getElementById('revealCapsuleImage');

    if (capsule.lockedMediaUrl) {
        imageEl.src = capsule.lockedMediaUrl;
        mediaWrap.style.display = 'block';
    } else {
        mediaWrap.style.display = 'none';
    }

    openModal('revealCapsuleModal');
}

// Create Capsule Modal
function openCreateCapsuleModal() {
    openModal('createCapsuleModal');
}

async function submitCreateCapsule() {
    const title = document.getElementById('capsuleTitleInput').value.trim();
    const occasionType = document.getElementById('capsuleOccasionSelect').value;
    const recipientUsername = document.getElementById('capsuleRecipientInput').value.trim();
    const lockedMessage = document.getElementById('capsuleMessageInput').value.trim();
    const lockedMediaUrl = document.getElementById('capsuleMediaUrlInput').value.trim();
    const unlockDate = document.getElementById('capsuleUnlockDateInput').value;
    const unlockPasscode = document.getElementById('capsulePasscodeInput').value.trim();
    const unlockHint = document.getElementById('capsuleHintInput').value.trim();

    if (!title || !lockedMessage) {
        showToast('Please provide a milestone title and locked payload message', 'error');
        return;
    }

    try {
        const payload = {
            title,
            occasionType,
            recipientUsername: recipientUsername || null,
            lockedMessage,
            lockedMediaUrl: lockedMediaUrl || null,
            unlockDate: unlockDate || null,
            unlockPasscode: unlockPasscode || null,
            unlockHint: unlockHint || null
        };

        const res = await API.createCapsule(payload);
        if (res.success) {
            closeModal('createCapsuleModal');
            document.getElementById('capsuleTitleInput').value = '';
            document.getElementById('capsuleMessageInput').value = '';
            document.getElementById('capsuleMediaUrlInput').value = '';
            document.getElementById('capsuleHintInput').value = '';
            document.getElementById('capsulePasscodeInput').value = '';

            showToast('Time Capsule committed and locked', 'success');
            loadOpenWhenCapsules();
            loadVaultStats();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}
