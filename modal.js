const modelInput = document.getElementById('model-search');
const dropdown = document.getElementById('model-dropdown');
const loader = document.getElementById('model-loader');
const btnCancel = document.getElementById('btn-cancel');
const btnStartChat = document.getElementById('btn-start-chat');
const errorDiv = document.getElementById('modal-error');
const inputInitialMessage = document.getElementById('initial-message');
const dropdownArrow = document.getElementById('dropdown-arrow');

let allModels = [];
let filteredModels = [];
let selectedModel = null;

// --- Fetch models on open
function showLoader(show) {
    loader.style.display = show ? 'block' : 'none';
}
function renderDropdown() {
    dropdown.innerHTML = '';
    if (!filteredModels.length) {
        const li = document.createElement('li');
        li.textContent = 'No models found';
        li.style.color = '#888';
        li.style.cursor = 'default';
        dropdown.appendChild(li);
    } else {
        filteredModels.forEach(m => {
            const li = document.createElement('li');
            li.textContent = m.name;
            if (selectedModel && m.name === selectedModel.name) li.classList.add('selected');
            li.tabIndex = 0;
            li.addEventListener('click', () => {
                selectedModel = m;
                modelInput.value = m.name;
                dropdown.classList.remove('active');
                renderDropdown();
                checkForm();
            });
            li.addEventListener('keydown', e => {
                if ((e.key === 'Enter' || e.key === ' ') && !btnStartChat.disabled) {
                    btnStartChat.click();
                }
            });
            dropdown.appendChild(li);
        });
    }
}

function filterModels() {
    const val = modelInput.value.trim().toLowerCase();
    filteredModels = allModels.filter(m => m.name.toLowerCase().includes(val));
    renderDropdown();
    dropdown.classList.add('active');
    // Reset selection if input not exact
    if (!filteredModels.some(m => m.name === modelInput.value.trim())) {
        selectedModel = null;
        checkForm();
    }
}

// --- Init (load models)
showLoader(true);
window.modalAPI.getModels()
    .then(models => {
        showLoader(false);
        allModels = models;
        filteredModels = [...models];
        renderDropdown();
    })
    .catch(err => {
        showLoader(false);
        errorDiv.textContent = 'Error loading models: ' + (err.message || err);
    });

// --- Dropdown events
modelInput.addEventListener('focus', () => {
    filterModels();
    dropdown.classList.add('active');
});
modelInput.addEventListener('input', filterModels);
modelInput.addEventListener('blur', () => setTimeout(() => dropdown.classList.remove('active'), 130));
dropdownArrow.addEventListener('mousedown', (e) => {
    e.preventDefault();
    modelInput.focus();
    filterModels();
});

// --- Enable start button only if all ok
function checkForm() {
    const msg = inputInitialMessage.value.trim();
    btnStartChat.disabled = !(selectedModel && msg);
}
inputInitialMessage.addEventListener('input', checkForm);

// --- Cancel
btnCancel.addEventListener('click', () => {
    window.modalAPI.close?.();
    window.close();
});

// --- Start Chat
btnStartChat.addEventListener('click', async () => {
    if (!selectedModel) return;
    btnStartChat.disabled = true;
    errorDiv.textContent = '';
    const customText = inputInitialMessage.value.trim() || "Hi!";
    try {
        const chatId = await window.modalAPI.startChat(selectedModel.name, customText);
        window.modalAPI.openChat(chatId);
        window.close();
    } catch (err) {
        errorDiv.textContent = 'Error creating chat: ' + (err.message || err);
        btnStartChat.disabled = false;
    }
});