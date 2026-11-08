(function() {
    'use strict';

    // ======== الإعدادات الأساسية ========
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const levelComplete = document.getElementById('levelComplete');
    const scoreEl = document.getElementById('scoreNum');
    const levelEl = document.getElementById('levelNum');
    const finalScoreEl = document.getElementById('finalScore');
    const finalLevelEl = document.getElementById('finalLevel');
    const finalCoinsEl = document.getElementById('finalCoins');
    const progressFill = document.getElementById('progressFill');
    const damageFlash = document.getElementById('damageFlash');
    const muteBtn = document.getElementById('muteBtn');
    const livesDisplay = document.getElementById('livesDisplay');

    let gameState = 'menu';
    let score = 0;
    let level = 1;
    let selectedFish = 'blue';
    let animationId;
    let gameSpeed = 2.5;
    let distance = 0;
    let levelDistance = 4000;
    let lives = 3;
    let maxLives = 3;
    let coinsCollected = 0;
    let invincible = false;
    let invincibleTimer = null;
    let combo = 0;
    let comboTimer = null;

    // ======== أنواع الأسماك ========
    const fishTypes = {
        blue: { color: '#1e90ff', finColor: '#ffd700', speed: 5.5, size: 35 },
        clown: { color: '#ff6b6b', finColor: '#fff', speed: 5, size: 32 },
        yellow: { color: '#ffd700', finColor: '#ff8c00', speed: 6.5, size: 30 },
        shark: { color: '#708090', finColor: '#2f4f4f', speed: 4.5, size: 45 }
    };

    // ======== بيئات المراحل ========
    const levelEnvs = {
        1: { name: 'الشعاب المرجانية', bg: ['#4dd0e1', '#009dc4', '#006994'], sand: '#c4a35a' },
        2: { name: 'أعماق المحيط', bg: ['#1a5276', '#154360', '#0e2f44'], sand: '#5d6d7e' },
        3: { name: 'كهوف تحت الماء', bg: ['#2c3e50', '#1a252f', '#0f1519'], sand: '#34495e' },
        4: { name: 'حطام السفينة', bg: ['#4a235a', '#2e1437', '#1a0b1f'], sand: '#6c3483' }
    };

    let fish = { x: 100, y: 250, vx: 0, vy: 0, angle: 0, targetX: 100, targetY: 250 };
    let corals = [], seaweeds = [], bubbles = [], coins = [], particles = [], obstacles = [];

    // ======== التحكم ========
    let keys = {};
    let mouseX = 100, mouseY = 250;
    let isMouseDown = false;

    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    });
    document.addEventListener('keyup', (e) => keys[e.key] = false);

    function updateMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    }
    function updateTouchPos(e) {
        const rect = canvas.getBoundingClientRect();
        mouseX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
        mouseY = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }

    canvas.addEventListener('mousedown', (e) => { isMouseDown = true; updateMousePos(e); });
    canvas.addEventListener('mousemove', (e) => { if (isMouseDown) updateMousePos(e); });
    canvas.addEventListener('mouseup', () => isMouseDown = false);
    canvas.addEventListener('touchstart', (e) => { isMouseDown = true; updateTouchPos(e); e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { if (isMouseDown) updateTouchPos(e); e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchend', () => isMouseDown = false);

    // ======== اختيار السمكة ========
    document.querySelectorAll('.fish-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.fish-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            selectedFish = opt.dataset.fish;
        });
    });

    // ======== زر كتم الصوت ========
    muteBtn.addEventListener('click', () => {
        SoundManager.toggleMute();
        muteBtn.textContent = SoundManager.isMuted ? '🔇' : '🔊';
    });

    // ======== أزرار البداية وإعادة المحاولة ========
    document.getElementById('startBtn').addEventListener('click', () => {
        SoundManager.init();
        startGame();
    });
    document.getElementById('restartBtn').addEventListener('click', () => {
        SoundManager.init();
        startGame();
    });

    // ======== بدء اللعبة ========
    function startGame() {
        gameState = 'playing';
        score = 0; level = 1; lives = 3; coinsCollected = 0; combo = 0;
        gameSpeed = 2.5 + (level * 0.3);
        distance = 0; levelDistance = 4000;
        invincible = false;

        const ft = fishTypes[selectedFish];
        fish = { x: 100, y: 250, vx: 0, vy: 0, angle: 0, targetX: 100, targetY: 250 };

        corals = []; seaweeds = []; bubbles = []; coins = []; particles = []; obstacles = [];

        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        levelComplete.style.display = 'none';

        updateUI();
        updateLivesUI();
        generateInitialObjects();

        SoundManager.startMusic(level);

        if (animationId) cancelAnimationFrame(animationId);
        gameLoop();
    }

    // ======== توليد الكائنات ========
    function generateInitialObjects() {
        for (let i = 0; i < 20; i++) generateCoral(900 + i * 200);
        for (let i = 0; i < 15; i++) {
            seaweeds.push({
                x: Math.random() * 900, y: 480 + Math.random() * 20,
                height: 40 + Math.random() * 60, sway: Math.random() * Math.PI * 2,
                speed: 0.02 + Math.random() * 0.02
            });
        }
        for (let i = 0; i < 25; i++) bubbles.push(createBubble());
        for (let i = 0; i < 12; i++) generateCoin(900 + i * 300);

        if (level >= 2) generateObstacles();
    }

    function createBubble() {
        return {
            x: Math.random() * 900, y: 520 + Math.random() * 100,
            size: 3 + Math.random() * 10, speed: 0.5 + Math.random() * 2,
            wobble: Math.random() * Math.PI * 2
        };
    }

    function generateCoral(x) {
        const side = Math.random() > 0.5 ? 'top' : 'bottom';
        const types = ['brain', 'tube', 'fan', 'branch'];
        corals.push({
            x: x, y: side === 'top' ? 0 : 500,
            width: 60 + Math.random() * 80, height: 80 + Math.random() * 120,
            type: types[Math.floor(Math.random() * types.length)],
            side: side, color: getRandomCoralColor()
        });
    }

    function generateCoin(x) {
        coins.push({
            x: x, y: 80 + Math.random() * 340, size: 15,
            collected: false, pulse: Math.random() * Math.PI * 2
        });
    }

    function generateObstacles() {
        for (let i = 0; i < 5; i++) {
            obstacles.push({
                x: 1200 + i * 400, y: 100 + Math.random() * 300,
                type: 'jellyfish', width: 40, height: 50,
                pulse: Math.random() * Math.PI * 2, speed: 1
            });
        }
    }

    function getRandomCoralColor() {
        const colors = ['#ff6b6b', '#ff9f43', '#feca57', '#a29bfe', '#fd79a8', '#e17055', '#d63031', '#e84393', '#00cec9', '#55efc4'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // ======== تحديث واجهة المستخدم ========
    function updateUI() {
        scoreEl.textContent = score.toString().padStart(4, '0');
        levelEl.textContent = level;
        const progress = Math.min((distance / levelDistance) * 100, 100);
        progressFill.style.width = progress + '%';
    }

    function updateLivesUI() {
        for (let i = 1; i <= 3; i++) {
            const heart = document.getElementById('heart' + i);
            if (i > lives) {
                if (!heart.classList.contains('lost')) {
                    heart.classList.add('lost', 'lost-animation');
                    setTimeout(() => heart.classList.remove('lost-animation'), 500);
                }
            } else {
                heart.classList.remove('lost', 'lost-animation');
            }
        }
    }

    function showComboText(x, y, text) {
        const el = document.createElement('div');
        el.className = 'combo-text';
        el.textContent = text;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        document.getElementById('gameContainer').appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }

    // ======== تحديث السمكة ========
    function updateFish() {
        const ft = fishTypes[selectedFish];

        if (keys['ArrowUp'] || keys['w'] || keys['W']) fish.targetY -= ft.speed;
        if (keys['ArrowDown'] || keys['s'] || keys['S']) fish.targetY += ft.speed;
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) fish.targetX -= ft.speed;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) fish.targetX += ft.speed;

        if (isMouseDown) { fish.targetX = mouseX; fish.targetY = mouseY; }

        fish.x += (fish.targetX - fish.x) * 0.12;
        fish.y += (fish.targetY - fish.y) * 0.12;
        fish.angle = Math.atan2(fish.targetY - fish.y, fish.targetX - fish.x);

        fish.x = Math.max(30, Math.min(870, fish.x));
        fish.y = Math.max(30, Math.min(470, fish.y));
        fish.targetX = Math.max(30, Math.min(870, fish.targetX));
        fish.targetY = Math.max(30, Math.min(470, fish.targetY));
    }

    // ======== تحديث اللعبة ========
    function updateGame() {
        if (gameState !== 'playing') return;

        distance += gameSpeed;

        if (distance >= levelDistance) {
            completeLevel();
            return;
        }

        corals.forEach(c => c.x -= gameSpeed);
        corals = corals.filter(c => c.x > -200);
        while (corals.length < 20) {
            const lastX = corals.length > 0 ? Math.max(...corals.map(c => c.x)) : 900;
            generateCoral(lastX + 150 + Math.random() * 200);
        }

        seaweeds.forEach(s => { s.x -= gameSpeed * 0.5; s.sway += s.speed; if (s.x < -50) s.x = 950; });

        bubbles.forEach(b => {
            b.y -= b.speed; b.x += Math.sin(b.wobble) * 0.5; b.wobble += 0.05;
            if (b.y < -20) { b.y = 520; b.x = Math.random() * 900; }
        });

        coins.forEach(c => { c.x -= gameSpeed; c.pulse += 0.05; });
        coins = coins.filter(c => c.x > -50);
        while (coins.length < 10) {
            const lastX = coins.length > 0 ? Math.max(...coins.map(c => c.x)) : 900;
            generateCoin(lastX + 200 + Math.random() * 300);
        }

        obstacles.forEach(o => {
            o.x -= gameSpeed;
            o.pulse += 0.03;
            if (o.type === 'jellyfish') o.y += Math.sin(o.pulse) * 0.5;
        });
        obstacles = obstacles.filter(o => o.x > -100);

        coins.forEach(c => {
            if (!c.collected) {
                const dx = fish.x - c.x, dy = fish.y - c.y;
                if (Math.sqrt(dx * dx + dy * dy) < 40) {
                    c.collected = true;
                    coinsCollected++;
                    combo++;

                    let points = 10;
                    if (combo >= 5) { points = 25; showComboText(c.x, c.y, '🔥 x' + combo + ' Combo!'); }
                    else if (combo >= 3) { points = 15; showComboText(c.x, c.y, '✨ x' + combo); }

                    score += points;
                    createParticles(c.x, c.y, '#ffd700', 10);
                    SoundManager.playCoin();

                    clearTimeout(comboTimer);
                    comboTimer = setTimeout(() => combo = 0, 2000);

                    updateUI();
                }
            }
        });

        if (Math.random() > 0.97) SoundManager.playBubble();

        if (!invincible) {
            const ft = fishTypes[selectedFish];

            for (let c of corals) {
                if (checkCollision(fish, c, ft.size)) {
                    handleCollision();
                    return;
                }
            }

            for (let o of obstacles) {
                if (checkObstacleCollision(fish, o, ft.size)) {
                    handleCollision();
                    return;
                }
            }
        }

        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.02; p.vy += 0.1; });
        particles = particles.filter(p => p.life > 0);

        updateFish();
    }

    // ======== التعامل مع الاصطدام ========
    function handleCollision() {
        lives--;
        updateLivesUI();

        SoundManager.playCrash();
        SoundManager.playLifeLost();

        damageFlash.classList.add('active');
        setTimeout(() => damageFlash.classList.remove('active'), 200);

        invincible = true;
        canvas.classList.add('invincible');

        if (invincibleTimer) clearTimeout(invincibleTimer);
        invincibleTimer = setTimeout(() => {
            invincible = false;
            canvas.classList.remove('invincible');
        }, 2000);

        createParticles(fish.x, fish.y, '#ff6b6b', 15);

        if (lives <= 0) {
            SoundManager.playGameOver();
            SoundManager.stopMusic();
            gameOver();
        }
    }

    function checkCollision(f, c, fishSize) {
        const fx = f.x, fy = f.y, fw = fishSize, fh = fishSize * 0.6;
        let cx = c.x, cy = c.side === 'top' ? c.height / 2 : 500 - c.height / 2;
        let cw = c.width, ch = c.height;
        const padding = 12;
        return fx + fw / 2 - padding > cx - cw / 2 && fx - fw / 2 + padding < cx + cw / 2 &&
            fy + fh / 2 - padding > cy - ch / 2 && fy - fh / 2 + padding < cy + ch / 2;
    }

    function checkObstacleCollision(f, o, fishSize) {
        const dx = f.x - o.x, dy = f.y - o.y;
        return Math.sqrt(dx * dx + dy * dy) < (fishSize + o.width / 2);
    }

    function createParticles(x, y, color, count = 8) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
                life: 1, color: color, size: 3 + Math.random() * 5
            });
        }
    }

    function completeLevel() {
        gameState = 'levelcomplete';
        levelComplete.style.display = 'block';

        const nextLevel = level + 1;
        const env = levelEnvs[nextLevel] || levelEnvs[1];
        document.getElementById('nextLevelName').textContent =
            nextLevel <= 4 ? 'المرحلة القادمة: ' + env.name : 'المرحلة النهائية!';

        score += 100 * level;
        SoundManager.playLevelUp();
        SoundManager.stopMusic();
        updateUI();

        setTimeout(() => {
            if (nextLevel <= 4) {
                level = nextLevel;
                gameSpeed = 2.5 + (level * 0.5);
                distance = 0;
                levelDistance = 4000 + (level * 1000);
                levelComplete.style.display = 'none';
                gameState = 'playing';

                fish.x = 100; fish.y = 250;
                fish.targetX = 100; fish.targetY = 250;

                corals = []; seaweeds = []; bubbles = []; coins = []; obstacles = [];
                generateInitialObjects();

                SoundManager.startMusic(level);
                updateUI();
            } else {
                gameState = 'gameover';
                finalScoreEl.textContent = score;
                finalLevelEl.textContent = level;
                finalCoinsEl.textContent = coinsCollected;
                levelComplete.style.display = 'none';
                gameOverScreen.querySelector('h2').textContent = '🏆 تهانينا! أكملت كل المراحل!';
                gameOverScreen.classList.remove('hidden');
                SoundManager.playGameOver();
            }
        }, 3000);
    }

    function gameOver() {
        gameState = 'gameover';
        finalScoreEl.textContent = score;
        finalLevelEl.textContent = level;
        finalCoinsEl.textContent = coinsCollected;
        gameOverScreen.querySelector('h2').textContent = '💥 انتهت اللعبة!';
        gameOverScreen.classList.remove('hidden');
        createParticles(fish.x, fish.y, '#ff6b6b', 20);
    }

    function drawFish(ctx, x, y, angle, type) {
        const ft = fishTypes[type];
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        const size = ft.size;

        if (invincible) {
            ctx.strokeStyle = 'rgba(255,215,0,' + (0.3 + Math.sin(Date.now() / 100) * 0.2) + ')';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, size + 10, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.fillStyle = ft.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, size, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.ellipse(-5, -size * 0.15, size * 0.6, size * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = ft.finColor;
        ctx.beginPath();
        ctx.moveTo(-size + 5, 0);
        ctx.lineTo(-size - 18, -size * 0.45);
        ctx.lineTo(-size - 18, size * 0.45);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = ft.finColor;
        ctx.beginPath();
        ctx.moveTo(-5, -size * 0.45);
        ctx.lineTo(10, -size * 0.85);
        ctx.lineTo(20, -size * 0.45);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = ft.finColor;
        ctx.beginPath();
        ctx.moveTo(5, size * 0.4);
        ctx.lineTo(15, size * 0.75);
        ctx.lineTo(0, size * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(size * 0.5, -size * 0.15, size * 0.18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(size * 0.55, -size * 0.15, size * 0.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(size * 0.58, -size * 0.2, size * 0.04, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(size * 0.7, size * 0.05, size * 0.15, 0.2, Math.PI - 0.2);
        ctx.stroke();

        ctx.restore();
    }

    function drawCoral(ctx, c) {
        ctx.save();
        ctx.translate(c.x, c.y);
        if (c.side === 'bottom') { ctx.scale(1, -1); ctx.translate(0, -500); }
        ctx.fillStyle = c.color;

        switch (c.type) {
            case 'brain':
                ctx.beginPath();
                ctx.arc(0, c.height / 2, c.width / 2, 0, Math.PI, true);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                for (let i = 0; i < 5; i++) {
                    ctx.beginPath();
                    ctx.arc((Math.random() - 0.5) * c.width * 0.6, c.height * 0.3 + Math.random() * c.height * 0.3, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            case 'tube':
                for (let i = 0; i < 4; i++) {
                    const h = c.height * (0.5 + Math.random() * 0.5);
                    const w = c.width / 5;
                    const offset = (i - 1.5) * w * 1.5;
                    ctx.fillStyle = c.color;
                    ctx.fillRect(offset - w / 2, 0, w, h);
                    ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    ctx.beginPath();
                    ctx.ellipse(offset, h, w / 2, 5, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            case 'fan':
                ctx.beginPath();
                ctx.moveTo(0, 0);
                for (let i = -3; i <= 3; i++) {
                    const x = i * c.width / 7;
                    const y = c.height * (1 - Math.abs(i) / 4);
                    ctx.quadraticCurveTo(x * 1.2, y * 0.5, x, y);
                }
                ctx.lineTo(0, 0);
                ctx.fill();
                break;
            case 'branch':
                ctx.strokeStyle = c.color;
                ctx.lineWidth = 8;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, c.height * 0.4);
                ctx.stroke();
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(0, c.height * 0.3);
                ctx.lineTo(-c.width * 0.3, c.height * 0.6);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, c.height * 0.4);
                ctx.lineTo(c.width * 0.3, c.height * 0.7);
                ctx.stroke();
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-c.width * 0.3, c.height * 0.6);
                ctx.lineTo(-c.width * 0.5, c.height * 0.8);
                ctx.stroke();
                break;
        }
        ctx.restore();
    }

    function drawSeaweed(ctx, s) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.strokeStyle = '#2d8a3e';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const segments = 5;
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const sway = Math.sin(s.sway + t * 3) * 15 * t;
            ctx.quadraticCurveTo(sway, -s.height * (i - 0.5) / segments, sway * 0.8, -s.height * i / segments);
        }
        ctx.stroke();
        ctx.fillStyle = '#3cb371';
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const sway = Math.sin(s.sway + t * 3) * 15 * t;
            const y = -s.height * i / segments;
            ctx.beginPath();
            ctx.ellipse(sway + 8, y, 12, 5, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(sway - 8, y - 5, 10, 4, -0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawCoin(ctx, c) {
        if (c.collected) return;
        ctx.save();
        ctx.translate(c.x, c.y);
        const scale = 1 + Math.sin(c.pulse) * 0.15;
        ctx.scale(scale, scale);
        ctx.rotate(c.pulse * 0.5);

        ctx.fillStyle = 'rgba(255,215,0,0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, c.size + 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(0, 0, c.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ff8c00';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ff8c00';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', 0, 1);

        ctx.restore();
    }

    function drawBubble(ctx, b) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, b.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(-b.size * 0.3, -b.size * 0.3, b.size * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawObstacle(ctx, o) {
        ctx.save();
        ctx.translate(o.x, o.y);

        if (o.type === 'jellyfish') {
            const pulse = 1 + Math.sin(o.pulse) * 0.1;
            ctx.scale(pulse, pulse);

            ctx.fillStyle = 'rgba(255,105,180,0.6)';
            ctx.beginPath();
            ctx.arc(0, -10, 20, Math.PI, 0);
            ctx.lineTo(20, 10);
            ctx.lineTo(-20, 10);
            ctx.fill();

            ctx.strokeStyle = 'rgba(255,105,180,0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255,182,193,0.7)';
            ctx.lineWidth = 2;
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 8, 10);
                ctx.quadraticCurveTo(i * 8 + Math.sin(o.pulse + i) * 5, 25, i * 8, 40);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    function drawParticles(ctx) {
        particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    function drawBackground() {
        const env = levelEnvs[level] || levelEnvs[1];
        const gradient = ctx.createLinearGradient(0, 0, 0, 500);
        gradient.addColorStop(0, env.bg[0]);
        gradient.addColorStop(0.5, env.bg[1]);
        gradient.addColorStop(1, env.bg[2]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 900, 500);

        ctx.save();
        ctx.globalAlpha = 0.04;
        ctx.fillStyle = 'white';
        for (let i = 0; i < 5; i++) {
            const x = (Date.now() / 50 + i * 200) % 1000 - 100;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + 80, 0);
            ctx.lineTo(x + 150, 500);
            ctx.lineTo(x - 50, 500);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        ctx.fillStyle = env.sand;
        ctx.fillRect(0, 480, 900, 20);
        ctx.fillStyle = env.sand;
        ctx.beginPath();
        ctx.moveTo(0, 480);
        for (let x = 0; x <= 900; x += 20) {
            ctx.lineTo(x, 480 + Math.sin(x * 0.05 + Date.now() / 1000) * 5);
        }
        ctx.lineTo(900, 500);
        ctx.lineTo(0, 500);
        ctx.fill();
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        seaweeds.forEach(s => drawSeaweed(ctx, s));
        bubbles.forEach(b => drawBubble(ctx, b));
        corals.forEach(c => drawCoral(ctx, c));
        obstacles.forEach(o => drawObstacle(ctx, o));
        coins.forEach(c => drawCoin(ctx, c));
        if (gameState === 'playing' || gameState === 'levelcomplete') {
            drawFish(ctx, fish.x, fish.y, fish.angle, selectedFish);
        }
        drawParticles(ctx);
    }

    function gameLoop() {
        updateGame();
        draw();
        animationId = requestAnimationFrame(gameLoop);
    }

    // ======== نظام الصوت الآمن والمكتمل ========
    const SoundManager = {
        audioContext: null,
        masterGain: null,
        isMuted: false,

        init() {
            if (this.audioContext) return;
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.masterGain = this.audioContext.createGain();
                this.masterGain.connect(this.audioContext.destination);
            } catch (e) {
                console.warn('Web Audio API not supported');
            }
        },

        toggleMute() {
            this.isMuted = !this.isMuted;
            if (this.masterGain && this.audioContext) {
                this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.audioContext.currentTime);
            }
        },

        playTone(freq, type, duration) {
            if (this.isMuted || !this.audioContext) return;
            try {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start();
                osc.stop(this.audioContext.currentTime + duration);
            } catch (e) {}
        },

        playCoin() { this.playTone(587.33, 'sine', 0.15); },
        playBubble() { this.playTone(400, 'sine', 0.1); },
        playCrash() { this.playTone(150, 'sawtooth', 0.2); },
        playLifeLost() { this.playTone(100, 'triangle', 0.3); },
        playLevelUp() { this.playTone(880, 'sine', 0.4); },
        playGameOver() { this.playTone(120, 'sawtooth', 0.5); },
        startMusic(lvl) {},
        stopMusic() {}
    };

})();