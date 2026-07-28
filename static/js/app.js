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

// Global state for parallel deployments
let activeDeployments = {};
let activeTerminalTab = null;

// Modal multi-deploy state
let modalSelectedServices = new Set();
let modalCurrentEnv = 'Development';
let compareFocusedService = null;

function updateSidebarItemStatus(svcName, status) {
    const items = document.querySelectorAll('.service-item');
    items.forEach(item => {
        const nameEl = item.querySelector('.service-name');
        if (nameEl && nameEl.innerText.includes(svcName)) {
            let statusTag = item.querySelector('.deploy-status-tag');
            if (!statusTag) {
                statusTag = document.createElement('span');
                statusTag.className = 'deploy-status-tag';
                nameEl.appendChild(statusTag);
            }
            if (status) {
                statusTag.className = `deploy-status-tag ${status}`;
                statusTag.innerText = status;
                statusTag.style.display = 'inline-block';
            } else {
                statusTag.style.display = 'none';
            }
        }
    });
}

function updateTerminalTabs() {
    // Terminal tabs in main page removed in favor of Live Multi-Deploy Console Modal
}

function switchTerminalTab(serviceName) {
    activeTerminalTab = serviceName;
    updateTerminalTabs();
    
    const deployElem = document.getElementById('terminal-deploy');
    const statusSpan = document.getElementById('terminal-status');
    const dep = activeDeployments[serviceName];
    
    if (dep) {
        if (deployElem) {
            deployElem.innerText = dep.logs;
            deployElem.scrollTop = deployElem.scrollHeight;
        }
        if (statusSpan) {
            statusSpan.innerText = dep.status;
            if (dep.status === 'running') {
                statusSpan.style.color = '#f1c40f';
            } else if (dep.status === 'success') {
                statusSpan.style.color = 'var(--success)';
            } else if (dep.status === 'failed') {
                statusSpan.style.color = 'var(--error)';
            } else {
                statusSpan.style.color = 'var(--text-dim)';
            }
        }
    }
}

function closeTerminalTab(serviceName) {
    const dep = activeDeployments[serviceName];
    if (dep && dep.status === 'running') {
        if (!confirm(`Deployment for ${serviceName} is still running. Are you sure you want to close this tab?`)) {
            return;
        }
        if (dep.reader) {
            try {
                dep.reader.cancel();
            } catch(e) {}
        }
    }
    
    delete activeDeployments[serviceName];
    
    if (activeTerminalTab === serviceName) {
        const remaining = Object.keys(activeDeployments);
        if (remaining.length > 0) {
            activeTerminalTab = remaining[remaining.length - 1];
        } else {
            activeTerminalTab = null;
        }
    }
    
    updateTerminalTabs();
    if (activeTerminalTab) {
        switchTerminalTab(activeTerminalTab);
    } else {
        const terminal = document.getElementById('terminal');
        const statusSpan = document.getElementById('terminal-status');
        if (terminal) terminal.innerText = selectedService ? `Ready to deploy ${selectedService.name}...` : 'Select a service to start...';
        if (statusSpan) {
            statusSpan.innerText = 'idle';
            statusSpan.style.color = 'var(--text-dim)';
        }
    }
    
    updateSidebarItemStatus(serviceName, '');
}

// Multi Deploy Modal Functions
function openMultiDeployModal() {
    const overlay = document.getElementById('multi-deploy-modal-overlay');
    if (overlay) overlay.style.display = 'flex';

    modalSelectedServices.clear();
    
    // Load last environment from localStorage, fallback to currentEnv
    const savedEnv = localStorage.getItem('lastMultiDeployEnv');
    modalCurrentEnv = savedEnv ? savedEnv : currentEnv;
    
    // Load last selected services from localStorage
    const savedServices = localStorage.getItem('lastMultiDeployServices');
    if (savedServices) {
        try {
            const list = JSON.parse(savedServices);
            list.forEach(name => modalSelectedServices.add(name));
        } catch (e) {
            console.error('Failed to parse last multi-deploy services:', e);
        }
    }
    
    const mainMsg = document.getElementById('deploy-msg');
    document.getElementById('modal-deploy-msg').value = mainMsg ? mainMsg.value : '';
    document.getElementById('modal-svc-search').value = '';
    
    const savedResetStaging = localStorage.getItem('lastResetStaging') === 'true';
    const resetStgBtn = document.getElementById('reset-staging-btn');
    if (resetStgBtn) resetStgBtn.classList.toggle('active', savedResetStaging);
    
    updateModalEnvSelector();
    renderModalServicesGrid();
}

function closeMultiDeployModal() {
    const overlay = document.getElementById('multi-deploy-modal-overlay');
    if (overlay) overlay.style.display = 'none';
}

function setModalEnv(env) {
    modalCurrentEnv = env;
    updateModalEnvSelector();
    modalSelectedServices.clear();
    renderModalServicesGrid();
}

function updateModalEnvSelector() {
    const selector = document.getElementById('modal-env-selector');
    if (!selector) return;
    selector.querySelectorAll('.env-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-env') === modalCurrentEnv);
    });
}

function renderModalServicesGrid() {
    const grid = document.getElementById('modal-services-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const searchVal = document.getElementById('modal-svc-search');
    const query = searchVal ? searchVal.value.trim() : '';
    
    services.forEach(svc => {
        if (!matchSearchQuery(svc.name, query)) return;
        
        let hasScript = false;
        if (modalCurrentEnv === 'Development') hasScript = svc.has_dev;
        else if (modalCurrentEnv === 'Staging') hasScript = svc.has_stg;
        else if (modalCurrentEnv === 'Production') hasScript = svc.has_prod;
        
        const isDeploying = activeDeployments[svc.name] && activeDeployments[svc.name].status === 'running';
        const eligible = hasScript && !isDeploying;
        
        const isChecked = modalSelectedServices.has(svc.name) && eligible;
        
        const card = document.createElement('div');
        card.className = `modal-service-card ${eligible ? '' : 'disabled'} ${isChecked ? 'selected' : ''}`;
        card.setAttribute('data-service', svc.name);
        card.setAttribute('data-eligible', eligible ? 'true' : 'false');
        
        card.onclick = () => {
            if (!eligible) return;
            const newChecked = !modalSelectedServices.has(svc.name);
            toggleModalSvcSelection(svc.name, newChecked);
        };
        
        const stashTag = svc.has_stash ? '<span style="color: #f1c40f; margin-left: 6px;" title="Has Git Stash">📥</span>' : '';
        const stagedTag = svc.staged_changes > 0 ? `<span style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; margin-left: 6px;" title="${svc.staged_changes} Staged Changes">Staged: ${svc.staged_changes}</span>` : '';
        
        let statusBadge = '';
        if (isDeploying) {
            statusBadge = '<span class="deploy-status-tag running" style="margin-left: 6px;">Deploying</span>';
        } else if (activeDeployments[svc.name]) {
            const dep = activeDeployments[svc.name];
            statusBadge = `<span class="deploy-status-tag ${dep.status}" style="margin-left: 6px;">${dep.status}</span>`;
        } else if (!hasScript) {
            statusBadge = `<span class="deploy-status-tag failed" style="margin-left: 6px; background: rgba(231, 76, 60, 0.08); font-size: 8px;">No ${modalCurrentEnv} script</span>`;
        }
        
        card.innerHTML = `
            <div class="modal-service-card-content">
                <div class="service-name" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;">
                    <span style="font-weight: 700;">${svc.name}</span>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        ${stashTag}
                        ${statusBadge}
                    </div>
                </div>
                <div class="service-meta" style="margin-top: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>branch: <span class="branch-tag" style="font-size: 10px;">${svc.branch}</span></div>
                        ${stagedTag}
                    </div>
                    <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; opacity: 0.8; margin-top: 2px;">${svc.last_commit}</div>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
    
    updateModalSelectionUI();
}

function toggleModalSvcSelection(svcName, checked) {
    if (checked) {
        modalSelectedServices.add(svcName);
    } else {
        modalSelectedServices.delete(svcName);
    }
    
    const card = document.querySelector(`.modal-service-card[data-service="${svcName}"]`);
    if (card) {
        card.classList.toggle('selected', checked);
    }
    
    updateModalSelectionUI();
}

function filterModalServices() {
    renderModalServicesGrid();
}

function clearModalSelection() {
    modalSelectedServices.clear();
    const cards = document.querySelectorAll('.modal-service-card');
    cards.forEach(card => card.classList.remove('selected'));
    updateModalSelectionUI();
}

function updateModalSelectionUI() {
    const selected = Array.from(modalSelectedServices);
    const count = selected.length;
    
    const countSpan = document.getElementById('modal-selected-count');
    if (countSpan) countSpan.innerText = `${count} selected`;
    
    const deployBtn = document.getElementById('modal-btn-deploy');
    if (deployBtn) {
        deployBtn.disabled = count === 0;
        deployBtn.innerText = `🚀 Deploy Selected (${count})`;
    }
    
    const selectAllBtn = document.getElementById('modal-btn-select-all');
    if (selectAllBtn) {
        const visibleCards = Array.from(document.querySelectorAll('.modal-service-card[data-eligible="true"]'));
        const visibleChecked = visibleCards.filter(c => modalSelectedServices.has(c.getAttribute('data-service')));
        if (visibleCards.length > 0 && visibleChecked.length === visibleCards.length) {
            selectAllBtn.innerText = '☒ Deselect All';
        } else {
            selectAllBtn.innerText = '☑ Select All Eligible';
        }
    }

    const clearAllBtn = document.getElementById('modal-btn-clear-all');
    if (clearAllBtn) {
        clearAllBtn.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

function toggleModalSelectAllBtn() {
    const visibleCards = Array.from(document.querySelectorAll('.modal-service-card[data-eligible="true"]'));
    const visibleChecked = visibleCards.filter(c => modalSelectedServices.has(c.getAttribute('data-service')));
    
    const shouldSelectAll = visibleChecked.length < visibleCards.length;
    
    visibleCards.forEach(card => {
        const name = card.getAttribute('data-service');
        if (shouldSelectAll) {
            modalSelectedServices.add(name);
            card.classList.add('selected');
        } else {
            modalSelectedServices.delete(name);
            card.classList.remove('selected');
        }
    });
    
    updateModalSelectionUI();
}

function toggleResetStagingCheckbox() {
    const btn = document.getElementById('reset-staging-btn');
    if (!btn) return;
    const active = btn.classList.toggle('active');
    localStorage.setItem('lastResetStaging', active ? 'true' : 'false');
}

function runModalDeploy() {
    const selected = Array.from(modalSelectedServices);
    let targets = [];
    
    selected.forEach(name => {
        const svc = services.find(s => s.name === name);
        if (svc) {
            // Verify eligibility in selected environment
            let hasScript = false;
            if (modalCurrentEnv === 'Development') hasScript = svc.has_dev;
            else if (modalCurrentEnv === 'Staging') hasScript = svc.has_stg;
            else if (modalCurrentEnv === 'Production') hasScript = svc.has_prod;
            
            const isDeploying = activeDeployments[svc.name] && activeDeployments[svc.name].status === 'running';
            if (hasScript && !isDeploying) {
                targets.push(svc);
            }
        }
    });
    
    if (targets.length === 0) return;
    
    const resetStaging = document.getElementById('reset-staging-btn')?.classList.contains('active') || false;
    localStorage.setItem('lastResetStaging', resetStaging);
    
    // Save choices to localStorage
    localStorage.setItem('lastMultiDeployEnv', modalCurrentEnv);
    localStorage.setItem('lastMultiDeployServices', JSON.stringify(selected));
    
    const deployMsg = document.getElementById('modal-deploy-msg').value || '';
    
    const startDeployments = (pwd = '') => {
        closeMultiDeployModal();
        openMultiDeployLogsModal(targets.map(t => t.name));
        targets.forEach(t => {
            executeDeployFromModal(t, modalCurrentEnv, deployMsg, pwd, resetStaging);
        });
    };
    
    if (modalCurrentEnv === 'Production') {
        const targetNames = targets.map(t => `<b>${t.name}</b>`).join(', ');
        showPasswordPrompt("Production Deployment", 
            `Confirm deployment of ${targetNames} to <b>PRODUCTION</b>. Please enter the production password:`, 
            (pwd) => {
                startDeployments(pwd);
            });
        return;
    }
    
    if (modalCurrentEnv === 'Staging') {
        const nonStgTargets = targets.filter(t => t.branch !== 'staging');
        if (nonStgTargets.length > 0) {
            const warningList = nonStgTargets.map(t => `<b>${t.name}</b> (branch: "${t.branch}")`).join(', ');
            showConfirm("Staging Deployment Warning",
                `You are attempting to deploy non-staging branches to STAGING for: ${warningList}. Proceed anyway?`,
                () => {
                    startDeployments();
                });
            return;
        }
    }
    
    startDeployments();
}

function runFastMultiDeploy() {
    const savedEnv = localStorage.getItem('lastMultiDeployEnv') || currentEnv;
    const savedServicesJson = localStorage.getItem('lastMultiDeployServices');
    
    if (!savedServicesJson) {
        openMultiDeployModal();
        showAlert("Multi Deploy", "No previous deployment configuration found. Please select services.");
        return;
    }
    
    let savedNames = [];
    try {
        savedNames = JSON.parse(savedServicesJson);
    } catch(e) {}
    
    if (!savedNames || savedNames.length === 0) {
        openMultiDeployModal();
        showAlert("Multi Deploy", "No previous deployment configuration found. Please select services.");
        return;
    }
    
    let targets = [];
    savedNames.forEach(name => {
        const svc = services.find(s => s.name === name);
        if (svc) {
            let hasScript = false;
            if (savedEnv === 'Development') hasScript = svc.has_dev;
            else if (savedEnv === 'Staging') hasScript = svc.has_stg;
            else if (savedEnv === 'Production') hasScript = svc.has_prod;
            
            const isDeploying = activeDeployments[svc.name] && activeDeployments[svc.name].status === 'running';
            if (hasScript && !isDeploying) {
                targets.push(svc);
            }
        }
    });
    
    if (targets.length === 0) {
        showAlert("Fast Multi Deploy", `No eligible services to deploy for ${savedEnv}.`);
        return;
    }
    
    const resetStaging = localStorage.getItem('lastResetStaging') === 'true';
    
    const mainMsg = document.getElementById('deploy-msg');
    const deployMsg = mainMsg ? mainMsg.value || '' : '';
    
    const startDeployments = (pwd = '') => {
        closeMultiDeployModal();
        openMultiDeployLogsModal(targets.map(t => t.name));
        targets.forEach(t => {
            executeDeployFromModal(t, savedEnv, deployMsg, pwd, resetStaging);
        });
    };
    
    if (savedEnv === 'Production') {
        const targetNames = targets.map(t => `<b>${t.name}</b>`).join(', ');
        showPasswordPrompt("Production Deployment", 
            `Confirm Fast Multi Deploy of ${targetNames} to <b>PRODUCTION</b>. Please enter the production password:`, 
            (pwd) => {
                startDeployments(pwd);
            });
        return;
    }
    
    if (savedEnv === 'Staging') {
        const nonStgTargets = targets.filter(t => t.branch !== 'staging');
        if (nonStgTargets.length > 0) {
            const warningList = nonStgTargets.map(t => `<b>${t.name}</b> (branch: "${t.branch}")`).join(', ');
            showConfirm("Staging Deployment Warning",
                `Fast Multi Deploy non-staging branches to STAGING for: ${warningList}. Proceed anyway?`,
                () => {
                    startDeployments();
                });
            return;
        }
    }
    
    startDeployments();
}

// Live Multi Deploy Grid Modal Functions
function openMultiDeployLogsModal(svcNamesList = null) {
    const grid = document.getElementById('multi-logs-grid');
    if (!grid) return;
    
    let displayServices = svcNamesList || Object.keys(activeDeployments);
    if (displayServices.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-dim);">No active or recent deployments to display.</div>';
    } else {
        grid.innerHTML = '';
        displayServices.forEach(name => {
            const dep = activeDeployments[name] || { status: 'idle', logs: 'Waiting...', env: currentEnv };
            
            let statusBadge = '';
            if (dep.status === 'running') {
                statusBadge = '<span class="deploy-status-tag running">Deploying <span class="tab-spinner"></span></span>';
            } else if (dep.status === 'success') {
                statusBadge = '<span class="deploy-status-tag success">SUCCESS</span>';
            } else if (dep.status === 'failed') {
                statusBadge = '<span class="deploy-status-tag failed">FAILED</span>';
            } else {
                statusBadge = '<span class="deploy-status-tag" style="color: var(--text-dim);">IDLE</span>';
            }
            
            const box = document.createElement('div');
            box.className = `multi-log-box ${dep.status || ''}`;
            box.id = `multi-log-box-${name}`;
            box.innerHTML = `
                <div class="multi-log-box-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 700; font-size: 14px; color: var(--text-main);">📦 ${name}</span>
                        <span style="font-size: 10px; opacity: 0.7; padding: 1px 6px; background: var(--bg-body); border-radius: 4px; border: 1px solid var(--border);">${dep.env}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button type="button" onclick="retryMultiDeploySingle('${name}')" title="Retry Deploy for ${name}" style="background: rgba(241, 196, 15, 0.12); border: 1px solid rgba(241, 196, 15, 0.35); color: #f1c40f; font-size: 10px; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s ease;">
                            Retry
                        </button>
                        <div id="multi-log-status-${name}">
                            ${statusBadge}
                        </div>
                    </div>
                </div>
                <pre class="multi-log-box-body" id="multi-log-pre-${name}">${dep.logs || ''}</pre>
            `;
            grid.appendChild(box);
            
            const pre = box.querySelector('.multi-log-box-body');
            if (pre) pre.scrollTop = pre.scrollHeight;
        });
    }
    
    const summaryBadge = document.getElementById('multi-logs-summary-badge');
    if (summaryBadge) summaryBadge.innerText = `${displayServices.length} Active Services`;
    
    const overlay = document.getElementById('multi-deploy-logs-modal-overlay');
    if (overlay) overlay.style.display = 'flex';
}

function retryMultiDeploySingle(svcName) {
    const svc = services.find(s => s.name === svcName);
    if (!svc) {
        showAlert('Error', `Service ${svcName} not found.`);
        return;
    }

    const dep = activeDeployments[svcName];
    const env = (dep && dep.env) ? dep.env : modalCurrentEnv || currentEnv || 'Development';
    const msg = (dep && dep.message) ? dep.message : (svc.last_commit || 'Retry deployment');
    const resetStaging = (dep && dep.reset_staging) || (localStorage.getItem('lastResetStaging') === 'true');

    if (env === 'Production') {
        const pass = prompt(`Enter Production password for ${svcName}:`);
        if (!pass) return;
        executeDeployFromModal(svc, env, msg, pass, resetStaging);
    } else {
        executeDeployFromModal(svc, env, msg, '', resetStaging);
    }
}

function retryAllFailedMultiDeploys() {
    const failedServices = Object.keys(activeDeployments).filter(name => {
        return activeDeployments[name] && activeDeployments[name].status === 'failed';
    });

    if (failedServices.length === 0) {
        showAlert('Info', 'No failed deployments to retry.');
        return;
    }

    failedServices.forEach(name => {
        retryMultiDeploySingle(name);
    });
}

function closeMultiDeployLogsModal() {
    const overlay = document.getElementById('multi-deploy-logs-modal-overlay');
    if (overlay) overlay.style.display = 'none';
}

function updateMultiLogBox(serviceName) {
    const dep = activeDeployments[serviceName];
    if (!dep) return;
    
    const pre = document.getElementById(`multi-log-pre-${serviceName}`);
    if (pre) {
        pre.innerText = dep.logs;
        pre.scrollTop = pre.scrollHeight;
    }

    const box = document.getElementById(`multi-log-box-${serviceName}`);
    if (box) {
        box.className = `multi-log-box ${dep.status || ''}`;
    }
    
    const statusContainer = document.getElementById(`multi-log-status-${serviceName}`);
    if (statusContainer) {
        let statusBadge = '';
        if (dep.status === 'running') {
            statusBadge = '<span class="deploy-status-tag running">Deploying <span class="tab-spinner"></span></span>';
        } else if (dep.status === 'success') {
            statusBadge = '<span class="deploy-status-tag success">SUCCESS</span>';
        } else if (dep.status === 'failed') {
            statusBadge = '<span class="deploy-status-tag failed">FAILED</span>';
        } else {
            statusBadge = '<span class="deploy-status-tag" style="color: var(--text-dim);">IDLE</span>';
        }
        statusContainer.innerHTML = statusBadge;
    }
}

function executeDeployFromModal(svc, env, message, password = '', resetStaging = false) {
    const svcName = svc.name;
    const terminal = document.getElementById('terminal');
    
    activeDeployments[svcName] = {
        env: env,
        status: 'running',
        logs: `Starting deployment for ${svcName} to ${env}...\n`,
        reader: null,
        message: message
    };
    
    activeTerminalTab = svcName;
    updateTerminalTabs();
    switchTerminalTab(svcName);
    switchTerminalView('deploy');
    updateSidebarItemStatus(svcName, 'running');
    updateMultiLogBox(svcName);
    validateForm();
    
    fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            service: svcName, 
            env: env, 
            message: message,
            password: password,
            reset_staging: resetStaging
        })
    }).then(response => {
        if (response.status === 401) {
            const errMsg = "Access Denied: Invalid production password.";
            activeDeployments[svcName].status = 'failed';
            activeDeployments[svcName].logs += `\n❌ ${errMsg}\n`;
            updateSidebarItemStatus(svcName, 'failed');
            updateMultiLogBox(svcName);
            if (activeTerminalTab === svcName) {
                switchTerminalTab(svcName);
            } else {
                updateTerminalTabs();
            }
            showAlert("Access Denied", `Invalid production password for ${svcName}.`);
            validateForm();
            return;
        }
        
        const reader = response.body.getReader();
        if (activeDeployments[svcName]) {
            activeDeployments[svcName].reader = reader;
        }
        const decoder = new TextDecoder();
        
        function read() {
            reader.read().then(({ done, value }) => {
                if (done) {
                    if (activeDeployments[svcName] && activeDeployments[svcName].status === 'running') {
                        activeDeployments[svcName].status = 'success';
                        updateSidebarItemStatus(svcName, 'success');
                    }
                    updateMultiLogBox(svcName);
                    if (activeTerminalTab === svcName) {
                        switchTerminalTab(svcName);
                    } else {
                        updateTerminalTabs();
                    }
                    validateForm();
                    return;
                }
                
                const chunk = decoder.decode(value, { stream: true });
                chunk.split('\n\n').forEach(event => {
                    const trimmed = event.trimStart();
                    if (trimmed.startsWith('data: ')) {
                        const content = trimmed.slice(6);
                        if (content.trim() === '[EOF]') {
                            if (activeDeployments[svcName] && activeDeployments[svcName].status === 'running') {
                                activeDeployments[svcName].status = 'success';
                                updateSidebarItemStatus(svcName, 'success');
                            }
                            
                            if (selectedService && selectedService.name === svcName) {
                                refreshHistoryBar();
                                refreshSelectedService();
                            }
                            
                            updateMultiLogBox(svcName);
                            if (activeTerminalTab === svcName) {
                                switchTerminalTab(svcName);
                                setTimeout(() => {
                                    if (selectedService && selectedService.name === svcName) {
                                        connectTerminalWS(svcName);
                                    }
                                }, 1000);
                            } else {
                                updateTerminalTabs();
                            }
                        } else if (content.startsWith('[STATUS] ')) {
                            const status = content.slice(9).trim();
                            if (activeDeployments[svcName]) {
                                if (status === 'Failed') {
                                    activeDeployments[svcName].status = 'failed';
                                    updateSidebarItemStatus(svcName, 'failed');
                                    showAlert("Deployment Error", `Verification failed for ${svcName}. The service might not be running correctly or binary wasn't updated.`);
                                } else {
                                    activeDeployments[svcName].status = 'success';
                                    updateSidebarItemStatus(svcName, 'success');
                                }
                                updateMultiLogBox(svcName);
                            }
                        } else {
                            if (activeDeployments[svcName]) {
                                activeDeployments[svcName].logs += content.endsWith('\n') ? content : content + '\n';
                                updateMultiLogBox(svcName);
                                if (activeTerminalTab === svcName) {
                                    const deployElem = document.getElementById('terminal-deploy');
                                    if (deployElem) {
                                        deployElem.innerText = activeDeployments[svcName].logs;
                                        deployElem.scrollTop = deployElem.scrollHeight;
                                    }
                                }
                            }
                        }
                    }
                });
                read();
            });
        }
        read();
    }).catch(err => {
        if (activeDeployments[svcName]) {
            activeDeployments[svcName].status = 'failed';
            activeDeployments[svcName].logs += `\n❌ Network Error: ${err.message}\n`;
            updateSidebarItemStatus(svcName, 'failed');
            updateMultiLogBox(svcName);
            if (activeTerminalTab === svcName) {
                switchTerminalTab(svcName);
            } else {
                updateTerminalTabs();
            }
            validateForm();
        }
    });
}


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
            closeMultiDeployModal();
            closeCompareModal();
        }

        if (e.altKey && e.shiftKey) {
            if (e.code === 'KeyG') toggleGitManagement();
            if (e.code === 'KeyU') toggleVPNManagement();
            if (e.code === 'ArrowLeft') nextCommitMsg();
            if (e.code === 'ArrowRight') prevCommitMsg();
        }
    });
    await initVPN();
    initTerminal();
}

function matchSearchQuery(text, query) {
    if (!query) return true;
    const targetText = text.toLowerCase();
    const terms = query.toLowerCase().split(',').map(t => t.trim()).filter(t => t);
    if (terms.length === 0) return true;
    return terms.some(term => {
        const words = term.split(/\s+/).filter(w => w);
        return words.every(word => targetText.includes(word));
    });
}

function filterServices() {
    const query = document.getElementById('svc-search').value.trim();
    const items = document.querySelectorAll('.service-item');
    items.forEach(item => {
        const name = item.querySelector('.service-name').innerText;
        item.style.display = matchSearchQuery(name, query) ? 'flex' : 'none';
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
    const query = document.getElementById('branch-search').value.trim();
    const items = document.querySelectorAll('#branches-list > div');
    items.forEach(item => {
        const name = item.querySelector('span').innerText;
        item.style.display = matchSearchQuery(name, query) ? 'flex' : 'none';
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

                if (branchInfo.has_staging && branch !== 'staging' && branch !== 'origin/staging') {
                    const stagingSpan = document.createElement('span');
                    stagingSpan.style.cssText = 'background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); font-size: 10px; padding: 2px 8px; border-radius: 20px; font-family: var(--font-mono); display: inline-flex; align-items: center; justify-content: center; margin-left: 8px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);';
                    stagingSpan.title = 'Staging comparison: +ahead -behind';
                    
                    let inner = '<span style="color: var(--text-dim); font-size: 8.5px; font-weight: 700; letter-spacing: 0.5px; margin-right: 4px; text-transform: uppercase;">stg</span>';
                    if (branchInfo.ahead_staging === 0 && branchInfo.behind_staging === 0) {
                        inner += '<span style="color: var(--success); font-weight: bold;">✓</span>';
                    } else {
                        if (branchInfo.ahead_staging > 0) {
                            inner += `<span style="color: var(--success); font-weight: 600;">+${branchInfo.ahead_staging}</span>`;
                        }
                        if (branchInfo.behind_staging > 0) {
                            inner += `<span style="color: var(--error); font-weight: 600; margin-left: 3px;">-${branchInfo.behind_staging}</span>`;
                        }
                    }
                    stagingSpan.innerHTML = inner;
                    nameSpan.appendChild(stagingSpan);
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
                    row.style.cssText = 'display: flex; flex-direction: column; padding: 10px 14px; background: var(--bg-hover); border-radius: 8px; margin-bottom: 6px; border: 1px solid var(--border); cursor: pointer;';
                    row.onclick = () => toggleStashPreview(idx, row);
                    row.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--text-main); margin-right: 12px;">📁 ${s}</div>
                            <button class="primary" style="font-size: 10px; padding: 2px 8px; height: 24px; background: #2ecc71;" 
                                    onclick="event.stopPropagation(); popStash(${idx})">Pop</button>
                        </div>
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

function showPasswordPrompt(title, message, onConfirm) {
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-message').innerHTML = `
        <div style="margin-bottom: 16px;">${message}</div>
        <input type="password" id="alert-input" style="width: 100%; background: var(--bg-body); border: 1px solid var(--border); color: var(--text-main); border-radius: 6px; padding: 10px; margin-top: 8px;" placeholder="Password...">
    `;
    document.getElementById('alert-confirm-btn').onclick = () => {
        const val = document.getElementById('alert-input').value;
        closeAlertModal();
        onConfirm(val);
    };
    document.getElementById('alert-cancel-btn').style.display = 'inline-block';
    document.getElementById('alert-modal-overlay').style.display = 'flex';
    setTimeout(() => document.getElementById('alert-input').focus(), 100);
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
    document.getElementById('alert-message').innerHTML = message;
    document.getElementById('alert-confirm-btn').onclick = () => {
        closeAlertModal();
        onConfirm();
    };
    document.getElementById('alert-cancel-btn').style.display = 'inline-block';
    document.getElementById('alert-modal-overlay').style.display = 'flex';
}

function showAlert(title, message) {
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-message').innerHTML = message;
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
    document.getElementById('set-dev-url').value = settings.dev_agent_url || '';
    document.getElementById('set-stg-url').value = settings.stg_agent_url || '';
    document.getElementById('set-prod-url').value = settings.prod_agent_url || '';

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

    if (selectedService && selectedService.show_production === true) {
        document.getElementById('env-prod-btn').style.display = 'inline-block';
    } else {
        document.getElementById('env-prod-btn').style.display = 'none';
        if (currentEnv === 'Production') setEnv('Development');
    }

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
        const stagedTag = svc.staged_changes > 0 ? `<span style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; margin-left: 6px;" title="${svc.staged_changes} Staged Changes">Staged: ${svc.staged_changes}</span>` : '';
        
        const recommendTag = (svc.ahead_staging > 0 || svc.ahead > 0) ? `
            <span class="recommend-badge" style="background: rgba(241, 196, 15, 0.08); color: #f1c40f; border: 1px solid rgba(241, 196, 15, 0.25); font-size: 8.5px; padding: 1px 5px; border-radius: 4px; font-weight: bold; animation: deployPulse 2s infinite; display: inline-flex; align-items: center; gap: 3px;" title="Has un-deployed changes (Staging: +${svc.ahead_staging}, Production: +${svc.ahead})">
                💡 Deploy Suggest
            </span>
        ` : '';

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

        let statusTagHtml = '';
        const dep = activeDeployments[svc.name];
        if (dep) {
            statusTagHtml = `<span class="deploy-status-tag ${dep.status}" style="margin-left: 8px;">${dep.status}</span>`;
        }

        let stagingTag = '';
        if (svc.has_staging && svc.branch !== 'staging' && svc.branch !== 'origin/staging') {
            let stgInner = '<span style="color: var(--text-dim); font-size: 8.5px; font-weight: 700; letter-spacing: 0.5px; margin-right: 4px; text-transform: uppercase;">stg</span>';
            if (svc.ahead_staging === 0 && svc.behind_staging === 0) {
                stgInner += '<span style="color: var(--success); font-weight: bold;">✓</span>';
            } else {
                if (svc.ahead_staging > 0) stgInner += `<span style="color: var(--success); font-weight: 600;">+${svc.ahead_staging}</span>`;
                if (svc.behind_staging > 0) stgInner += `<span style="color: var(--error); font-weight: 600; margin-left: 3px;">-${svc.behind_staging}</span>`;
            }
            stagingTag = `<span style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); font-size: 10px; padding: 2px 8px; border-radius: 20px; font-family: var(--font-mono); display: inline-flex; align-items: center; justify-content: center; margin-left: 0; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);" title="Staging comparison: +ahead -behind">${stgInner}</span>`;
        }

        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div class="service-name" style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                    <span>${svc.name}</span>
                    ${stashTag}
                    ${statusTagHtml}
                    ${recommendTag}
                </div>
                ${healthHtml}
            </div>
            <div class="service-meta" style="display: flex; flex-direction: column; gap: 4px;">
                <div class="branch-tag" style="display: flex; align-items: center; justify-content: space-between;">
                    <span>branch: ${svc.branch}</span>
                    ${stagedTag}
                </div>
                ${stagingTag ? `<div style="display: flex; align-items: center;">${stagingTag}</div>` : ''}
                <div class="commit-msg">${svc.last_commit}</div>
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

                let statusTagHtml = '';
                const dep = activeDeployments[svc.name];
                if (dep) {
                    statusTagHtml = `<span class="deploy-status-tag ${dep.status}" style="margin-left: 8px;">${dep.status}</span>`;
                }

                let stagingTag = '';
                if (svc.has_staging && svc.branch !== 'staging' && svc.branch !== 'origin/staging') {
                    let stgInner = '<span style="color: var(--text-dim); font-size: 8.5px; font-weight: 700; letter-spacing: 0.5px; margin-right: 4px; text-transform: uppercase;">stg</span>';
                    if (svc.ahead_staging === 0 && svc.behind_staging === 0) {
                        stgInner += '<span style="color: var(--success); font-weight: bold;">✓</span>';
                    } else {
                        if (svc.ahead_staging > 0) stgInner += `<span style="color: var(--success); font-weight: 600;">+${svc.ahead_staging}</span>`;
                        if (svc.behind_staging > 0) stgInner += `<span style="color: var(--error); font-weight: 600; margin-left: 3px;">-${svc.behind_staging}</span>`;
                    }
                    stagingTag = `<span style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); font-size: 10px; padding: 2px 8px; border-radius: 20px; font-family: var(--font-mono); display: inline-flex; align-items: center; justify-content: center; margin-left: 0; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);" title="Staging comparison: +ahead -behind">${stgInner}</span>`;
                }

                element.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div class="service-name" style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                            <span>${svc.name}</span>
                            ${stashTag}
                            ${statusTagHtml}
                        </div>
                        ${healthHtml}
                    </div>
                    <div class="service-meta" style="display: flex; flex-direction: column; gap: 4px;">
                        <div class="branch-tag">👀 Branch: ${svc.branch}</div>
                        ${stagingTag ? `<div style="display: flex; align-items: center;">${stagingTag}</div>` : ''}
                        <div class="commit-msg">💬 Last commit: ${svc.last_commit}</div>
                    </div>
                `;
            }
        }
    } catch (err) { }
    document.getElementById('deploy-msg').value = svc.last_commit;
    if (!skipTerminalReset && !activeTerminalTab) {
        connectTerminalWS(svc.name);
    }
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

    if (svc.show_production === true) {
        document.getElementById('env-prod-btn').style.display = 'inline-block';
    } else {
        document.getElementById('env-prod-btn').style.display = 'none';
        if (currentEnv === 'Production') setEnv('Development');
    }

    loadGitTabContent(currentGitTab);
    updateGitStatusBadge(svc);
    updateHealthWidget();
    validateForm();
    refreshHistoryBar();
    currentCommitMsgIndex = -1; // Reset message navigation
}

let gitHiddenManually = true;
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
    let html = '';
    
    // Upstream status
    if (svc.ahead > 0 || svc.behind > 0) {
        html += `
            <span title="Ahead/Behind Upstream" style="margin-right: 12px; display: inline-flex; align-items: center; gap: 4px;">
                <span style="color: var(--text-dim); font-size: 9px; text-transform: uppercase;">Upstream:</span>
                <span style="color: var(--success);">↑${svc.ahead}</span>
                <span style="color: var(--error);">↓${svc.behind}</span>
            </span>
        `;
    } else {
        html += `<span title="Ahead/Behind Upstream" style="margin-right: 12px; color: var(--text-dim); font-size: 10px;">Upstream: ✓</span>`;
    }

    // Staging status
    if (svc.has_staging && svc.branch !== 'staging' && svc.branch !== 'origin/staging') {
        let stgText = '';
        if (svc.ahead_staging === 0 && svc.behind_staging === 0) {
            stgText = '<span style="color: var(--success); font-weight: bold;">✓</span>';
        } else {
            if (svc.ahead_staging > 0) stgText += `<span style="color: var(--success); font-weight: 600;">+${svc.ahead_staging}</span>`;
            if (svc.behind_staging > 0) stgText += `<span style="color: var(--error); font-weight: 600; margin-left: 3px;">-${svc.behind_staging}</span>`;
        }
        html += `
            <span title="Ahead/Behind Staging" style="display: inline-flex; align-items: center; gap: 4px; padding-left: 12px; border-left: 1px solid var(--border); font-family: var(--font-mono);">
                <span style="color: var(--text-dim); font-size: 9px; font-weight: 700; text-transform: uppercase; margin-right: 2px;">STG:</span>
                ${stgText}
            </span>
        `;
    }
    
    badge.innerHTML = html;

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
    ['Development', 'Staging', 'Production'].forEach(env => {
        if (env === 'Production' && selectedService.show_production !== true) return;
        
        const met = selectedService.metrics[env];
        const up = met && met.status === 'RUNNING';
        const badge = document.createElement('div');
        badge.style.cssText = `font-size: 10px; padding: 2px 6px; border-radius: 4px; background: ${up ? '#2ecc7122' : '#e74c3c22'}; color: ${up ? '#2ecc71' : '#e74c3c'}; border: 1px solid ${up ? '#2ecc7144' : '#e74c3c44'}; font-weight: bold;`;
        
        let label = 'DEV';
        if (env === 'Staging') label = 'STG';
        if (env === 'Production') label = 'PROD';
        
        badge.innerText = `${label}: ${up ? 'UP' : 'DOWN'}`;
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

function openCompareModal(focusedServiceName = null) {
    console.log("openCompareModal called", focusedServiceName);
    const overlay = document.getElementById('compare-modal-overlay');
    if (overlay) overlay.style.display = 'flex';

    compareFocusedService = focusedServiceName;
    
    // Select sensible default target based on active environment
    const selectEl = document.getElementById('compare-target-select');
    if (selectEl) {
        if (currentEnv === 'Staging') {
            selectEl.value = 'origin/staging';
        } else if (currentEnv === 'Production') {
            selectEl.value = 'origin/master';
        } else {
            selectEl.value = 'origin/staging';
        }
    }

    loadCompareData();
}

function closeCompareModal() {
    document.getElementById('compare-modal-overlay').style.display = 'none';
}

function toggleCompareCard(name) {
    const body = document.getElementById(`compare-body-${name}`);
    const caret = document.getElementById(`compare-caret-${name}`);
    if (!body || !caret) return;
    if (body.style.display === 'none') {
        body.style.display = 'flex';
        caret.innerText = '▼';
    } else {
        body.style.display = 'none';
        caret.innerText = '▶';
    }
}

function openMultiDeployModalFromCompare() {
    closeCompareModal();
    openMultiDeployModal();
}

async function loadCompareData() {
    const target = document.getElementById('compare-target-select').value;
    const container = document.getElementById('compare-services-container');
    if (!container) return;

    container.innerHTML = '<div class="shimmer" style="height: 60px"></div>'.repeat(3);

    try {
        const res = await fetch(`/api/git/compare-all?target=${encodeURIComponent(target)}`);
        if (!res.ok) {
            throw new Error(await res.text());
        }
        const data = await res.json();
        
        container.innerHTML = '';
        
        if (data.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-dim);">No services found in workspace.</div>';
            return;
        }

        data.forEach(result => {
            const hasDiff = result.commits.length > 0 || result.files.length > 0;
            const hasError = !!result.error;
            
            // Determine default expand state
            let isExpanded = false;
            if (compareFocusedService) {
                isExpanded = (result.name === compareFocusedService);
            } else {
                isExpanded = hasDiff && !hasError;
            }

            const card = document.createElement('div');
            card.style.cssText = 'border: 1px solid var(--border); border-radius: 8px; background: var(--bg-card); overflow: hidden; display: flex; flex-direction: column; transition: all 0.2s; flex-shrink: 0;';
            if (compareFocusedService && result.name === compareFocusedService) {
                card.style.borderColor = 'var(--accent)';
                card.style.boxShadow = '0 0 12px var(--accent-glow)';
            }

            const headerBg = hasDiff ? 'rgba(241, 196, 15, 0.02)' : 'transparent';
            const nameColor = hasDiff ? 'var(--accent)' : 'var(--text-dim)';

            let badgeHtml = '';
            if (hasError) {
                // error tag
            } else if (hasDiff) {
                badgeHtml = `
                    <span style="font-size: 10px; font-weight: bold; background: var(--accent-glow); color: var(--accent); border: 1px solid var(--accent); padding: 2px 8px; border-radius: 12px; font-family: var(--font-mono);">
                        ${result.commits.length} ahead
                    </span>
                    <span style="font-size: 10px; font-weight: bold; background: rgba(52, 152, 219, 0.1); color: #3498db; border: 1px solid rgba(52, 152, 219, 0.2); padding: 2px 8px; border-radius: 12px; font-family: var(--font-mono);">
                        ${result.files.length} files
                    </span>
                `;
            } else {
                badgeHtml = `<span style="font-size: 11px; color: var(--success); font-weight: bold; display: flex; align-items: center; gap: 4px;">✓ Up-to-date</span>`;
            }

            card.innerHTML = `
                <div class="compare-card-header" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: ${headerBg}; cursor: pointer;" onclick="toggleCompareCard('${result.name}')">
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <span style="font-weight: 700; font-size: 15px; color: ${nameColor};">📦 ${result.name}</span>
                        <span class="branch-tag" style="font-size: 10px; opacity: 0.8; font-family: var(--font-mono);">branch: ${result.local_branch}</span>
                        ${hasError ? `<span style="font-size: 10px; color: var(--error); background: rgba(231, 76, 60, 0.08); border: 1px solid rgba(231, 76, 60, 0.2); padding: 1px 6px; border-radius: 4px;">⚠️ ${result.error}</span>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${badgeHtml}
                        <span id="compare-caret-${result.name}" style="font-size: 11px; color: var(--text-dim); transition: transform 0.2s;">${isExpanded ? '▼' : '▶'}</span>
                    </div>
                </div>
                <div id="compare-body-${result.name}" style="display: ${isExpanded ? 'flex' : 'none'}; border-top: 1px solid var(--border); padding: 16px; gap: 20px; background: var(--bg-body); flex-direction: row; flex-wrap: wrap;">
                    <!-- Commits & Files columns will be appended here -->
                </div>
            `;

            const body = card.querySelector(`#compare-body-${result.name}`);
            if (hasError) {
                body.innerHTML = `<div style="color: var(--error); font-size: 12px; width: 100%; text-align: center; padding: 12px;">Unable to compare: ${result.error}</div>`;
            } else if (hasDiff) {
                body.innerHTML = `
                    <!-- Commits Column -->
                    <div style="flex: 1.2; display: flex; flex-direction: column; gap: 8px; min-width: 280px;">
                        <div class="label" style="color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-bottom: 4px; font-size: 11px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; text-transform: uppercase; letter-spacing: 0.5px;">
                            <span>🆕 COMMITS TO BE DEPLOYED</span>
                            <span style="font-size: 10px; background: var(--bg-card); border: 1px solid var(--border); padding: 1px 6px; border-radius: 10px;">${result.commits.length}</span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto; padding-right: 4px;">
                            ${result.commits.map(commit => `
                                <div style="padding: 8px 12px; background: var(--bg-hover); border: 1px solid var(--border); border-radius: 8px; font-size: 12px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-family: var(--font-mono); font-size: 11px; font-weight: bold;">
                                        <span style="color: var(--accent);">${commit.hash}</span>
                                        <span style="font-size: 10px; opacity: 0.6; font-weight: normal;">${commit.date}</span>
                                    </div>
                                    <div style="font-weight: 600; color: var(--text-main); margin-bottom: 4px; word-break: break-word;">${commit.subject}</div>
                                    <div style="font-size: 10px; opacity: 0.5;">by ${commit.author}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <!-- Files Column -->
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 220px;">
                        <div class="label" style="color: #3498db; border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-bottom: 4px; font-size: 11px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; text-transform: uppercase; letter-spacing: 0.5px;">
                            <span>📂 CHANGED FILES</span>
                            <span style="font-size: 10px; background: var(--bg-card); border: 1px solid var(--border); padding: 1px 6px; border-radius: 10px;">${result.files.length}</span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 6px; max-height: 250px; overflow-y: auto; padding-right: 4px;">
                            ${result.files.map(file => {
                                let bCol = '#f1c40f';
                                if (file.status === 'Added') bCol = '#2ecc71';
                                else if (file.status === 'Deleted') bCol = '#e74c3c';
                                else if (file.status === 'Renamed') bCol = '#3498db';

                                return `
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: var(--bg-hover); border: 1px solid var(--border); border-radius: 6px; font-family: var(--font-mono); font-size: 11px;">
                                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; margin-right: 8px; color: var(--text-main);" title="${file.path}">${file.path}</span>
                                        <span style="font-size: 9px; font-weight: bold; text-transform: uppercase; padding: 2px 5px; border-radius: 4px; background: ${bCol}15; color: ${bCol}; border: 1px solid ${bCol}30; letter-spacing: 0.5px;">${file.status}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            } else {
                body.style.display = 'none';
            }

            container.appendChild(card);
        });

        if (compareFocusedService) {
            setTimeout(() => {
                const cardEl = Array.from(container.children).find(child => child.querySelector('.compare-card-header').innerText.includes(compareFocusedService));
                if (cardEl) {
                    cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 120);
        }
    } catch (err) {
        container.innerHTML = `<div style="color: var(--error); padding: 20px; text-align: center;">Error: ${err.message}</div>`;
    }
}

function onCompareTargetChange() {
    loadCompareData();
}

function proceedToDeployFromCompare() {
    closeCompareModal();
    runDeploy();
}

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
    if (!selectedService) { 
        btn.disabled = true; 
        btn.innerText = 'Select a service'; 
        const btnCompare = document.getElementById('btn-compare');
        if (btnCompare) btnCompare.style.display = 'none';
        return; 
    }
    
    let hasScript = false;
    if (currentEnv === 'Development') hasScript = selectedService.has_dev;
    else if (currentEnv === 'Staging') hasScript = selectedService.has_stg;
    else if (currentEnv === 'Production') hasScript = selectedService.has_prod;

    const isDeploying = activeDeployments[selectedService.name] && activeDeployments[selectedService.name].status === 'running';
    btn.disabled = !hasScript || isDeploying; 
    btn.innerText = isDeploying ? 'Deploying...' : '🚀 Run Deploy';

    const btnCompare = document.getElementById('btn-compare');
    if (btnCompare) {
        if (!hasScript || isDeploying) {
            btnCompare.style.display = 'none';
        } else {
            btnCompare.style.display = (currentEnv === 'Staging' || currentEnv === 'Production') ? 'inline-block' : 'none';
        }
    }
}

function runDeploy() {
    if (!selectedService) return;
    
    const isDeploying = activeDeployments[selectedService.name] && activeDeployments[selectedService.name].status === 'running';
    if (isDeploying) return;

    if (currentEnv === 'Production') {
        showPasswordPrompt("Production Deployment", 
            `Confirm deployment of <b>${selectedService.name}</b> to <b>PRODUCTION</b>. Please enter the production password:`, 
            (pwd) => {
                executeDeploy(pwd);
            });
        return;
    }

    if (currentEnv === 'Staging' && selectedService.branch !== 'staging') {
        showConfirm("Staging Deployment Warning",
            `You are attempting to deploy branch "${selectedService.branch}" to STAGING. Usually, only the "staging" branch is allowed. Proceed anyway?`,
            () => { executeDeploy(); });
        return;
    }
    executeDeploy();
}

function executeDeploy(password = '') {
    if (!selectedService) return;
    executeDeployFromModal(selectedService, currentEnv, document.getElementById('deploy-msg').value, password);
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
    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px; color: var(--text-dim);">Loading folders...</td></tr>';
    
    try {
        const foldersRes = await fetch('/api/workspace-folders');
        const workspaceFolders = foldersRes.ok ? await foldersRes.json() : [];
        
        tbody.innerHTML = '';
        
        const renderedIndices = new Set();
        const configuredServices = settings.services || [];
        
        // 1. Group/render configs that match workspace folders
        workspaceFolders.forEach(folder => {
            const matchedConfigs = configuredServices.filter((cfg, idx) => {
                if (cfg.folder === folder) {
                    renderedIndices.add(idx);
                    return true;
                }
                return false;
            });
            
            if (matchedConfigs.length > 0) {
                matchedConfigs.forEach(cfg => {
                    createDeploymentRow(tbody, folder, cfg.name, cfg.dev_cmd, cfg.stg_cmd, cfg.prod_cmd, cfg.prod_password_hash, cfg.pre_deploy_cmd, cfg.enabled !== false, cfg.show_production === true);
                });
            } else {
                let suggestedName = folder;
                if (settings.folder_aliases && settings.folder_aliases[folder]) {
                    suggestedName = settings.folder_aliases[folder];
                }
                // New folders are enabled by default
                createDeploymentRow(tbody, folder, suggestedName, '', '', '', '', '', true, false);
            }
        });
        
        // 2. Render any remaining custom service configs that did not match a folder
        configuredServices.forEach((cfg, idx) => {
            if (!renderedIndices.has(idx)) {
                createDeploymentRow(tbody, cfg.folder, cfg.name, cfg.dev_cmd, cfg.stg_cmd, cfg.prod_cmd, cfg.prod_password_hash, cfg.pre_deploy_cmd, cfg.enabled !== false, cfg.show_production === true);
            }
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px; color: var(--error);">Error loading workspace folders.</td></tr>';
    }
}

function createDeploymentRow(tbody, folder, name, devCmd, stgCmd, prodCmd, prodPwd, preDeployCmd, enabled, showProduction) {
    const tr = document.createElement('tr');
    tr.className = 'deployment-config-row';
    tr.style.borderBottom = '1px solid var(--border)';
    
    tr.innerHTML = `
        <td style="padding: 6px 10px; text-align: center;">
            <input type="checkbox" class="row-enabled" ${enabled ? 'checked' : ''} style="width: 16px; height: 16px;">
        </td>
        <td style="padding: 6px 10px;">
            <input type="text" class="row-folder" value="${folder}" placeholder="Folder Name" style="width: 100%; font-size: 11px; padding: 6px 8px; font-family: var(--font-mono); background: var(--bg-body); border: 1px solid var(--border); border-radius: 4px; color: var(--text-main);">
        </td>
        <td style="padding: 6px 10px;">
            <input type="text" class="row-name" value="${name}" placeholder="Service Name" style="width: 100%; font-size: 11px; padding: 6px 8px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 4px; color: var(--text-main);">
        </td>
        <td style="padding: 6px 10px;">
            <input type="text" class="row-dev-cmd" value="${devCmd || ''}" placeholder="Dev Script" style="width: 100%; font-size: 11px; padding: 6px 8px; font-family: var(--font-mono); background: var(--bg-body); border: 1px solid var(--border); border-radius: 4px; color: var(--text-main);">
        </td>
        <td style="padding: 6px 10px;">
            <input type="text" class="row-stg-cmd" value="${stgCmd || ''}" placeholder="Stg Script" style="width: 100%; font-size: 11px; padding: 6px 8px; font-family: var(--font-mono); background: var(--bg-body); border: 1px solid var(--border); border-radius: 4px; color: var(--text-main);">
        </td>
        <td style="padding: 6px 10px; text-align: center;">
            <input type="checkbox" class="row-show-prod" ${showProduction ? 'checked' : ''} style="width: 16px; height: 16px;" onchange="toggleRowProd(this)">
        </td>
        <td style="padding: 6px 10px;">
            <input type="text" class="row-prod-cmd" value="${prodCmd || ''}" placeholder="Prod Script" style="width: 100%; font-size: 11px; padding: 6px 8px; font-family: var(--font-mono); background: var(--bg-body); border: 1px solid var(--border); border-radius: 4px; color: var(--text-main); ${showProduction ? '' : 'opacity: 0.5;'}" ${showProduction ? '' : 'disabled'}>
        </td>
        <td style="padding: 6px 10px;">
            <input type="password" class="row-prod-pwd" value="${prodPwd || ''}" placeholder="Password" style="width: 100%; font-size: 11px; padding: 6px 8px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 4px; color: var(--text-main); ${showProduction ? '' : 'opacity: 0.5;'}" ${showProduction ? '' : 'disabled'}>
        </td>
        <td style="padding: 6px 10px;">
            <input type="text" class="row-pre-deploy-cmd" value="${preDeployCmd || ''}" placeholder="Pre-deploy" style="width: 100%; font-size: 11px; padding: 6px 8px; font-family: var(--font-mono); background: var(--bg-body); border: 1px solid var(--border); border-radius: 4px; color: var(--text-main);">
        </td>
        <td style="padding: 6px 10px; text-align: center;">
            <button type="button" onclick="this.closest('tr').remove()" style="color: var(--error); border: none; background: transparent; padding: 2px 6px; font-size: 14px; cursor: pointer;" title="Remove row">🗑️</button>
        </td>
    `;
    tbody.appendChild(tr);
}

function toggleRowProd(chk) {
    const row = chk.closest('tr');
    const prodCmdInput = row.querySelector('.row-prod-cmd');
    const prodPwdInput = row.querySelector('.row-prod-pwd');
    if (chk.checked) {
        prodCmdInput.removeAttribute('disabled');
        prodCmdInput.style.opacity = '1';
        prodPwdInput.removeAttribute('disabled');
        prodPwdInput.style.opacity = '1';
    } else {
        prodCmdInput.setAttribute('disabled', 'true');
        prodCmdInput.style.opacity = '0.5';
        prodPwdInput.setAttribute('disabled', 'true');
        prodPwdInput.style.opacity = '0.5';
    }
}

function addCustomServiceRow() {
    const tbody = document.getElementById('deployment-config-tbody');
    createDeploymentRow(tbody, '', '', '', '', '', '', '', true, false);
}

async function openSettings() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'flex';

    try {
        const res = await fetch('/api/settings');
        settings = await res.json();
        
        const setWs = document.getElementById('set-ws');
        const setGit = document.getElementById('set-git');
        const setName = document.getElementById('set-name');
        const setPre = document.getElementById('set-pre');
        const setDevUrl = document.getElementById('set-dev-url');
        const setStgUrl = document.getElementById('set-stg-url');
        const setProdUrl = document.getElementById('set-prod-url');

        if (setWs) setWs.value = settings.workspace_url;
        if (setGit) setGit.value = settings.git_bash_path;
        if (setName) setName.value = settings.user_name;
        if (setPre) setPre.value = settings.pre_deploy_cmd;
        if (setDevUrl) setDevUrl.value = settings.dev_agent_url || '';
        if (setStgUrl) setStgUrl.value = settings.stg_agent_url || '';
        if (setProdUrl) setProdUrl.value = settings.prod_agent_url || '';

        switchConfigTheme(document.body.classList.contains('light-theme') ? 'light' : 'dark');
        switchSettingsTab('core');
    } catch (err) {
        console.error("Failed to load settings:", err);
    }
}

function closeSettings() { document.getElementById('modal-overlay').style.display = 'none'; }

async function saveSettings() {
    let services = settings.services || [];
    const tbody = document.getElementById('deployment-config-tbody');
    if (tbody && tbody.children.length > 0 && tbody.querySelector('.row-folder')) {
        services = [];
        document.querySelectorAll('.deployment-config-row').forEach(row => {
            const enabled = row.querySelector('.row-enabled').checked;
            const folder = row.querySelector('.row-folder').value.trim();
            const name = row.querySelector('.row-name').value.trim();
            const dev_cmd = row.querySelector('.row-dev-cmd').value.trim();
            const stg_cmd = row.querySelector('.row-stg-cmd').value.trim();
            const show_production = row.querySelector('.row-show-prod').checked;
            const prod_cmd = row.querySelector('.row-prod-cmd').value.trim();
            const prod_password_hash = row.querySelector('.row-prod-pwd').value;
            const pre_deploy_cmd = row.querySelector('.row-pre-deploy-cmd').value.trim();
            
            if (folder && name) {
                services.push({
                    enabled: enabled,
                    folder: folder,
                    name: name,
                    dev_cmd: dev_cmd,
                    stg_cmd: stg_cmd,
                    show_production: show_production,
                    prod_cmd: prod_cmd,
                    prod_password_hash: prod_password_hash,
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
        prod_agent_url: document.getElementById('set-prod-url').value,
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
        closeMultiDeployModal();
        closeMultiDeployLogsModal();
        return;
    }

    // Ctrl + Alt + Shift + M -> Fast Multi Deploy
    if (e.ctrlKey && e.altKey && e.shiftKey && e.code === 'KeyM') {
        e.preventDefault();
        e.stopPropagation();
        runFastMultiDeploy();
        return;
    }

    // Shortcuts with Alt + Shift (to avoid browser conflicts)
    if (e.altKey && e.shiftKey && !e.ctrlKey) {
        switch (e.code) {
            case 'KeyM': openMultiDeployModal(); break;
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
            case 'KeyQ': switchGitTab('branches'); break;
            case 'KeyW': switchGitTab('commits'); break;
            case 'KeyE': switchGitTab('stash'); break;
            case 'KeyU': toggleVPNManagement(); break;
            case 'Digit1': setEnv('Development'); break;
            case 'Digit2': setEnv('Staging'); break;
            case 'Digit3': setEnv('Production'); break;
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
        'Staging': settings.stg_agent_url,
        'Production': settings.prod_agent_url
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
    const statLatency = document.getElementById('vpn-stat-latency');

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
    if (statLatency) {
        statLatency.textContent = state.latency || '--';
    }

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

let term = null;
let fitAddon = null;
let termSocket = null;
let currentTerminalService = null;
let terminalSnippets = [];
let currentTerminalView = 'pty';

function switchTerminalView(view) {
    currentTerminalView = view;
    const ptyContainer = document.getElementById('terminal');
    const deployContainer = document.getElementById('terminal-deploy');
    const pwdDisplay = document.getElementById('terminal-pwd-display');
    const btnPty = document.getElementById('tab-btn-pty');
    const btnDeploy = document.getElementById('tab-btn-deploy');
    const snippetBar = document.getElementById('terminal-snippet-bar');

    if (view === 'pty') {
        if (ptyContainer) ptyContainer.style.display = 'block';
        if (deployContainer) deployContainer.style.display = 'none';
        if (pwdDisplay) pwdDisplay.style.display = 'inline-block';
        if (snippetBar) snippetBar.style.display = 'flex';

        if (btnPty) {
            btnPty.style.background = 'var(--accent)';
            btnPty.style.color = '#000';
        }
        if (btnDeploy) {
            btnDeploy.style.background = 'transparent';
            btnDeploy.style.color = 'var(--text-dim)';
        }

        if (fitAddon) {
            setTimeout(() => fitAddon.fit(), 50);
        }
    } else {
        if (ptyContainer) ptyContainer.style.display = 'none';
        if (deployContainer) deployContainer.style.display = 'block';
        if (pwdDisplay) pwdDisplay.style.display = 'none';
        if (snippetBar) snippetBar.style.display = 'none';

        if (btnDeploy) {
            btnDeploy.style.background = 'var(--accent)';
            btnDeploy.style.color = '#000';
        }
        if (btnPty) {
            btnPty.style.background = 'transparent';
            btnPty.style.color = 'var(--text-dim)';
        }
    }
}

function initTerminal() {
    const termElem = document.getElementById('terminal');
    if (!termElem) return;

    if (window.Terminal) {
        termElem.innerHTML = '';
        term = new Terminal({
            cursorBlink: true,
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            theme: {
                background: '#07090e',
                foreground: '#e0e0e0',
                cursor: '#00ffaa',
                selectionBackground: 'rgba(255, 255, 255, 0.2)',
                black: '#000000',
                red: '#ff5f56',
                green: '#27c93f',
                yellow: '#ffbd2e',
                blue: '#007acc',
                magenta: '#bc13fe',
                cyan: '#00d3a7',
                white: '#ffffff'
            }
        });

        if (window.FitAddon && window.FitAddon.FitAddon) {
            fitAddon = new window.FitAddon.FitAddon();
            term.loadAddon(fitAddon);
        }

        term.open(termElem);
        if (fitAddon) {
            setTimeout(() => fitAddon.fit(), 100);
        }

        term.onData(data => {
            if (termSocket && termSocket.readyState === WebSocket.OPEN) {
                termSocket.send(JSON.stringify({ type: 'input', data: data }));
            }
        });

        window.addEventListener('resize', () => {
            if (fitAddon) fitAddon.fit();
            if (termSocket && termSocket.readyState === WebSocket.OPEN && term) {
                termSocket.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
            }
        });
    }

    fetchSnippets();
}

function updatePwdDisplay(path) {
    const pwdElem = document.getElementById('pwd-path');
    const pwdContainer = document.getElementById('terminal-pwd-display');
    if (!pwdElem) return;
    
    let displayPath = path || '~';
    if (path && path.startsWith('/home/thang')) {
        displayPath = '~' + path.slice('/home/thang'.length);
    }
    pwdElem.innerText = displayPath;
    if (pwdContainer) {
        pwdContainer.title = `Current Working Directory: ${path}`;
    }
}

function connectTerminalWS(svcName) {
    if (!svcName) return;
    if (currentTerminalService === svcName && termSocket && (termSocket.readyState === WebSocket.OPEN || termSocket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    if (termSocket) {
        try { termSocket.close(); } catch (e) {}
        termSocket = null;
    }

    currentTerminalService = svcName;
    const statusSpan = document.getElementById('terminal-status');
    if (statusSpan) {
        statusSpan.innerText = 'connecting...';
        statusSpan.style.color = 'var(--accent)';
    }

    if (term) {
        term.reset();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/terminal/ws/${encodeURIComponent(svcName)}`;

    try {
        termSocket = new WebSocket(wsUrl);

        termSocket.onopen = () => {
            if (statusSpan) {
                statusSpan.innerText = 'connected (pty)';
                statusSpan.style.color = '#27c93f';
            }
            if (term && fitAddon) {
                fitAddon.fit();
                termSocket.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
            }
        };

        fetch(`/api/terminal/cwd/${encodeURIComponent(svcName)}`)
            .then(res => res.json())
            .then(data => { if (data.cwd) updatePwdDisplay(data.cwd); })
            .catch(() => {});

        termSocket.onmessage = (event) => {
            if (typeof event.data === 'string' && event.data.includes('"cwd"')) {
                try {
                    const parsed = JSON.parse(event.data);
                    if (parsed.path) {
                        updatePwdDisplay(parsed.path);
                        return;
                    }
                } catch (e) {}
            }
            if (term) {
                term.write(event.data);
            }
        };

        termSocket.onerror = (err) => {
            console.error('[WS Terminal Error]', err);
            if (statusSpan) {
                statusSpan.innerText = 'error';
                statusSpan.style.color = 'var(--error)';
            }
        };

        termSocket.onclose = () => {
            if (statusSpan) {
                statusSpan.innerText = 'disconnected';
                statusSpan.style.color = 'var(--text-dim)';
            }
        };
    } catch (e) {
        console.error('[WS Terminal Exception]', e);
    }
}

async function fetchSnippets() {
    try {
        const res = await fetch('/api/terminal/snippets');
        if (res.ok) {
            terminalSnippets = await res.json();
            renderSnippetChips();
        }
    } catch (err) {
        console.error('[Fetch Snippets Error]', err);
    }
}

function renderSnippetChips() {
    const container = document.getElementById('snippet-chips');
    if (!container) return;
    container.innerHTML = '';

    terminalSnippets.forEach((snippet, index) => {
        const chip = document.createElement('div');
        chip.style.cssText = `
            display: inline-flex; align-items: center; background: rgba(0, 211, 167, 0.08);
            border: 1px solid rgba(0, 211, 167, 0.25); border-radius: 4px; padding: 2px 8px;
            font-family: var(--font-mono); font-size: 11px; color: var(--accent);
            cursor: pointer; transition: all 0.15s ease; white-space: nowrap; user-select: none;
        `;
        chip.onmouseover = () => { chip.style.background = 'rgba(0, 211, 167, 0.2)'; };
        chip.onmouseout = () => { chip.style.background = 'rgba(0, 211, 167, 0.08)'; };
        
        chip.innerHTML = `
            <span onclick="runSnippet('${snippet.replace(/'/g, "\\'")}')" style="margin-right: 4px;">${snippet}</span>
            <span onclick="deleteSnippet(${index}, event)" style="color: var(--text-dim); font-weight: bold; margin-left: 4px; opacity: 0.6;" title="Remove snippet">&times;</span>
        `;
        container.appendChild(chip);
    });
}

function runSnippet(cmd) {
    if (termSocket && termSocket.readyState === WebSocket.OPEN) {
        termSocket.send(JSON.stringify({ type: 'input', data: cmd + '\r' }));
    } else if (selectedService) {
        runTerminalCommand(selectedService.name, cmd);
    } else {
        showAlert('Info', 'Please select a service first.');
    }
}

async function addCustomSnippet() {
    const snippet = prompt('Enter quick command snippet (e.g. go test ./...):');
    if (!snippet || !snippet.trim()) return;
    const clean = snippet.trim();
    if (!terminalSnippets.includes(clean)) {
        terminalSnippets.push(clean);
        await saveSnippets();
    }
}

async function deleteSnippet(index, event) {
    if (event) event.stopPropagation();
    terminalSnippets.splice(index, 1);
    await saveSnippets();
}

async function saveSnippets() {
    renderSnippetChips();
    try {
        await fetch('/api/terminal/snippets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ snippets: terminalSnippets })
        });
    } catch (err) {
        console.error('[Save Snippets Error]', err);
    }
}

function handleTerminalCommand(event) {
    if (event.key !== 'Enter') return;
    const input = event.target;
    const cmd = input.value.trim();
    if (!cmd) return;
    
    if (!selectedService) {
        showAlert('Error', 'Please select a service first.');
        return;
    }
    
    input.value = '';
    runTerminalCommand(selectedService.name, cmd);
}

function runTerminalCommand(svcName, cmd) {
    if (termSocket && termSocket.readyState === WebSocket.OPEN) {
        termSocket.send(JSON.stringify({ type: 'input', data: cmd + '\r' }));
        return;
    }

    const statusSpan = document.getElementById('terminal-status');
    if (statusSpan) {
        statusSpan.innerText = 'running...';
        statusSpan.style.color = 'var(--accent)';
    }

    fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            service_name: svcName, 
            command: cmd
        })
    }).then(response => {
        if (!response.ok) {
            response.text().then(text => {
                if (term) term.writeln(`\r\n\x1b[31mError: ${text}\x1b[0m`);
                if (statusSpan) {
                    statusSpan.innerText = 'failed';
                    statusSpan.style.color = 'var(--error)';
                }
            });
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        function read() {
            reader.read().then(({ done, value }) => {
                if (done) {
                    if (statusSpan) {
                        statusSpan.innerText = 'idle';
                        statusSpan.style.color = 'var(--text-dim)';
                    }
                    return;
                }

                const chunk = decoder.decode(value, { stream: true });
                chunk.split('\n\n').forEach(event => {
                    const trimmed = event.trimStart();
                    if (trimmed.startsWith('data: ')) {
                        const content = trimmed.slice(6);
                        if (content.trim() === '[EOF]') {
                            if (statusSpan) {
                                statusSpan.innerText = 'idle';
                                statusSpan.style.color = 'var(--text-dim)';
                            }
                            return;
                        }
                        if (term) term.write(content + '\r\n');
                    }
                });
                read();
            });
        }
        read();
    }).catch(err => {
        if (term) term.writeln(`\r\n\x1b[31mConnection Error: ${err.message}\x1b[0m`);
        if (statusSpan) {
            statusSpan.innerText = 'failed';
            statusSpan.style.color = 'var(--error)';
        }
    });
}

async function toggleStashPreview(idx, rowElement) {
    let previewDiv = rowElement.querySelector('.stash-preview-container');
    if (previewDiv) {
        if (previewDiv.style.display === 'none') {
            previewDiv.style.display = 'block';
        } else {
            previewDiv.style.display = 'none';
        }
        return;
    }

    previewDiv = document.createElement('div');
    previewDiv.className = 'stash-preview-container';
    previewDiv.style.cssText = 'width: 100%; border-top: 1px solid var(--border); margin-top: 10px; padding-top: 10px; display: flex; flex-direction: column; gap: 6px;';
    previewDiv.innerHTML = '<div class="shimmer" style="height: 30px"></div>';
    rowElement.appendChild(previewDiv);

    try {
        const res = await fetch(`/api/git/stash-show/${selectedService.name}?stash_ref=stash@{${idx}}`);
        if (!res.ok) {
            throw new Error(await res.text());
        }
        const files = await res.json();
        
        previewDiv.innerHTML = '';
        if (files.length === 0) {
            previewDiv.innerHTML = '<div style="font-size: 11px; color: var(--text-dim);">No files changed in this stash.</div>';
            return;
        }

        files.forEach(file => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; font-family: var(--font-mono); font-size: 11px; cursor: pointer; transition: background 0.2s;';
            item.title = "Click to view diff";
            item.onmouseover = () => item.style.background = 'var(--bg-hover)';
            item.onmouseout = () => item.style.background = 'var(--bg-card)';
            
            let statusColor = '#f1c40f';
            let statusBg = 'rgba(241, 196, 15, 0.1)';
            if (file.status === 'Added') {
                statusColor = '#2ecc71';
                statusBg = 'rgba(46, 204, 113, 0.1)';
            } else if (file.status === 'Deleted') {
                statusColor = '#e74c3c';
                statusBg = 'rgba(231, 76, 60, 0.1)';
            }

            item.innerHTML = `
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; margin-right: 8px; color: var(--text-main);">${file.path}</span>
                <span style="font-size: 9px; font-weight: bold; text-transform: uppercase; padding: 2px 5px; border-radius: 4px; color: ${statusColor}; background: ${statusBg}; border: 1px solid ${statusColor}40; letter-spacing: 0.5px;">${file.status}</span>
            `;
            
            item.onclick = (e) => {
                e.stopPropagation();
                viewStashFileDiff(idx, file.path);
            };
            previewDiv.appendChild(item);
        });
    } catch (err) {
        previewDiv.innerHTML = `<div style="font-size: 11px; color: var(--error);">Failed to load stash preview: ${err.message}</div>`;
    }
}

async function viewStashFileDiff(idx, filePath) {
    const modal = document.getElementById('diff-viewer-modal');
    const title = document.getElementById('diff-viewer-title');
    const body = document.getElementById('diff-viewer-body');
    
    if (!modal || !title || !body) return;
    
    title.textContent = `${filePath} (stash@{${idx}})`;
    body.innerHTML = '<div class="shimmer" style="height: 100px"></div>';
    modal.style.display = 'flex';
    
    try {
        const res = await fetch(`/api/git/stash-diff/${selectedService.name}?stash_ref=stash@{${idx}}&file_path=${encodeURIComponent(filePath)}`);
        if (!res.ok) {
            throw new Error(await res.text());
        }
        const diffText = await res.text();
        
        if (!diffText.trim()) {
            body.innerHTML = '<div style="color: var(--text-dim); text-align: center; padding: 20px;">No differences or binary file.</div>';
            return;
        }

        const lines = diffText.split('\n');
        const colorized = lines.map(line => {
            let color = 'inherit';
            let bg = 'transparent';
            if (line.startsWith('+') && !line.startsWith('+++')) {
                color = '#2ecc71';
                bg = 'rgba(46, 204, 113, 0.05)';
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                color = '#e74c3c';
                bg = 'rgba(231, 76, 60, 0.05)';
            } else if (line.startsWith('@@')) {
                color = '#9b59b6';
            } else if (line.startsWith('diff') || line.startsWith('index') || line.startsWith('---') || line.startsWith('+++')) {
                color = 'var(--text-dim)';
                bg = 'rgba(255, 255, 255, 0.02)';
            }
            return `<div style="color: ${color}; background: ${bg}; padding: 0 4px; min-height: 1.5em; border-radius: 2px;">${escapeHtml(line)}</div>`;
        }).join('');
        
        body.innerHTML = colorized;
    } catch (err) {
        body.innerHTML = `<span style="color: var(--error)">Failed to fetch diff: ${err.message}</span>`;
    }
}

function closeDiffViewerModal() {
    const modal = document.getElementById('diff-viewer-modal');
    if (modal) modal.style.display = 'none';
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
