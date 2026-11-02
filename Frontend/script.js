// --- Canvas Particle Animation ---
const canvas = document.getElementById('particle-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

let particles = [];
const numParticles = 100;

// Set canvas size and handle window resizing
function resizeCanvas() {
    if (!canvas) return;
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
}

window.addEventListener('resize', resizeCanvas);

// Particle class
class Particle {
    constructor(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    update() {
        this.draw();
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Wall collision
        if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
            this.velocity.x = -this.velocity.x;
        }
        if (this.y + this.radius > canvas.height || this.y - this.radius < 0) {
            this.velocity.y = -this.velocity.y;
        }
    }
}

// Initialize particles
function init() {
    if (!canvas) return;
    particles = [];
    for (let i = 0; i < numParticles; i++) {
        const radius = Math.random() * 2 + 1;
        const x = Math.random() * (canvas.width - radius * 2) + radius;
        const y = Math.random() * (canvas.height - radius * 2) + radius;
        const color = 'rgba(255, 255, 255, 0.8)';
        const velocity = {
            x: (Math.random() - 0.5) * 0.5,
            y: (Math.random() - 0.5) * 0.5
        };
        particles.push(new Particle(x, y, radius, color, velocity));
    }
}

// Connect particles with lines
function connectParticles() {
    let opacityValue = 1;
    for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
            const distance = Math.sqrt(
                Math.pow(particles[a].x - particles[b].x, 2) +
                Math.pow(particles[a].y - particles[b].y, 2)
            );

            if (distance < 100) {
                opacityValue = 1 - (distance / 100);
                const isBlue = a % 3 === 0;
                const isGreen = b % 5 === 0;
                let lineColor = 'rgba(255, 255, 255, ' + opacityValue + ')';
                if (isBlue) lineColor = 'rgba(59, 130, 246, ' + opacityValue + ')'; // blue-500
                if (isGreen) lineColor = 'rgba(16, 185, 129, ' + opacityValue + ')'; // green-500

                ctx.strokeStyle = lineColor;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particles[a].x, particles[a].y);
                ctx.lineTo(particles[b].x, particles[b].y);
                ctx.stroke();
            }
        }
    }
}

// Animation loop
function animate() {
    if (!canvas || !ctx) return;
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(particle => {
        particle.update();
    });
    connectParticles();
}

// Initial setup
resizeCanvas();
init();
animate();

const API_BASE_URL = window.SMART_CROP_API_URL || 'https://smart-crop-api.onrender.com';

async function readJsonResponse(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = data.detail || data.error || Object.values(data).flat().join(' ') || 'Request failed.';
        throw new Error(message);
    }
    return data;
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: document.getElementById('username').value.trim(),
                    password: document.getElementById('password').value
                })
            });
            const data = await readJsonResponse(response);
            localStorage.setItem('smartCropAccessToken', data.access);
            localStorage.setItem('smartCropRefreshToken', data.refresh);
            window.location.href = 'landing.html';
        } catch (error) {
            alert(error.message);
        }
    });
}

const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        if (username.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) return;
        try {
            await readJsonResponse(await fetch(`${API_BASE_URL}/api/auth/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            }));
            alert('Account created. Please log in.');
            window.location.href = 'index.html';
        } catch (error) {
            alert(error.message);
        }
    });
}

const predictionForm = document.getElementById('predictionForm');
if (predictionForm) {
    const token = localStorage.getItem('smartCropAccessToken');
    const status = document.getElementById('predictionStatus');
    if (!token) {
        window.location.href = 'index.html';
    } else {
        predictionForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            status.textContent = 'Analyzing image...';
            try {
                const response = await fetch(`${API_BASE_URL}/detection/api/predict/`, {
                    method: 'POST',
                    headers: { Authorization: 'Bearer ' + token },
                    body: new FormData(predictionForm)
                });
                const data = await readJsonResponse(response);
                status.textContent = `${data.prediction} (${Number(data.confidence).toFixed(2)}% confidence)`;
            } catch (error) {
                status.textContent = error.message;
            }
        });
    }
}
