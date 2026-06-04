let services = [];
let selectedService = null;
let currentEnv = 'Development';
let settings = {};

let currentBranches = []; // New: store current branches for filtering

// Color customization state
let configTheme = 'dark'; // 'dark' or 'light'
let colorState = {
    dark: { accent: '', text: '', dim: '', terminal: '' },
    light: { accent: '', text: '', dim: '', terminal: '' }
};

let currentGitTab = 'branches';

let commitMessages = [];
let currentCommitMsgIndex = -1;


async function init() {
    initTheme();
    await loadSettings();
    await refreshServices();
    setInterval(refreshServices, 5000); // Tăng tần suất từ 60s lên 5s

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Slash' && e.target.tagName !== 'INPUT') document.getElementById('svc-search').focus();
        if (e.code === 'Escape') {
            closeSettings();
            closeHistoryModal();
            closeStatsModal();
            closeShortcutsModal();
            closeAlertModal();
            closeVPNModal();
        }

        if (e.altKey && e.shiftKey) {
            if (e.code === 'KeyG') toggleGitManagement();
            if (e.code === 'KeyU') toggleVPNManagement();
            if (e.code === 'ArrowLeft') nextCommitMsg();
            if (e.code === 'ArrowRight') prevCommitMsg();
        }
    });
    await initVPN();
}

function filterServices() {
    const query = document.getElementById('svc-search').value.toLowerCase().trim();
    const items = document.querySelectorAll('.service-item');
    items.forEach(item => {
        const name = item.querySelector('.service-name').innerText.toLowerCase();
        item.style.display = name.includes(query) ? 'flex' : 'none';
    });
}

function handleSearchKey(e) {
    if (e.key === 'Enter') {
        const firstVisible = Array.from(document.querySelectorAll('.service-item')).find(i => i.style.display !== 'none');
        if (firstVisible) {
            firstVisible.click();
            document.getElementById('svc-search').blur();
        }
    }
}

function filterBranches() {
    const query = document.getElementById('branch-search').value.toLowerCase().trim();
    const items = document.querySelectorAll('#branches-list > div');
    items.forEach(item => {
        const name = item.querySelector('span').innerText.toLowerCase();
        item.style.display = name.includes(query) ? 'flex' : 'none';
    });
}

function switchGitTab(tab) {
    currentGitTab = tab;
    document.querySelectorAll('.git-tab-content').forEach(c => c.style.display = 'none');
    document.getElementById(`git-content-${tab}`).style.display = 'block';

    document.querySelectorAll('#git-card .env-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`git-tab-${tab}`).classList.add('active');

    if (selectedService) loadGitTabContent(tab);
}

async function loadGitTabContent(tab) {
    const svc = selectedService;
    if (!svc) return;

    // Clear search when loading
    if (tab === 'branches') document.getElementById('branch-search').value = '';

    const listId = `${tab}-list`;
    const listEl = document.getElementById(listId);
    listEl.innerHTML = '<div class="shimmer" style="height: 40px"></div>'.repeat(2);

    try {
        const res = await fetch(`/api/git/${tab}/${svc.name}`);
        const data = await res.json();
        listEl.innerHTML = '';

        if (tab === 'branches') {

            data.forEach(branchInfo => {
                const branch = branchInfo.name;
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; background: var(--bg-hover); border-radius: 8px; border: 1px solid var(--border); transition: 0.2s;';

                const isCurrent = branch === svc.branch;
                if (isCurrent) {
                    row.style.borderColor = 'var(--accent)';
                    row.style.background = 'var(--accent-glow)';
                }

                const nameSpan = document.createElement('span');
                nameSpan.style.cssText = 'font-family: var(--font-mono); font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; margin-right: 16px;';
                nameSpan.innerText = branch;
                
                if (branchInfo.ahead > 0 || branchInfo.behind > 0) {
                    const statusSpan = document.createElement('span');
                    statusSpan.style.cssText = 'font-size: 10px; margin-left: 8px; font-weight: normal;';
                    statusSpan.innerHTML = `
                        ${branchInfo.ahead > 0 ? `<span style="color: #2ecc71; margin-right: 4px;">↑${branchInfo.ahead}</span>` : ''}
                        ${branchInfo.behind > 0 ? `<span style="color: #e74c3c;">↓${branchInfo.behind}</span>` : ''}
                    `;
                    nameSpan.appendChild(statusSpan);
                }

                if (isCurrent) nameSpan.style.color = 'var(--text-main)';

                row.appendChild(nameSpan);

                if (isCurrent) {
                    const badge = document.createElement('span');
                    badge.style.cssText = 'font-size: 10px; padding: 2px 8px; background: var(--accent); color: white; border-radius: 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;';
                    badge.innerText = 'Active';
                    row.appendChild(badge);
                } else {
                    const actions = document.createElement('div');
                    actions.style.cssText = 'display: flex; gap: 6px;';

                    const mBtn = document.createElement('button');
                    mBtn.style.cssText = 'font-size: 11px; padding: 4px 8px; height: 28px; white-space: nowrap; background: #9b59b6; border: none; color: white;';
                    mBtn.innerText = 'Merge';
                    mBtn.onclick = (e) => { e.stopPropagation(); mergeBranch(branch); };
                    actions.appendChild(mBtn);

                    const bBtn = document.createElement('button');
                    bBtn.style.cssText = 'font-size: 11px; padding: 4px 8px; height: 28px; white-space: nowrap; background: var(--bg-body); border: 1px solid var(--border);';
                    bBtn.innerText = 'New Branch';
                    bBtn.onclick = (e) => { e.stopPropagation(); createBranchFrom(branch); };
                    actions.appendChild(bBtn);

                    const cBtn = document.createElement('button');
                    cBtn.style.cssText = 'font-size: 11px; padding: 4px 12px; height: 28px; white-space: nowrap;';
                    cBtn.innerText = 'Checkout';
                    cBtn.onclick = () => checkoutBranch(branch);
                    actions.appendChild(cBtn);

                    row.appendChild(actions);
                }
                listEl.appendChild(row);
            });
        } else if (tab === 'commits') {
            commitMessages = data.map(c => c.subject);
            data.forEach(c => {
                const row = document.createElement('div');
                row.style.cssText = 'padding: 10px 14px; border-bottom: 1px solid var(--border); background: var(--bg-card); margin-bottom: 4px; border-radius: 8px; position: relative;';
                if (c.is_unpushed) {
                    row.style.borderLeft = '4px solid #3498db';
                    row.style.background = 'rgba(52, 152, 219, 0.05)';
                }
                const unpushedBadge = c.is_unpushed ? '<span style="font-size: 9px; padding: 1px 6px; background: #3498db; color: white; border-radius: 4px; margin-left: 8px; font-weight: bold;">UNPUSHED</span>' : '';
                
                row.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                        <div>
                            <span style="color: var(--accent); font-family: var(--font-mono); font-weight: 700; cursor: pointer;" 
                                  onclick="copyToClipboard('${c.hash}')" title="Copy hash">${c.hash}</span>
                            ${unpushedBadge}
                            <span style="color: var(--text-dim); margin-left: 10px; font-size: 11px;">${c.date}</span>
                        </div>
                        <div style="display: flex; gap: 6px;">
                            <button class="primary" style="font-size: 10px; padding: 2px 8px; height: 24px;" 
                                    onclick="useCommitMsg('${c.subject.replace(/'/g, "\\'")}')">Use Msg</button>
                            <button style="font-size: 10px; padding: 2px 8px; height: 24px;" 
                                    onclick="createBranchFrom('${c.hash}')" title="Create branch from this commit">Branch</button>
                            <button style="font-size: 10px; padding: 2px 8px; height: 24px;" 
                                    onclick="checkoutBranch('${c.hash}')">Checkout</button>
                        </div>
                    </div>
                    <div style="color: var(--text-main); font-size: 13px; line-height: 1.4; margin-bottom: 4px;">${c.subject}</div>
                    <div style="color: var(--text-dim); font-size: 11px;">Author: <span style="color: var(--text-main)">${c.author}</span></div>
                `;
                listEl.appendChild(row);
            });
        } else if (tab === 'stash') {

            if (data.length === 0) {
                listEl.innerHTML = '<div style="padding: 10px; color: var(--text-dim);">No stashes found.</div>';
            } else {
                data.forEach((s, idx) => {
                    const row = document.createElement('div');
                    row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-hover); border-radius: 8px; margin-bottom: 6px; border: 1px solid var(--border);';
                    row.innerHTML = `
                        <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--text-main); margin-right: 12px;">${s}</div>
                        <button class="primary" style="font-size: 10px; padding: 2px 8px; height: 24px; background: #2ecc71;" 
                                onclick="popStash(${idx})">Pop</button>
                    `;
                    listEl.appendChild(row);
                });
            }
        }
    } catch (err) {
        listEl.innerHTML = `<div style="color: var(--error)">Error: ${err.message}</div>`;
    }
}

async function checkoutBranch(branch) {
    if (!selectedService) return;

    let cleanBranch = branch.trim();
    if (cleanBranch.startsWith('remotes/origin/')) {
        cleanBranch = cleanBranch.replace('remotes/origin/', '');
    } else if (cleanBranch.startsWith('origin/')) {
        cleanBranch = cleanBranch.replace('origin/', '');
    }

    const terminal = document.getElementById('terminal');
    terminal.innerText = `Checking out ${cleanBranch}...\n`;

    const doCheckout = async () => {
        const res = await fetch(`/api/git/checkout/${selectedService.name}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branch: cleanBranch })
        });

        let result;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            result = await res.json();
        } else {
            const text = await res.text();
            console.error("Non-JSON response:", text);
            result = { error: text || res.statusText };
        }

        if (res.ok) {
            terminal.innerText += (result.message || "Checkout success") + '\nSuccess!\n';
            await refreshSelectedService();
        } else {
            const err = result.error || "";
            if (err.includes("local changes") || err.includes("overwritten by checkout")) {
                // Fetch changed files to show in modal
                const sRes = await fetch(`/api/git/status/${selectedService.name}`);
                if (sRes.ok) {
                    const files = await sRes.json();
                    openRollbackModal(files, cleanBranch);
                } else {
                    const sErr = await sRes.text();
                    terminal.innerText += `Error fetching status: ${sErr}\n`;
                    showAlert("Error", "Could not fetch status: " + sErr);
                }
            } else {
                terminal.innerText += `Error: ${err}\n`;
                showAlert("Checkout Failed", err);
            }
        }
    };

    await doCheckout();
}

let pendingConflictFiles = [];
let pendingCheckoutBranch = null;
function openRollbackModal(files, branch) {
    pendingConflictFiles = files || [];
    pendingCheckoutBranch = branch;
    const list = document.getElementById('rollback-file-list');
    list.innerHTML = '';
    list.style.alignItems = 'stretch'; // Stretch items to full width

    // Default stash message
    document.getElementById('stash-message-input').value = 'Auto stash before checkout';

    if (!files || files.length === 0) {
        list.innerHTML = '<div style="padding: 10px; color: var(--text-dim); text-align: center; width: 100%;">No conflicting files found in status.</div>';
    } else {
        files.forEach(f => {
            const item = document.createElement('label');
            item.style.cssText = 'display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 8px 12px; border-radius: 6px; width: 100%; justify-content: flex-start; transition: 0.2s; text-align: left;';
            item.onmouseover = () => item.style.background = 'var(--bg-hover)';
            item.onmouseout = () => item.style.background = 'transparent';
            item.innerHTML = `
                <input type="checkbox" value="${f}" checked style="margin: 0; width: 16px; height: 16px; flex-shrink: 0;"> 
                <span style="font-family: var(--font-mono); font-size: 13px; color: var(--text-main); word-break: break-all; line-height: 1.4;">${f}</span>
            `;
            list.appendChild(item);
        });
    }
    document.getElementById('rollback-modal-overlay').style.display = 'flex';
}

function closeRollbackModal() {
    document.getElementById('rollback-modal-overlay').style.display = 'none';
}

async function confirmRollbackAndCheckout() {
    const selected = Array.from(document.querySelectorAll('#rollback-file-list input:checked')).map(i => i.value);
    const unselected = pendingConflictFiles.filter(f => !selected.includes(f));
    const msg = document.getElementById('stash-message-input').value.trim();

    closeRollbackModal();
    const terminal = document.getElementById('terminal');

    if (selected.length > 0) {
        terminal.innerText += `Stashing ${selected.length} selected files...\n`;
        const sRes = await fetch(`/api/git/stash-push/${selectedService.name}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg, files: selected })
        });
        if (!sRes.ok) {
            const sResult = await sRes.json();
            showAlert("Stash Failed", sResult.error);
            return;
        }
    }

    if (unselected.length > 0) {
        terminal.innerText += `Discarding ${unselected.length} unselected files...\n`;
        const rRes = await fetch(`/api/git/rollback/${selectedService.name}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: unselected })
        });
        if (!rRes.ok) {
            const rResult = await rRes.json();
            showAlert("Discard Failed", rResult.error);
            return;
        }
    }

    terminal.innerText += "Retrying checkout...\n";
    checkoutBranch(pendingCheckoutBranch);
}

async function confirmStashAndCheckout() {
    const msg = document.getElementById('stash-message-input').value.trim();
    closeRollbackModal();
    const terminal = document.getElementById('terminal');
    terminal.innerText += "Stashing all changes...\n";
    const sRes = await fetch(`/api/git/stash-push/${selectedService.name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
    });
    if (sRes.ok) {
        terminal.innerText += "Stash success. Retrying checkout...\n";
        checkoutBranch(pendingCheckoutBranch);
    } else {
        const sResult = await sRes.json();
        showAlert("Stash Failed", sResult.error);
    }
}

async function popStash(index) {
    if (!selectedService) return;
    showConfirm("Pop Stash", `Are you sure you want to POP stash@{${index}} for ${selectedService.name}?`, async () => {
        const terminal = document.getElementById('terminal');
        terminal.innerText = `Popping stash@{${index}}...\n`;

        try {
            const res = await fetch(`/api/git/stash-pop/${selectedService.name}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index })
            });
            const result = await res.json();
            if (res.ok) {
                terminal.innerText += result.message + '\nSuccess!\n';
                await refreshSelectedService();
                loadGitTabContent('stash');
            } else {
                terminal.innerText += `Error: ${result.error}\n`;
                showAlert("Pop Failed", result.error);
            }
        } catch (err) {
            terminal.innerText += `Error: ${err.message}\n`;
        }
    });
}

function useCommitMsg(msg) {
    document.getElementById('deploy-msg').value = msg;
    validateForm();
}

async function createBranchFrom(base) {
    if (!selectedService) return;
    showPrompt("Create New Branch", `Creating a new branch from <b>${base}</b>. Please enter branch name:`, async (name) => {
        const terminal = document.getElementById('terminal');
        terminal.innerText = `Creating branch "${name}" from "${base}"...\n`;

        try {
            const res = await fetch(`/api/git/create-branch/${selectedService.name}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, base })
            });
            const result = await res.json();
            if (res.ok) {
                terminal.innerText += result.message + '\nSuccess!\n';
                await refreshSelectedService();
                loadGitTabContent(currentGitTab);
                showAlert("Success", `Created and switched to branch "${name}"`);
            } else {
                terminal.innerText += `Error: ${result.error}\n`;
                showAlert("Failed", result.error);
            }
        } catch (err) {
            terminal.innerText += `Error: ${err.message}\n`;
        }
    });
}

async function mergeBranch(branch) {
    if (!selectedService) return;
    showConfirm("Merge Branch", `Are you sure you want to merge <b>${branch}</b> into current branch for ${selectedService.name}?`, async () => {
        const terminal = document.getElementById('terminal');
        terminal.innerText = `Merging ${branch} into current...\n`;

        try {
            const res = await fetch(`/api/git/merge/${selectedService.name}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ branch })
            });
            const result = await res.json();
            if (res.ok) {
                terminal.innerText += result.message + '\nSuccess!\n';
                await refreshSelectedService();
                showAlert("Success", `Merged ${branch} successfully`);
            } else {
                terminal.innerText += `Error: ${result.error}\n`;
                showAlert("Merge Failed", result.error);
            }
        } catch (err) {
            terminal.innerText += `Error: ${err.message}\n`;
        }
    });
}

function showPrompt(title, message, onConfirm) {
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-message').innerHTML = `
        <div style="margin-bottom: 16px;">${message}</div>
        <input type="text" id="alert-input" style="width: 100%; background: var(--bg-body); border: 1px solid var(--border); color: var(--text-main); border-radius: 6px; padding: 10px; margin-top: 8px;" placeholder="Branch name...">
    `;
    document.getElementById('alert-confirm-btn').onclick = () => {
        const val = document.getElementById('alert-input').value.trim();
        if (val) {
            closeAlertModal();
            onConfirm(val);
        }
    };
    document.getElementById('alert-cancel-btn').style.display = 'inline-block';
    document.getElementById('alert-modal-overlay').style.display = 'flex';
    setTimeout(() => document.getElementById('alert-input').focus(), 100);
}

function showConfirm(title, message, onConfirm) {
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-message').innerText = message;
    document.getElementById('alert-confirm-btn').onclick = () => {
        closeAlertModal();
        onConfirm();
    };
    document.getElementById('alert-cancel-btn').style.display = 'inline-block';
    document.getElementById('alert-modal-overlay').style.display = 'flex';
}

function showAlert(title, message) {
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-message').innerText = message;
    document.getElementById('alert-confirm-btn').onclick = closeAlertModal;
    document.getElementById('alert-cancel-btn').style.display = 'none';
    document.getElementById('alert-modal-overlay').style.display = 'flex';
}

function closeAlertModal() {
    document.getElementById('alert-modal-overlay').style.display = 'none';
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    // Re-apply colors for the new theme
    applyThemeSettings(settings);
}

function switchConfigTheme(theme) {
    // Save current UI state to state object before switching
    saveUIColorsToState();

    configTheme = theme;
    document.getElementById('config-dark-btn').classList.toggle('active', theme === 'dark');
    document.getElementById('config-light-btn').classList.toggle('active', theme === 'light');
    document.getElementById('copy-theme-btn').innerText = theme === 'dark' ? '📋 Copy from Light' : '📋 Copy from Dark';

    // Load state to UI
    loadStateToUI(theme);
}

function saveUIColorsToState() {
    colorState[configTheme] = {
        accent: document.getElementById('set-accent').value,
        text: document.getElementById('set-text-color').value,
        dim: document.getElementById('set-text-dim').value,
        terminal: document.getElementById('set-terminal-color').value
    };
}

// Fixed loadSettings to loadSettingsGlobal to avoid conflict or reuse
function loadStateToUI(theme) {
    const colors = colorState[theme];
    document.getElementById('set-accent').value = colors.accent;
    document.getElementById('accent-hex').innerText = colors.accent.toUpperCase();
    document.getElementById('set-text-color').value = colors.text;
    document.getElementById('text-hex').innerText = colors.text.toUpperCase();
    document.getElementById('set-text-dim').value = colors.dim;
    document.getElementById('text-dim-hex').innerText = colors.dim.toUpperCase();
    document.getElementById('set-terminal-color').value = colors.terminal;
    document.getElementById('terminal-hex').innerText = colors.terminal.toUpperCase();
}

function copyOtherThemeColors() {
    const other = configTheme === 'dark' ? 'light' : 'dark';
    colorState[configTheme] = JSON.parse(JSON.stringify(colorState[other]));
    loadStateToUI(configTheme);
}

function updateColorHex(type) {
    const inputMap = {
        'accent': 'accent-hex',
        'text': 'text-hex',
        'dim': 'text-dim-hex',
        'terminal': 'terminal-hex'
    };
    const idMap = {
        'accent': 'set-accent',
        'text': 'set-text-color',
        'dim': 'set-text-dim',
        'terminal': 'set-terminal-color'
    };
    const val = document.getElementById(idMap[type]).value;
    document.getElementById(inputMap[type]).innerText = val.toUpperCase();

    // Preview immediately if this matches current site theme
    const isSiteLight = document.body.classList.contains('light-theme');
    if ((isSiteLight && configTheme === 'light') || (!isSiteLight && configTheme === 'dark')) {
        saveUIColorsToState();
        applyThemeSettings({
            dark_theme: {
                accent: colorState.dark.accent,
                text_main: colorState.dark.text,
                text_dim: colorState.dark.dim,
                terminal_text: colorState.dark.terminal
            },
            light_theme: {
                accent: colorState.light.accent,
                text_main: colorState.light.text,
                text_dim: colorState.light.dim,
                terminal_text: colorState.light.terminal
            }
        });
    }
}

function resetColorsToDefault() {
    const isLight = configTheme === 'light';
    const defaults = isLight ? {
        accent: '#d73a49',
        text: '#24292e',
        dim: '#6a737d',
        terminal: '#22863a'
    } : {
        accent: '#f85149',
        text: '#e6edf3',
        dim: '#7d8590',
        terminal: '#3fb950'
    };

    colorState[configTheme] = {
        accent: defaults.accent,
        text: defaults.text,
        dim: defaults.dim,
        terminal: defaults.terminal
    };
    loadStateToUI(configTheme);
    updateColorHex('accent'); updateColorHex('text'); updateColorHex('dim'); updateColorHex('terminal');
}

async function loadSettings() {
    const res = await fetch('/api/settings');
    settings = await res.json();
    document.getElementById('info-ws').innerText = settings.workspace_url || '(not set)';
    document.getElementById('info-user').innerText = settings.user_name || '(not set)';

    document.getElementById('set-ws').value = settings.workspace_url || '';
    document.getElementById('set-git').value = settings.git_bash_path || '';
    document.getElementById('set-name').value = settings.user_name || '';
    document.getElementById('set-pre').value = settings.pre_deploy_cmd || '';

    // Map settings to state
    colorState.dark = {
        accent: settings.dark_theme.accent,
        text: settings.dark_theme.text_main,
        dim: settings.dark_theme.text_dim,
        terminal: settings.dark_theme.terminal_text
    };
    colorState.light = {
        accent: settings.light_theme.accent,
        text: settings.light_theme.text_main,
        dim: settings.light_theme.text_dim,
        terminal: settings.light_theme.terminal_text
    };

    // Set UI to match current editing theme (default to dark in modal)
    loadStateToUI(configTheme);
    applyThemeSettings(settings);
}

function applyThemeSettings(s) {
    const isLight = document.body.classList.contains('light-theme');
    const themeData = isLight ? s.light_theme : s.dark_theme;
    const target = document.body;

    if (themeData.accent) {
        target.style.setProperty('--accent', themeData.accent);
        const r = parseInt(themeData.accent.slice(1, 3), 16);
        const g = parseInt(themeData.accent.slice(3, 5), 16);
        const b = parseInt(themeData.accent.slice(5, 7), 16);
        target.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.3)`);
    }
    if (themeData.text_main) target.style.setProperty('--text-main', themeData.text_main);
    if (themeData.text_dim) target.style.setProperty('--text-dim', themeData.text_dim);
    if (themeData.terminal_text) target.style.setProperty('--terminal-text', themeData.terminal_text);
}

async function refreshServices() {
    const list = document.getElementById('service-list');
    if (list.innerHTML === '') {
        list.innerHTML = '<div class="service-item shimmer" style="height: 60px"></div>'.repeat(3);
    }
    const res = await fetch('/api/services');
    const newServices = await res.json();
    services = newServices;
    const currentSelectedName = selectedService ? selectedService.name : null;
    list.innerHTML = '';
    services.forEach(svc => {
        const item = document.createElement('div');
        item.className = 'service-item';
        if (currentSelectedName === svc.name) {
            item.classList.add('active');
            selectedService = svc;
        }
        item.onclick = () => selectSvc(svc, item);
        const stashTag = svc.has_stash ? '<span style="color: #f1c40f; margin-left: 8px;" title="Has Git Stash">📥</span>' : '';

        let healthHtml = '';
        if (svc.metrics) {
            const dUp = svc.metrics.Development && svc.metrics.Development.status === 'RUNNING';
            const sUp = svc.metrics.Staging && svc.metrics.Staging.status === 'RUNNING';
            healthHtml = `
                <div style="display: flex; gap: 4px; margin-top: 4px;">
                    <div style="width: 6px; height: 6px; border-radius: 50%; background: ${dUp ? '#2ecc71' : '#e74c3c'}" title="Dev: ${dUp ? 'UP' : 'DOWN'}"></div>
                    <div style="width: 6px; height: 6px; border-radius: 50%; background: ${sUp ? '#2ecc71' : '#e74c3c'}" title="Stg: ${sUp ? 'UP' : 'DOWN'}"></div>
                </div>
            `;
        }

        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div class="service-name">📦 ${svc.name} ${stashTag}</div>
                ${healthHtml}
            </div>
            <div class="service-meta">
                <div class="branch-tag">👀 Branch: ${svc.branch}</div>
                <div class="commit-msg">💬 Last commit: ${svc.last_commit}</div>
            </div>
        `;
        list.appendChild(item);
    });
    if (services.length > 0 && !selectedService) selectSvc(services[0], list.firstChild);

    // Apply search filter again after refresh to prevent results from clearing
    filterServices();
}

async function selectSvc(svc, element, skipTerminalReset = false) {
    selectedService = svc;
    document.querySelectorAll('.service-item').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');
    try {
        const res = await fetch(`/api/services/${svc.name}`);
        if (res.ok) {
            const latestSvc = await res.json();
            const idx = services.findIndex(s => s.name === svc.name);
            if (idx !== -1) services[idx] = latestSvc;
            selectedService = latestSvc;
            svc = latestSvc;
            if (element) {
                const stashTag = svc.has_stash ? '<span style="color: #f1c40f; margin-left: 8px;" title="Has Git Stash">📥</span>' : '';

                let healthHtml = '';
                if (svc.metrics) {
                    const dUp = svc.metrics.Development && svc.metrics.Development.status === 'RUNNING';
                    const sUp = svc.metrics.Staging && svc.metrics.Staging.status === 'RUNNING';
                    healthHtml = `
                        <div style="display: flex; gap: 4px; margin-top: 4px;">
                            <div style="width: 6px; height: 6px; border-radius: 50%; background: ${dUp ? '#2ecc71' : '#e74c3c'}" title="Dev: ${dUp ? 'UP' : 'DOWN'}"></div>
                            <div style="width: 6px; height: 6px; border-radius: 50%; background: ${sUp ? '#2ecc71' : '#e74c3c'}" title="Stg: ${sUp ? 'UP' : 'DOWN'}"></div>
                        </div>
                    `;
                }

                element.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div class="service-name">📦 ${svc.name} ${stashTag}</div>
                        ${healthHtml}
                    </div>
                    <div class="service-meta">
                        <div class="branch-tag">👀 Branch: ${svc.branch}</div>
                        <div class="commit-msg">💬 Last commit: ${svc.last_commit}</div>
                    </div>
                `;
            }
        }
    } catch (err) { }
    document.getElementById('deploy-msg').value = svc.last_commit;
    if (!skipTerminalReset) document.getElementById('terminal').innerText = `Ready to deploy ${svc.name}...`;
    if (!gitHiddenManually) {
        document.getElementById('git-card').style.display = 'block';
        document.getElementById('resizer').style.display = 'block';
        document.getElementById('git-toggle').classList.add('active');
    }

    // Render header actions
    const headerActions = document.getElementById('git-actions-header');
    headerActions.innerHTML = '';

    const isDetached = svc.branch.includes('detached') || /^[0-9a-f]{7,40}$/i.test(svc.branch);
    if (isDetached) {
        const jumpBtn = document.createElement('button');
        jumpBtn.className = 'primary';
        jumpBtn.style.cssText = 'font-size: 11px; padding: 4px 12px; height: 28px;';
        jumpBtn.innerText = '↺ Jump to Main';
        jumpBtn.onclick = () => checkoutBranch('main');
        headerActions.appendChild(jumpBtn);
    }

    loadGitTabContent(currentGitTab);
    updateGitStatusBadge(svc);
    updateHealthWidget();
    validateForm();
    refreshHistoryBar();
    currentCommitMsgIndex = -1; // Reset message navigation
}

let gitHiddenManually = false;
function toggleGitManagement() {
    const card = document.getElementById('git-card');
    const resizer = document.getElementById('resizer');
    const btn = document.getElementById('git-toggle');
    const terminalContainer = document.querySelector('.terminal-container');
    
    if (card.style.display === 'none') {
        card.style.display = 'block';
        resizer.style.display = 'block';
        btn.classList.add('active');
        gitHiddenManually = false;
        terminalContainer.style.flex = '0 0 300px'; // Initial height when Git is shown
    } else {
        card.style.display = 'none';
        resizer.style.display = 'none';
        btn.classList.remove('active');
        gitHiddenManually = true;
        terminalContainer.style.flex = '1 1 100%'; // Full height when Git is hidden
    }
}

function updateGitStatusBadge(svc) {
    const badge = document.getElementById('git-status-badge');
    if (svc.ahead > 0 || svc.behind > 0) {
        badge.innerHTML = `
            <span style="color: var(--success); margin-right: 4px;">↑${svc.ahead}</span>
            <span style="color: var(--error);">↓${svc.behind}</span>
        `;
    } else {
        badge.innerText = '(Up to date)';
    }

    // Hide push button if branch is main or master
    const pushBtn = document.getElementById('btn-git-push');
    if (svc.branch === 'main' || svc.branch === 'master') {
        pushBtn.style.display = 'none';
    } else {
        pushBtn.style.display = 'inline-block';
    }
}

async function gitFetch() {
    if (!selectedService) return;
    const terminal = document.getElementById('terminal');
    const btn = document.getElementById('btn-git-fetch');
    btn.disabled = true; btn.innerText = '...';
    terminal.innerText = `Fetching all remotes for ${selectedService.name}...\n`;
    try {
        const res = await fetch(`/api/git/fetch/${selectedService.name}`, { method: 'POST' });
        const result = await res.json();
        if (res.ok) {
            terminal.innerText += result.message + '\nSuccess!\n';
            await refreshSelectedService();
        } else {
            terminal.innerText += `Error: ${result.error}\n`;
            showAlert("Fetch Failed", result.error);
        }
    } catch (err) {
        terminal.innerText += `Error: ${err.message}\n`;
    }
    btn.disabled = false; btn.innerText = '↻ Fetch';
}

async function gitPull() {
    if (!selectedService) return;
    const terminal = document.getElementById('terminal');
    const btn = document.getElementById('btn-git-pull');
    btn.disabled = true; btn.innerText = '...';
    terminal.innerText = `Pulling for ${selectedService.name}...\n`;
    try {
        const res = await fetch(`/api/git/pull/${selectedService.name}`, { method: 'POST' });
        const result = await res.json();
        if (res.ok) {
            terminal.innerText += result.message + '\nSuccess!\n';
            await refreshSelectedService();
        } else {
            terminal.innerText += `Error: ${result.error}\n`;
            showAlert("Pull Failed", result.error);
        }
    } catch (err) {
        terminal.innerText += `Error: ${err.message}\n`;
    }
    btn.disabled = false; btn.innerText = '↓ Pull';
}

async function gitPush() {
    if (!selectedService) return;
    const terminal = document.getElementById('terminal');
    const btn = document.getElementById('btn-git-push');
    btn.disabled = true; btn.innerText = '...';
    terminal.innerText = `Pushing for ${selectedService.name}...\n`;
    try {
        const res = await fetch(`/api/git/push/${selectedService.name}`, { method: 'POST' });
        const result = await res.json();
        if (res.ok) {
            terminal.innerText += result.message + '\nSuccess!\n';
            await refreshSelectedService();
        } else {
            terminal.innerText += `Error: ${result.error}\n`;
            showAlert("Push Failed", result.error);
        }
    } catch (err) {
        terminal.innerText += `Error: ${err.message}\n`;
    }
    btn.disabled = false; btn.innerText = '↑ Push';
}

function prevCommitMsg() {
    if (commitMessages.length === 0) {
        if (currentGitTab !== 'commits') {
            loadGitTabContent('commits').then(() => {
                if (commitMessages.length > 0) prevCommitMsg();
            });
            return;
        }
    }
    if (currentCommitMsgIndex < commitMessages.length - 1) {
        currentCommitMsgIndex++;
        document.getElementById('deploy-msg').value = commitMessages[currentCommitMsgIndex];
        validateForm();
    }
}

function nextCommitMsg() {
    if (commitMessages.length === 0) {
        if (currentGitTab !== 'commits') {
            loadGitTabContent('commits').then(() => {
                if (commitMessages.length > 0) nextCommitMsg();
            });
            return;
        }
    }
    if (currentCommitMsgIndex > 0) {
        currentCommitMsgIndex--;
        document.getElementById('deploy-msg').value = commitMessages[currentCommitMsgIndex];
        validateForm();
    }
}


function updateHealthWidget() {
    const widget = document.getElementById('health-widget');
    const badges = document.getElementById('health-badges');
    badges.innerHTML = '';

    if (!selectedService || !selectedService.metrics) {
        widget.style.display = 'none';
        return;
    }

    const m = selectedService.metrics[currentEnv];
    if (m && m.status === 'RUNNING') {
        widget.style.display = 'grid';
        document.getElementById('metric-cpu').innerText = m.cpu + '%';
        document.getElementById('metric-mem').innerText = m.memory;
        document.getElementById('metric-uptime').innerText = m.uptime;
        document.getElementById('metric-ports').innerText = m.ports ? m.ports.join(', ') : 'N/A';
    } else {
        widget.style.display = 'none';
    }

    // Render badges in header area
    ['Development', 'Staging'].forEach(env => {
        const met = selectedService.metrics[env];
        const up = met && met.status === 'RUNNING';
        const badge = document.createElement('div');
        badge.style.cssText = `font-size: 10px; padding: 2px 6px; border-radius: 4px; background: ${up ? '#2ecc7122' : '#e74c3c22'}; color: ${up ? '#2ecc71' : '#e74c3c'}; border: 1px solid ${up ? '#2ecc7144' : '#e74c3c44'}; font-weight: bold;`;
        badge.innerText = `${env === 'Development' ? 'DEV' : 'STG'}: ${up ? 'UP' : 'DOWN'}`;
        badges.appendChild(badge);
    });
}

async function refreshSelectedService() {
    if (!selectedService) return;
    const btn = document.getElementById('btn-refresh-svc');
    btn.innerHTML = '...'; btn.disabled = true;
    await selectSvc(selectedService, document.querySelector('.service-item.active'), true);
    btn.innerHTML = '↻'; btn.disabled = false;
}

async function refreshHistoryBar() {
    if (!selectedService) return;
    const res = await fetch(`/api/history/${selectedService.name}`);
    const lastDeployText = document.getElementById('last-deploy-text');
    const btnMore = document.getElementById('btn-history-more');
    if (!res.ok) {
        lastDeployText.innerHTML = `<span style="color: var(--error)">Error loading history</span>`;
        btnMore.disabled = true;
        return;
    }
    const logs = await res.json();
    if (logs && logs.length > 0) {
        const latest = logs[0];
        const time = latest.created_at.substring(11, 16) + ' ' + latest.created_at.substring(8, 10) + '/' + latest.created_at.substring(5, 7);
        let msg = latest.message;
        if (msg.length > 40) msg = msg.substring(0, 37) + '...';
        const statusIcon = latest.status === 'Failed' ? '❌' : '✅';
        lastDeployText.innerHTML = `Last: ${time} by ${latest.user_name} | ${latest.environment} | ${latest.branch} | ${statusIcon} ${msg}`;
        btnMore.disabled = false;
    } else {
        lastDeployText.innerText = `Last deploy: Never`;
        btnMore.disabled = true;
    }
}

async function openHistoryModal() {
    if (!selectedService) return;
    document.getElementById('history-svc-name').innerText = selectedService.name;
    document.getElementById('history-modal-overlay').style.display = 'flex';
    
    const listDev = document.getElementById('history-list-dev');
    const listStg = document.getElementById('history-list-stg');
    const countDev = document.getElementById('count-dev');
    const countStg = document.getElementById('count-stg');
    
    listDev.innerHTML = listStg.innerHTML = '<div class="shimmer" style="height: 50px"></div>'.repeat(2);
    countDev.innerText = countStg.innerText = '0';

    try {
        const res = await fetch(`/api/history/${selectedService.name}`);
        const logs = await res.json();
        listDev.innerHTML = listStg.innerHTML = '';
        
        let devCount = 0, stgCount = 0;

        logs.forEach(log => {
            const row = document.createElement('div');
            const isFailed = log.status === 'Failed';
            const color = isFailed ? 'var(--error)' : 'var(--success)';

            row.style.cssText = `background: var(--bg-hover); padding: 12px; border-radius: 8px; border-left: 4px solid ${color}; transition: transform 0.2s; cursor: default;`;
            row.onmouseenter = () => row.style.transform = 'translateX(4px)';
            row.onmouseleave = () => row.style.transform = 'translateX(0)';

            const time = log.created_at.substring(11, 16) + ' ' + log.created_at.substring(8, 10) + '/' + log.created_at.substring(5, 7) + '/' + log.created_at.substring(0, 4);
            row.innerHTML = `
                <div style="font-size: 12px; font-weight: 600; display: flex; justify-content: space-between; color: ${color}; margin-bottom: 4px;">
                    <span>${time} • ${log.user_name}</span>
                    <span style="font-family: var(--font-mono); opacity: 0.8;">#${log.branch}</span>
                </div>
                <div style="font-size: 13px; color: var(--text-main); line-height: 1.4; word-break: break-word;">${log.message}</div>
            `;

            if (log.environment === 'Development') {
                listDev.appendChild(row);
                devCount++;
            } else {
                listStg.appendChild(row);
                stgCount++;
            }
        });

        countDev.innerText = devCount;
        countStg.innerText = stgCount;

        if (devCount === 0) listDev.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-dim); font-size: 12px;">No development history.</div>';
        if (stgCount === 0) listStg.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-dim); font-size: 12px;">No staging history.</div>';
    } catch (err) {
        listDev.innerHTML = listStg.innerHTML = `<div style="color: var(--error); padding: 20px;">Error loading history</div>`;
    }
}

function closeHistoryModal() { document.getElementById('history-modal-overlay').style.display = 'none'; }
function openShortcutsModal() { document.getElementById('shortcuts-modal-overlay').style.display = 'flex'; }
function closeShortcutsModal() { document.getElementById('shortcuts-modal-overlay').style.display = 'none'; }

function setEnv(env) {
    currentEnv = env;
    document.querySelectorAll('.env-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === env);
    });
    updateHealthWidget();
    validateForm();
}
function validateForm() {
    const btn = document.getElementById('btn-run');
    if (!selectedService) { btn.disabled = true; btn.innerText = 'Select a service'; return; }
    const hasScript = currentEnv === 'Development' ? selectedService.has_dev : selectedService.has_stg;
    btn.disabled = !hasScript; btn.innerText = hasScript ? '🚀 Run Deploy' : `No ${currentEnv} script`;
}

function runDeploy() {
    if (!selectedService) return;

    if (currentEnv === 'Staging' && selectedService.branch !== 'staging') {
        showConfirm("Staging Deployment Warning",
            `You are attempting to deploy branch "${selectedService.branch}" to STAGING. Usually, only the "staging" branch is allowed. Proceed anyway?`,
            () => { executeDeploy(); });
        return;
    }
    executeDeploy();
}

function executeDeploy() {
    const terminal = document.getElementById('terminal');
    const btn = document.getElementById('btn-run');
    terminal.innerText = ''; btn.disabled = true; btn.innerText = 'Deploying...';
    fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: selectedService.name, env: currentEnv, message: document.getElementById('deploy-msg').value })
    }).then(response => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        function read() {
            reader.read().then(({ done, value }) => {
                if (done) { btn.disabled = false; btn.innerText = '🚀 Run Deploy'; return; }
                const chunk = decoder.decode(value, { stream: true });
                chunk.split('\n\n').forEach(event => {
                    const trimmed = event.trimStart();
                    if (trimmed.startsWith('data: ')) {
                        const content = trimmed.slice(6);
                        if (content.trim() === '[EOF]') {
                            btn.disabled = false;
                            btn.innerText = '🚀 Run Deploy';
                            refreshHistoryBar();
                            refreshSelectedService();
                        } else if (content.startsWith('[STATUS] ')) {
                            const status = content.slice(9).trim();
                            if (status === 'Failed') {
                                showAlert("Deployment Error", "Verification failed. The service might not be running correctly or binary wasn't updated.");
                            }
                        } else {
                            terminal.innerText += content.endsWith('\n') ? content : content + '\n';
                            terminal.scrollTop = terminal.scrollHeight;
                        }
                    }
                });
                read();
            });
        }
        read();
    });
}

function switchSettingsTab(tabId) {
    document.querySelectorAll('.settings-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.settings-tab-content').forEach(content => content.classList.remove('active'));
    
    document.getElementById(`tab-btn-${tabId}`).classList.add('active');
    document.getElementById(`settings-tab-${tabId}`).classList.add('active');

    if (tabId === 'deployment') {
        loadDeploymentTab();
    }
}

async function loadDeploymentTab() {
    const tbody = document.getElementById('deployment-config-tbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-dim);">Loading folders...</td></tr>';
    
    try {
        const foldersRes = await fetch('/api/workspace-folders');
        const workspaceFolders = foldersRes.ok ? await foldersRes.json() : [];
        
        tbody.innerHTML = '';
        
        const renderedIndices = new Set();
        
        // 1. Group/render configs that match workspace folders
        workspaceFolders.forEach(folder => {
            const matchedConfigs = (settings.services || []).filter((cfg, idx) => {
                if (cfg.folder === folder) {
                    renderedIndices.add(idx);
                    return true;
                }
                return false;
            });
            
            if (matchedConfigs.length > 0) {
                matchedConfigs.forEach(cfg => {
                    createDeploymentRow(tbody, folder, cfg.name, cfg.dev_cmd, cfg.stg_cmd, cfg.pre_deploy_cmd);
                });
            } else {
                let suggestedName = folder;
                if (settings.folder_aliases && settings.folder_aliases[folder]) {
                    suggestedName = settings.folder_aliases[folder];
                }
                createDeploymentRow(tbody, folder, suggestedName, '', '', '');
            }
        });
        
        // 2. Render any remaining custom service configs that did not match a folder
        (settings.services || []).forEach((cfg, idx) => {
            if (!renderedIndices.has(idx)) {
                createDeploymentRow(tbody, cfg.folder, cfg.name, cfg.dev_cmd, cfg.stg_cmd, cfg.pre_deploy_cmd);
            }
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--error);">Error loading workspace folders.</td></tr>';
    }
}

function createDeploymentRow(tbody, folder, name, devCmd, stgCmd, preDeployCmd) {
    const tr = document.createElement('tr');
    tr.className = 'deployment-config-row';
    tr.style.borderBottom = '1px solid var(--border)';
    
    tr.innerHTML = `
        <td style="padding: 6px 10px;">
            <input type="text" class="row-folder" value="${folder}" placeholder="Folder Name" style="width: 100%; font-size: 11px; padding: 6px 8px; font-family: var(--font-mono); background: var(--bg-body); border: 1px solid var(--border); border-radius: 4px; color: var(--text-main);">
        </td>
        <td style="padding: 6px 10px;">
            <input type="text" class="row-name" value="${name}" placeholder="Service Name" style="width: 100%; font-size: 11px; padding: 6px 8px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 4px; color: var(--text-main);">
        </td>
        <td style="padding: 6px 10px;">
            <input type="text" class="row-dev-cmd" value="${devCmd}" placeholder="e.g. ./deploy-dev.sh" style="width: 100%; font-size: 11px; padding: 6px 8px; font-family: var(--font-mono); background: var(--bg-body); border: 1px solid var(--border); border-radius: 4px; color: var(--text-main);">
        </td>
        <td style="padding: 6px 10px;">
            <input type="text" class="row-stg-cmd" value="${stgCmd}" placeholder="e.g. ./deploy-stg.sh" style="width: 100%; font-size: 11px; padding: 6px 8px; font-family: var(--font-mono); background: var(--bg-body); border: 1px solid var(--border); border-radius: 4px; color: var(--text-main);">
        </td>
        <td style="padding: 6px 10px;">
            <input type="text" class="row-pre-deploy-cmd" value="${preDeployCmd || ''}" placeholder="e.g. go mod tidy" style="width: 100%; font-size: 11px; padding: 6px 8px; font-family: var(--font-mono); background: var(--bg-body); border: 1px solid var(--border); border-radius: 4px; color: var(--text-main);">
        </td>
        <td style="padding: 6px 10px; text-align: center;">
            <button type="button" onclick="this.closest('tr').remove()" style="color: var(--error); border: none; background: transparent; padding: 2px 6px; font-size: 14px; cursor: pointer;" title="Remove row">🗑️</button>
        </td>
    `;
    tbody.appendChild(tr);
}

function addCustomServiceRow() {
    const tbody = document.getElementById('deployment-config-tbody');
    createDeploymentRow(tbody, '', '', '', '', '');
}

async function openSettings() {
    const res = await fetch('/api/settings');
    settings = await res.json();
    document.getElementById('set-ws').value = settings.workspace_url;
    document.getElementById('set-git').value = settings.git_bash_path;
    document.getElementById('set-name').value = settings.user_name;
    document.getElementById('set-pre').value = settings.pre_deploy_cmd;
    document.getElementById('set-dev-url').value = settings.dev_agent_url || '';
    document.getElementById('set-stg-url').value = settings.stg_agent_url || '';

    // Format aliases map to textarea
    let aliasText = "";
    if (settings.folder_aliases) {
        for (const [folder, alias] of Object.entries(settings.folder_aliases)) {
            aliasText += `${folder}:${alias}\n`;
        }
    }
    document.getElementById('set-aliases').value = aliasText.trim();

    switchConfigTheme(document.body.classList.contains('light-theme') ? 'light' : 'dark');
    switchSettingsTab('core');
    document.getElementById('modal-overlay').style.display = 'flex';
}

function closeSettings() { document.getElementById('modal-overlay').style.display = 'none'; }

async function saveSettings() {
    const aliasLines = document.getElementById('set-aliases').value.trim().split('\n');
    const aliases = {};
    aliasLines.forEach(line => {
        const parts = line.split(':');
        if (parts.length === 2) {
            aliases[parts[0].trim()] = parts[1].trim();
        }
    });

    let services = settings.services || [];
    const tbody = document.getElementById('deployment-config-tbody');
    if (tbody && tbody.children.length > 0 && tbody.querySelector('.row-folder')) {
        services = [];
        document.querySelectorAll('.deployment-config-row').forEach(row => {
            const folder = row.querySelector('.row-folder').value.trim();
            const name = row.querySelector('.row-name').value.trim();
            const dev_cmd = row.querySelector('.row-dev-cmd').value.trim();
            const stg_cmd = row.querySelector('.row-stg-cmd').value.trim();
            const pre_deploy_cmd = row.querySelector('.row-pre-deploy-cmd').value.trim();
            
            if (folder && name) {
                services.push({
                    folder: folder,
                    name: name,
                    dev_cmd: dev_cmd,
                    stg_cmd: stg_cmd,
                    pre_deploy_cmd: pre_deploy_cmd
                });
            }
        });
    }

    const updated = {
        workspace_url: document.getElementById('set-ws').value,
        git_bash_path: document.getElementById('set-git').value,
        user_name: document.getElementById('set-name').value,
        pre_deploy_cmd: document.getElementById('set-pre').value,
        dev_agent_url: document.getElementById('set-dev-url').value,
        stg_agent_url: document.getElementById('set-stg-url').value,
        folder_aliases: aliases,
        services: services,
        custom_cmds: {},
        dark_theme: {
            accent: colorState.dark.accent,
            text_main: colorState.dark.text,
            text_dim: colorState.dark.dim,
            terminal_text: colorState.dark.terminal
        },
        light_theme: {
            accent: colorState.light.accent,
            text_main: colorState.light.text,
            text_dim: colorState.light.dim,
            terminal_text: colorState.light.terminal
        }
    };

    await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
    });
    closeSettings();
    location.reload();
}

let charts = {};
async function openStatsModal() {
    document.getElementById('stats-modal-overlay').style.display = 'flex';
    const res = await fetch('/api/stats');
    const data = await res.json();
    renderCharts(data);
}
function closeStatsModal() { document.getElementById('stats-modal-overlay').style.display = 'none'; }

function renderCharts(data) {
    const style = getComputedStyle(document.body);
    const textColor = style.getPropertyValue('--text-main').trim();
    const gridColor = style.getPropertyValue('--border').trim();
    const accentColor = style.getPropertyValue('--accent').trim();
    const palette = [accentColor, '#3fb950', '#2f81f7', '#a371f7', '#ff7b72', '#d29922', '#79c0ff'];
    Object.values(charts).forEach(c => c.destroy());
    const dates = []; const rawDates = []; const now = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(now.getDate() - i);
        const ds = d.toISOString().split('T')[0]; rawDates.push(ds); dates.push(ds.substring(5));
    }
    charts.trends = new Chart(document.getElementById('chart-trends'), {
        type: 'line',
        data: { labels: dates, datasets: [{ label: 'Deployments', data: rawDates.map(d => data.by_day[d] || 0), borderColor: accentColor, backgroundColor: accentColor + '22', fill: true, tension: 0.4, borderWidth: 3, pointRadius: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } }, y: { grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 }, beginAtZero: true } } }
    });
    charts.user = new Chart(document.getElementById('chart-user'), {
        type: 'pie',
        data: { labels: Object.keys(data.by_user), datasets: [{ data: Object.values(data.by_user), backgroundColor: palette, borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: textColor, boxWidth: 10, font: { size: 10 } } } } }
    });
    const servicesFound = [...new Set(data.by_service_day.map(item => item.service))];
    charts.serviceStacked = new Chart(document.getElementById('chart-service-stacked'), {
        type: 'line',
        data: { labels: dates, datasets: servicesFound.map((svc, idx) => ({ label: svc, data: rawDates.map(d => (data.by_service_day.find(item => item.service === svc && item.day === d) || { count: 0 }).count), borderColor: palette[idx % palette.length], fill: false, tension: 0.4, pointRadius: 3, borderWidth: 2 })) },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: textColor, boxWidth: 10, font: { size: 10 } } } }, scales: { x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } }, y: { grid: { color: gridColor }, ticks: { color: textColor }, beginAtZero: true } } }
    });
    charts.env = new Chart(document.getElementById('chart-env'), {
        type: 'doughnut',
        data: { labels: Object.keys(data.by_environment), datasets: [{ data: Object.values(data.by_environment), backgroundColor: palette, borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: textColor, boxWidth: 12, font: { size: 11 } } } }, cutout: '70%' }
    });
    charts.service = new Chart(document.getElementById('chart-service'), {
        type: 'bar',
        data: { labels: Object.keys(data.by_service), datasets: [{ data: Object.values(data.by_service), backgroundColor: accentColor, borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } }, y: { grid: { color: gridColor }, ticks: { color: textColor }, beginAtZero: true } } }
    });
}

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    // Global Esc to close any modal
    if (e.key === 'Escape') {
        closeAlertModal();
        closeHistoryModal();
        closeStatsModal();
        closeSettings();
        closeShortcutsModal();
        closeVPNModal();
        return;
    }

    // Shortcuts with Alt + Shift (to avoid browser conflicts)
    if (e.altKey && e.shiftKey) {
        switch (e.code) {
            case 'KeyR': refreshServices(); break;
            case 'KeyS': openStatsModal(); break;
            case 'KeyI': openSettings(); break;
            case 'KeyT': toggleTheme(); break;
            case 'KeyH': openShortcutsModal(); break;
            case 'KeyL':
                e.preventDefault();
                e.stopPropagation();
                viewSelectedSvcLogs();
                break;
            case 'KeyM': location.href = '/health-monitor'; break;
            case 'KeyQ': switchGitTab('branches'); break;
            case 'KeyW': switchGitTab('commits'); break;
            case 'KeyE': switchGitTab('stash'); break;
            case 'KeyU': toggleVPNManagement(); break;
            case 'Digit1': setEnv('Development'); break;
            case 'Digit2': setEnv('Staging'); break;
        }
    }

    // Alt + Arrows (usually safe)
    if (e.altKey && !e.shiftKey) {
        if (e.key === 'ArrowUp') { navigateService(-1); e.preventDefault(); }
        if (e.key === 'ArrowDown') { navigateService(1); e.preventDefault(); }
    }

    // Ctrl + Enter to Deploy
    if (e.ctrlKey && e.key === 'Enter') {
        const btn = document.getElementById('btn-run');
        if (btn && !btn.disabled) runDeploy();
    }

    // Slash / to focus search (if not in input)
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('svc-search').focus();
    }
});

function navigateService(dir) {
    const items = Array.from(document.querySelectorAll('.service-item')).filter(i => i.style.display !== 'none');
    if (items.length === 0) return;
    const active = document.querySelector('.service-item.active');
    let idx = items.indexOf(active);
    idx += dir;
    if (idx < 0) idx = items.length - 1;
    if (idx >= items.length) idx = 0;
    items[idx].click();
    items[idx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function viewSelectedSvcLogs() {
    if (!selectedService || !selectedService.metrics) return;
    const m = selectedService.metrics[currentEnv];
    if (!m || !m.stats_port || m.stats_port === 'N/A') {
        showAlert("Log Viewer", "Stats port not found for this service. Ensure stats.pid is present.");
        return;
    }

    const envUrls = { 
        'Development': settings.dev_agent_url, 
        'Staging': settings.stg_agent_url 
    };
    const baseUrl = envUrls[currentEnv];
    if (!baseUrl) return;

    try {
        const urlObj = new URL(baseUrl);
        window.open(`http://${urlObj.hostname}:${m.stats_port}`, '_blank');
    } catch (e) {
        console.error("Invalid URL", e);
    }
}

function initResizer() {
    const resizer = document.getElementById('resizer');
    const container = document.querySelector('.terminal-container');
    let startY, startBasis;

    resizer.addEventListener('mousedown', (e) => {
        startY = e.clientY;
        startBasis = container.offsetHeight;
        document.body.classList.add('resizing');
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    });

    function doDrag(e) {
        const newHeight = startBasis + e.clientY - startY;
        if (newHeight > 100 && newHeight < 600) {
            container.style.flexBasis = newHeight + 'px';
        }
    }

    function stopDrag() {
        document.body.classList.remove('resizing');
        document.removeEventListener('mousemove', doDrag);
        document.removeEventListener('mouseup', stopDrag);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Clipboard copy successful
    });
}

// ─────────────────────────────────────────────
// VPN UI & State Management
// ─────────────────────────────────────────────

let vpnStatus = 'disconnected';
let vpnUptimeInterval = null;
let vpnUptimeSeconds = 0;
let vpnEventSource = null;
let vpnSavedConfigs = [];
let vpnSavedAccounts = [];

async function initVPN() {
    const configDirInput = document.getElementById('vpn-config-dir');
    const configSelect = document.getElementById('vpn-config-select');
    const refreshConfigsBtn = document.getElementById('vpn-refresh-configs');
    const accountSelect = document.getElementById('vpn-account-select');
    const saveAccountBtn = document.getElementById('vpn-save-account');
    const deleteAccountBtn = document.getElementById('vpn-delete-account');
    const usernameInput = document.getElementById('vpn-username');
    const passwordInput = document.getElementById('vpn-password');
    const saveCredsCheckbox = document.getElementById('vpn-save-credentials');
    const togglePasswordBtn = document.getElementById('vpn-toggle-password');
    const btnConnect = document.getElementById('vpn-btn-connect');
    const btnDisconnect = document.getElementById('vpn-btn-disconnect');
    const clearLogsBtn = document.getElementById('vpn-btn-clear-logs');
    const statIp = document.getElementById('vpn-stat-ip');

    // Load saved config directory path
    const savedConfigDir = localStorage.getItem('vpn_config_dir') || '';
    configDirInput.value = savedConfigDir;

    // Bind Event Listeners
    refreshConfigsBtn.addEventListener('click', fetchVPNConfigs);
    configDirInput.addEventListener('change', fetchVPNConfigs);
    configDirInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fetchVPNConfigs();
    });
    togglePasswordBtn.addEventListener('click', toggleVPNPasswordVisibility);
    btnConnect.addEventListener('click', connectVPN);
    btnDisconnect.addEventListener('click', disconnectVPN);
    clearLogsBtn.addEventListener('click', () => { document.getElementById('vpn-log-console').textContent = ''; });
    statIp.addEventListener('click', copyVPNIpToClipboard);
    configSelect.addEventListener('change', handleVPNConfigChange);
    accountSelect.addEventListener('change', handleVPNAccountChange);
    saveAccountBtn.addEventListener('click', saveCurrentVPNAccount);
    deleteAccountBtn.addEventListener('click', deleteSelectedVPNAccount);

    // Initial fetches
    await fetchVPNConfigs();
    await fetchVPNAccounts();
    await fetchVPNStatus();

    // Auto-show VPN modal if connected or connecting
    if (vpnStatus === 'connected' || vpnStatus === 'connecting' || vpnStatus === 'disconnecting') {
        openVPNModal();
    }

    // Status Polling
    setInterval(fetchVPNStatus, 2000);
}

let vpnHiddenManually = true;
function toggleVPNManagement() {
    const overlay = document.getElementById('vpn-modal-overlay');
    if (overlay.style.display === 'none' || overlay.style.display === '') {
        openVPNModal();
    } else {
        closeVPNModal();
    }
}

function openVPNModal() {
    document.getElementById('vpn-modal-overlay').style.display = 'flex';
    document.getElementById('vpn-toggle').classList.add('active');
    vpnHiddenManually = false;
    setupVPNEventSource();
}

function closeVPNModal() {
    document.getElementById('vpn-modal-overlay').style.display = 'none';
    document.getElementById('vpn-toggle').classList.remove('active');
    vpnHiddenManually = true;
    
    if (vpnEventSource) {
        vpnEventSource.close();
        vpnEventSource = null;
    }
}

function toggleVPNPasswordVisibility() {
    const passwordInput = document.getElementById('vpn-password');
    const togglePasswordBtn = document.getElementById('vpn-toggle-password');
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePasswordBtn.innerText = isPassword ? '🙈' : '👁️';
}

async function fetchVPNConfigs() {
    const configDirInput = document.getElementById('vpn-config-dir');
    const configSelect = document.getElementById('vpn-config-select');
    const refreshConfigsBtn = document.getElementById('vpn-refresh-configs');
    
    try {
        refreshConfigsBtn.disabled = true;
        const configDir = configDirInput.value.trim();
        localStorage.setItem('vpn_config_dir', configDir);
        
        const url = configDir ? `/api/configs?custom_dir=${encodeURIComponent(configDir)}` : '/api/configs';
        const response = await fetch(url);
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to load configs');
        }
        
        vpnSavedConfigs = await response.json();
        const currentSelection = configSelect.value;
        
        configSelect.innerHTML = '<option value="" disabled selected>Select a configuration file...</option>';
        
        if (vpnSavedConfigs.length === 0) {
            configSelect.innerHTML = '<option value="" disabled selected>No .ovpn files found</option>';
        } else {
            vpnSavedConfigs.forEach(cfg => {
                const opt = document.createElement('option');
                opt.value = cfg.path;
                opt.textContent = cfg.name;
                configSelect.appendChild(opt);
            });
            
            if (currentSelection && vpnSavedConfigs.some(c => c.path === currentSelection)) {
                configSelect.value = currentSelection;
            } else if (vpnSavedConfigs.length > 0) {
                configSelect.selectedIndex = 1;
                handleVPNConfigChange();
            }
        }
    } catch (err) {
        console.error(err);
        showAlert('VPN Error', 'Error fetching OVPN configs: ' + err.message);
    } finally {
        refreshConfigsBtn.disabled = false;
    }
}

function handleVPNConfigChange() {
    const configSelect = document.getElementById('vpn-config-select');
    const usernameInput = document.getElementById('vpn-username');
    const passwordInput = document.getElementById('vpn-password');
    const selectedPath = configSelect.value;
    const config = vpnSavedConfigs.find(c => c.path === selectedPath);
    if (config) {
        usernameInput.value = config.saved_username || '';
        passwordInput.value = config.saved_password || '';
    }
}

async function fetchVPNStatus() {
    try {
        const response = await fetch('/api/status');
        if (!response.ok) throw new Error('Status failed');
        const state = await response.json();
        updateVPNUIState(state);
    } catch (err) {
        console.error(err);
    }
}

function updateVPNUIState(state) {
    const status = state.status;
    vpnStatus = status;

    const stateRing = document.getElementById('vpn-state-ring');
    const stateDot = document.getElementById('vpn-state-dot');
    const stateName = document.getElementById('vpn-state-name');
    const stateSub = document.getElementById('vpn-state-sub');
    const statIp = document.getElementById('vpn-stat-ip');
    const statInterface = document.getElementById('vpn-stat-interface');
    const statUptime = document.getElementById('vpn-stat-uptime');

    const btnConnect = document.getElementById('vpn-btn-connect');
    const btnDisconnect = document.getElementById('vpn-btn-disconnect');
    const configSelect = document.getElementById('vpn-config-select');
    const configDirInput = document.getElementById('vpn-config-dir');
    const usernameInput = document.getElementById('vpn-username');
    const passwordInput = document.getElementById('vpn-password');
    const saveCredsCheckbox = document.getElementById('vpn-save-credentials');
    const accountSelect = document.getElementById('vpn-account-select');
    const saveAccountBtn = document.getElementById('vpn-save-account');
    const deleteAccountBtn = document.getElementById('vpn-delete-account');

    stateRing.className = `state-glowing-ring ${status}`;
    stateDot.className = `state-dot ${status}`;
    stateName.textContent = status.toUpperCase();

    // Update header toggle button state
    const vpnToggleBtn = document.getElementById('vpn-toggle');
    if (vpnToggleBtn) {
        if (status === 'connected') {
            vpnToggleBtn.innerHTML = '🔓 VPN <span style="display:inline-block; width:8px; height:8px; background:#00f2fe; border-radius:50%; margin-left:4px; box-shadow:0 0 8px #00f2fe; animation: vpnPulse 1.5s infinite alternate;"></span>';
            vpnToggleBtn.style.borderColor = 'rgba(0, 242, 254, 0.4)';
        } else if (status === 'connecting') {
            vpnToggleBtn.innerHTML = '⏳ VPN <span style="display:inline-block; width:8px; height:8px; background:#f6d365; border-radius:50%; margin-left:4px; box-shadow:0 0 8px #f6d365; animation: vpnPulse 0.8s infinite alternate;"></span>';
            vpnToggleBtn.style.borderColor = 'rgba(246, 211, 101, 0.4)';
        } else if (status === 'error') {
            vpnToggleBtn.innerHTML = '⚠️ VPN <span style="display:inline-block; width:8px; height:8px; background:#ff0844; border-radius:50%; margin-left:4px; box-shadow:0 0 8px #ff0844;"></span>';
            vpnToggleBtn.style.borderColor = 'rgba(255, 8, 68, 0.4)';
        } else {
            vpnToggleBtn.innerHTML = '🔒 VPN';
            vpnToggleBtn.style.borderColor = '';
        }
    }

    if (status === 'connected') {
        const parts = state.active_config.split('/');
        const filename = parts[parts.length - 1];
        stateSub.textContent = `Connected to ${filename}`;
        statIp.textContent = state.ip_address || 'Fetching IP...';
        statInterface.textContent = state.interface || 'tun0';

        btnConnect.disabled = true;
        btnDisconnect.disabled = false;
        configSelect.disabled = true;
        configDirInput.disabled = true;
        usernameInput.disabled = true;
        passwordInput.disabled = true;
        saveCredsCheckbox.disabled = true;
        accountSelect.disabled = true;
        saveAccountBtn.disabled = true;
        deleteAccountBtn.disabled = true;

        if (!vpnUptimeInterval && state.start_time) {
            const start = new Date(state.start_time);
            vpnUptimeInterval = setInterval(() => {
                const diffMs = new Date() - start;
                vpnUptimeSeconds = Math.max(0, Math.floor(diffMs / 1000));
                statUptime.textContent = formatVPNDuration(vpnUptimeSeconds);
            }, 1000);
        }
    } else if (status === 'connecting') {
        stateSub.textContent = 'Establishing secure channel...';
        statIp.textContent = '---.---.---.---';
        statInterface.textContent = 'negotiating';

        btnConnect.disabled = true;
        btnDisconnect.disabled = false;
        configSelect.disabled = true;
        configDirInput.disabled = true;
        usernameInput.disabled = true;
        passwordInput.disabled = true;
        saveCredsCheckbox.disabled = true;
        accountSelect.disabled = true;
        saveAccountBtn.disabled = true;
        deleteAccountBtn.disabled = true;

        stopVPNUptimeCounter();
    } else if (status === 'disconnecting') {
        stateSub.textContent = 'Closing VPN session...';
        btnConnect.disabled = true;
        btnDisconnect.disabled = true;
        configSelect.disabled = true;
        configDirInput.disabled = true;
        usernameInput.disabled = true;
        passwordInput.disabled = true;
        saveCredsCheckbox.disabled = true;
        accountSelect.disabled = true;
        saveAccountBtn.disabled = true;
        deleteAccountBtn.disabled = true;
    } else { // disconnected or error
        stateSub.textContent = status === 'error' ? (state.error_msg || 'An error occurred') : 'Select profile and connect';
        statIp.textContent = '---.---.---.---';
        statInterface.textContent = 'none';

        btnConnect.disabled = !configSelect.value;
        btnDisconnect.disabled = true;
        configSelect.disabled = false;
        configDirInput.disabled = false;
        usernameInput.disabled = false;
        passwordInput.disabled = false;
        saveCredsCheckbox.disabled = false;
        accountSelect.disabled = false;
        saveAccountBtn.disabled = false;
        deleteAccountBtn.disabled = false;

        stopVPNUptimeCounter();
    }
}

function stopVPNUptimeCounter() {
    if (vpnUptimeInterval) {
        clearInterval(vpnUptimeInterval);
        vpnUptimeInterval = null;
    }
    document.getElementById('vpn-stat-uptime').textContent = '00:00:00';
    vpnUptimeSeconds = 0;
}

function formatVPNDuration(seconds) {
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
}

function copyVPNIpToClipboard() {
    const ip = document.getElementById('vpn-stat-ip').textContent;
    if (ip && ip !== '---.---.---.---' && ip !== 'Fetching IP...') {
        navigator.clipboard.writeText(ip).then(() => {
            showAlert('VPN Info', 'IP copied to clipboard: ' + ip);
        });
    }
}

async function connectVPN() {
    const configPath = document.getElementById('vpn-config-select').value;
    const username = document.getElementById('vpn-username').value.trim();
    const password = document.getElementById('vpn-password').value;
    const saveCreds = document.getElementById('vpn-save-credentials').checked;

    if (!configPath) {
        showAlert('VPN Error', 'Please select a config profile.');
        return;
    }
    if (!username || !password) {
        showAlert('VPN Error', 'Please enter username and password.');
        return;
    }

    try {
        document.getElementById('vpn-btn-connect').disabled = true;
        const response = await fetch('/api/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                config_path: configPath,
                username: username,
                password: password,
                save_credentials: saveCreds
            })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Connection failed to start');
        document.getElementById('vpn-log-console').textContent = '=== Starting connection ===\n';
        fetchVPNStatus();
    } catch (err) {
        console.error(err);
        showAlert('VPN Error', err.message);
        document.getElementById('vpn-btn-connect').disabled = false;
    }
}

async function disconnectVPN() {
    try {
        document.getElementById('vpn-btn-disconnect').disabled = true;
        const response = await fetch('/api/disconnect', { method: 'POST' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Disconnect failed');
        fetchVPNStatus();
    } catch (err) {
        console.error(err);
        showAlert('VPN Error', err.message);
        document.getElementById('vpn-btn-disconnect').disabled = false;
    }
}

function setupVPNEventSource() {
    if (vpnEventSource) vpnEventSource.close();
    vpnEventSource = new EventSource('/api/logs');

    vpnEventSource.onmessage = (event) => {
        const text = event.data;
        const consoleEl = document.getElementById('vpn-log-console');
        if (consoleEl.textContent.includes('Waiting for connection logs...')) {
            consoleEl.textContent = '';
        }
        consoleEl.textContent += text + '\n';
        if (document.getElementById('vpn-auto-scroll').checked) {
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }
    };

    vpnEventSource.onerror = (err) => {
        console.warn('VPN Logs EventSource disconnected, retrying...', err);
        vpnEventSource.close();
        vpnEventSource = null;
        if (!vpnHiddenManually) {
            setTimeout(setupVPNEventSource, 3000);
        }
    };
}

async function fetchVPNAccounts() {
    try {
        const response = await fetch('/api/accounts');
        if (!response.ok) throw new Error('Failed to fetch accounts');
        vpnSavedAccounts = await response.json();
        
        const select = document.getElementById('vpn-account-select');
        const deleteBtn = document.getElementById('vpn-delete-account');
        const prevVal = select.value;
        
        select.innerHTML = '<option value="">-- Enter custom credentials --</option>';
        vpnSavedAccounts.forEach(acc => {
            const opt = document.createElement('option');
            opt.value = acc.id;
            opt.textContent = `${acc.label} (${acc.username})`;
            select.appendChild(opt);
        });
        
        if (prevVal && vpnSavedAccounts.some(acc => acc.id === prevVal)) {
            select.value = prevVal;
            deleteBtn.style.display = 'inline-block';
        } else {
            select.value = '';
            deleteBtn.style.display = 'none';
        }
    } catch (err) {
        console.error('Error fetching accounts:', err);
    }
}

function handleVPNAccountChange() {
    const select = document.getElementById('vpn-account-select');
    const usernameInput = document.getElementById('vpn-username');
    const passwordInput = document.getElementById('vpn-password');
    const deleteBtn = document.getElementById('vpn-delete-account');
    const selectedId = select.value;
    
    if (!selectedId) {
        usernameInput.value = '';
        passwordInput.value = '';
        deleteBtn.style.display = 'none';
        return;
    }
    
    const account = vpnSavedAccounts.find(acc => acc.id === selectedId);
    if (account) {
        usernameInput.value = account.username;
        passwordInput.value = account.password;
        deleteBtn.style.display = 'inline-block';
    }
}

async function saveCurrentVPNAccount() {
    const username = document.getElementById('vpn-username').value.trim();
    const password = document.getElementById('vpn-password').value;
    const select = document.getElementById('vpn-account-select');
    
    if (!username || !password) {
        showAlert('VPN Info', 'Please enter both username and password first');
        return;
    }
    
    const selectedId = select.value;
    let label = '';
    
    if (selectedId) {
        const existing = vpnSavedAccounts.find(acc => acc.id === selectedId);
        if (existing) {
            if (confirm(`Do you want to update the password for saved account "${existing.label}"?`)) {
                label = existing.label;
            } else {
                return;
            }
        }
    }
    
    if (!label) {
        label = prompt('Enter a label/display name for this account:');
        if (!label) return;
        label = label.trim();
        if (!label) {
            showAlert('VPN Info', 'Label cannot be empty');
            return;
        }
    }
    
    try {
        const payload = { label, username, password };
        if (selectedId) payload.id = selectedId;
        
        const response = await fetch('/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to save account');
        }
        
        showAlert('VPN Info', selectedId ? 'Account updated successfully' : 'Account saved successfully');
        await fetchVPNAccounts();
    } catch (err) {
        console.error(err);
        showAlert('VPN Error', err.message);
    }
}

async function deleteSelectedVPNAccount() {
    const select = document.getElementById('vpn-account-select');
    const selectedId = select.value;
    if (!selectedId) return;
    
    const account = vpnSavedAccounts.find(acc => acc.id === selectedId);
    if (!account) return;
    
    if (!confirm(`Are you sure you want to delete the saved account "${account.label}"?`)) return;
    
    try {
        const response = await fetch('/api/accounts/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: selectedId })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete account');
        }
        
        showAlert('VPN Info', 'Account deleted successfully');
        document.getElementById('vpn-username').value = '';
        document.getElementById('vpn-password').value = '';
        select.value = '';
        document.getElementById('vpn-delete-account').style.display = 'none';
        await fetchVPNAccounts();
    } catch (err) {
        console.error(err);
        showAlert('VPN Error', err.message);
    }
}

init();

initResizer();
