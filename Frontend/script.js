const API_BASE_URL = (window.SMART_CROP_API_URL || 'https://crop-disease-detection-zfez.onrender.com').replace(/\/$/, '');

function setStatus(element, message, type = '') {
    if (!element) return;
    element.textContent = message;
    element.className = `status${type ? ` ${type}` : ''}`;
}

function setLoading(button, loading, label) {
    button.disabled = loading;
    button.classList.toggle('is-loading', loading);
    if (loading) button.dataset.label = button.textContent;
    button.childNodes[0].textContent = loading ? label : (button.dataset.label || label);
}

async function readJsonResponse(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const values = Object.values(data).flat().filter(Boolean);
        throw new Error(data.detail || data.error || values.join(' ') || 'Something went wrong. Please try again.');
    }
    return data;
}

function clearErrors(form) {
    form.querySelectorAll('.field-error').forEach((element) => { element.textContent = ''; });
    form.querySelectorAll('[aria-invalid="true"]').forEach((element) => element.removeAttribute('aria-invalid'));
}

function showError(inputId, message) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(`${inputId}Error`);
    if (input) input.setAttribute('aria-invalid', 'true');
    if (error) error.textContent = message;
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearErrors(loginForm);
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const status = document.getElementById('loginStatus');
        const button = loginForm.querySelector('button[type="submit"]');
        if (!username) showError('username', 'Enter your username or email.');
        if (!password) showError('password', 'Enter your password.');
        if (!username || !password) {
            setStatus(status, 'Please complete the highlighted fields.', 'error');
            return;
        }
        setLoading(button, true, 'Signing in');
        setStatus(status, 'Checking your account…');
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await readJsonResponse(response);
            localStorage.setItem('smartCropAccessToken', data.access);
            localStorage.setItem('smartCropRefreshToken', data.refresh);
            window.location.href = 'landing.html';
        } catch (error) {
            setStatus(status, error.message, 'error');
            setLoading(button, false, 'Log in');
        }
    });
}

const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearErrors(signupForm);
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const status = document.getElementById('signupStatus');
        const button = signupForm.querySelector('button[type="submit"]');
        let valid = true;
        if (username.length < 3) { showError('username', 'Use at least 3 characters.'); valid = false; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('email', 'Enter a valid email address.'); valid = false; }
        if (password.length < 6) { showError('password', 'Use at least 6 characters.'); valid = false; }
        if (!valid) { setStatus(status, 'Please correct the highlighted fields.', 'error'); return; }
        setLoading(button, true, 'Creating account');
        setStatus(status, 'Setting up your account…');
        try {
            await readJsonResponse(await fetch(`${API_BASE_URL}/api/auth/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            }));
            setStatus(status, 'Account created. Taking you to login…', 'success');
            window.setTimeout(() => { window.location.href = 'index.html'; }, 700);
        } catch (error) {
            setStatus(status, error.message, 'error');
            setLoading(button, false, 'Create account');
        }
    });
}

const logoutLink = document.getElementById('logoutLink');
if (logoutLink) {
    logoutLink.addEventListener('click', () => {
        localStorage.removeItem('smartCropAccessToken');
        localStorage.removeItem('smartCropRefreshToken');
    });
}

const predictionForm = document.getElementById('predictionForm');
if (predictionForm) {
    const token = localStorage.getItem('smartCropAccessToken');
    const status = document.getElementById('predictionStatus');
    const fileInput = document.getElementById('leafImage');
    const dropZone = document.getElementById('dropZone');
    const preview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');
    const previewName = document.getElementById('previewName');
    const previewSize = document.getElementById('previewSize');
    const submitButton = predictionForm.querySelector('button[type="submit"]');

    if (!token) {
        window.location.href = 'index.html';
    } else {
        function showPreview(file) {
            if (!file || !file.type.startsWith('image/')) return;
            previewImage.src = URL.createObjectURL(file);
            previewName.textContent = file.name;
            previewSize.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
            preview.classList.add('visible');
            setStatus(status, '');
        }
        fileInput.addEventListener('change', () => showPreview(fileInput.files[0]));
        ['dragenter', 'dragover'].forEach((eventName) => dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.add('dragging');
        }));
        ['dragleave', 'drop'].forEach((eventName) => dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.remove('dragging');
        }));
        dropZone.addEventListener('drop', (event) => {
            const [file] = event.dataTransfer.files;
            if (file) {
                const transfer = new DataTransfer();
                transfer.items.add(file);
                fileInput.files = transfer.files;
                showPreview(file);
            }
        });
        predictionForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!fileInput.files.length) {
                setStatus(status, 'Choose a leaf image before starting the scan.', 'error');
                return;
            }
            setLoading(submitButton, true, 'Analyzing');
            setStatus(status, 'Analyzing your leaf image… This may take a moment.');
            try {
                const response = await fetch(`${API_BASE_URL}/detection/api/predict/`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: new FormData(predictionForm)
                });
                const data = await readJsonResponse(response);
                setStatus(status, `${data.prediction} · ${Number(data.confidence).toFixed(2)}% confidence`, 'success');
            } catch (error) {
                setStatus(status, error.message, 'error');
            } finally {
                setLoading(submitButton, false, 'Analyze my leaf');
            }
        });
    }
}
