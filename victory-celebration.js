const VICTORY_EMOJIS = [
    "🐱",
    "🐰",
    "🦝",
    "🪳",
    "🐻",
    "🐸",
    "🦊",
    "🐹",
    "🦁",
    "🐧",
    "🦔",
    "🐙",
    "🦄",
    "🐝",
    "🦋",
    "🐨",
    "🦥",
    "🦆",
    "🐷",
    "🐺",
];
const GRAVITY = 0.42;
const BOUNCE_DAMPING = 0.72;
const FRICTION = 0.985;
const SPAWN_INTERVAL_MS = 110;
const MAX_PARTICLES = 52;
const PARTICLE_SIZE_REM_MIN = 1.35;
const PARTICLE_SIZE_REM_RANGE = 1.65;
let layerEl = null;
let particles = [];
let rafId = null;
let spawnTimer = null;
let spawnCount = 0;
let running = false;
function pickEmoji() {
    return VICTORY_EMOJIS[Math.floor(Math.random() * VICTORY_EMOJIS.length)];
}
function spawnParticle(width) {
    if (!layerEl) {
        return;
    }
    const el = document.createElement("span");
    el.className = "victory-emoji";
    el.textContent = pickEmoji();
    el.setAttribute("aria-hidden", "true");
    const sizeRem = PARTICLE_SIZE_REM_MIN + Math.random() * PARTICLE_SIZE_REM_RANGE;
    el.style.fontSize = `${sizeRem}rem`;
    layerEl.appendChild(el);
    const half = sizeRem * 8;
    particles.push({
        el,
        x: Math.random() * Math.max(20, width - half * 2) + half,
        y: -40 - Math.random() * 120,
        vx: (Math.random() - 0.5) * 10,
        vy: Math.random() * 3 + 1,
        rotation: Math.random() * 360,
        spin: (Math.random() - 0.5) * 14,
        half,
    });
}
function tick() {
    if (!layerEl || !running) {
        return;
    }
    const { width, height } = layerEl.getBoundingClientRect();
    const floor = height - 28;
    for (const particle of particles) {
        particle.vy += GRAVITY;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.spin;
        particle.vx *= FRICTION;
        const ceiling = particle.half;
        if (particle.y > floor) {
            particle.y = floor;
            particle.vy *= -BOUNCE_DAMPING;
            particle.vx += (Math.random() - 0.5) * 2;
            if (Math.abs(particle.vy) < 1.2) {
                particle.vy = -5 - Math.random() * 4;
            }
        }
        if (particle.x < ceiling) {
            particle.x = ceiling;
            particle.vx = Math.abs(particle.vx) * BOUNCE_DAMPING;
        }
        if (particle.x > width - ceiling) {
            particle.x = width - ceiling;
            particle.vx = -Math.abs(particle.vx) * BOUNCE_DAMPING;
        }
        particle.el.style.transform = `translate3d(${particle.x}px, ${particle.y}px, 0) rotate(${particle.rotation}deg)`;
    }
    rafId = requestAnimationFrame(tick);
}
function scheduleSpawns() {
    if (!running || !layerEl) {
        return;
    }
    const { width } = layerEl.getBoundingClientRect();
    if (spawnCount < MAX_PARTICLES && width > 0) {
        spawnParticle(width);
        spawnCount += 1;
    }
    if (spawnCount < MAX_PARTICLES) {
        spawnTimer = window.setTimeout(scheduleSpawns, SPAWN_INTERVAL_MS);
    }
}
function spawnStaticBackdrop(layer) {
    layer.textContent = "";
    const emojis = ["🐱", "🐰", "🦝", "🏆", "🪳", "🐻"];
    for (let i = 0; i < emojis.length; i++) {
        const el = document.createElement("span");
        el.className = "victory-emoji victory-emoji-static";
        el.textContent = emojis[i];
        el.style.left = `${12 + i * 14}%`;
        el.style.bottom = `${8 + (i % 3) * 6}%`;
        el.style.fontSize = `${1.5 + (i % 2) * 0.5}rem`;
        layer.appendChild(el);
    }
}
export function startVictoryCelebration(layer) {
    stopVictoryCelebration(layer);
    layer.classList.remove("hidden");
    layerEl = layer;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        spawnStaticBackdrop(layer);
        return;
    }
    layer.textContent = "";
    particles = [];
    spawnCount = 0;
    running = true;
    scheduleSpawns();
    rafId = requestAnimationFrame(tick);
}
export function stopVictoryCelebration(layer) {
    running = false;
    if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    if (spawnTimer !== null) {
        clearTimeout(spawnTimer);
        spawnTimer = null;
    }
    particles = [];
    spawnCount = 0;
    if (layerEl) {
        layerEl.textContent = "";
        layerEl = null;
    }
    layer?.classList.add("hidden");
}
