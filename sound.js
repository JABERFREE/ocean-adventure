/**
 * Ocean Adventure - Electronic Sound System
 * نظام صوت إلكتروني كامل باستخدام Web Audio API
 * لا يحتاج أي ملفات صوتية خارجية!
 */

const SoundManager = {
    audioContext: null,
    masterGain: null,
    musicGain: null,
    sfxGain: null,
    isMuted: false,
    musicPlaying: false,
    currentMusicNodes: [],
    
    // ====== التهيئة ======
    init() {
        if (this.audioContext) return;
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Master gain (التحكم بالصوت الكلي)
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.8;
        this.masterGain.connect(this.audioContext.destination);
        
        // Music gain (التحكم بالموسيقى)
        this.musicGain = this.audioContext.createGain();
        this.musicGain.gain.value = 0.3; // موسيقى هادئة خلفية
        this.musicGain.connect(this.masterGain);
        
        // SFX gain (التحكم بالتأثيرات)
        this.sfxGain = this.audioContext.createGain();
        this.sfxGain.gain.value = 0.6; // تأثيرات أعلى صوتاً
        this.sfxGain.connect(this.masterGain);
        
        console.log('🎵 Sound System Initialized');
    },
    
    // ====== تأثير Reverb مائي ======
    createWaterReverb() {
        const ctx = this.audioContext;
        const length = 2.0; // ثانيتين
        const rate = ctx.sampleRate;
        const buffer = ctx.createBuffer(2, length * rate, rate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                // Decay exponential للحصول على صدى مائي
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
            }
        }
        
        const convolver = ctx.createConvolver();
        convolver.buffer = buffer;
        return convolver;
    },
    
    // ====== Low-pass Filter مائي ======
    createWaterFilter() {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800; // تردد منخفض = صوت تحت الماء
        filter.Q.value = 1;
        return filter;
    },
    
    // ====== 1. صوت فقاعات الماء 💧 ======
    playBubble() {
        if (this.isMuted) return;
        this.ensureContext();
        
        const ctx = this.audioContext;
        const t = ctx.currentTime;
        
        // إنشاء 2-4 فقاعات متتالية
        const bubbleCount = 2 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < bubbleCount; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = this.createWaterFilter();
            
            // كل فقاعة بتردد مختلف
            const baseFreq = 300 + Math.random() * 500;
            const startTime = t + i * 0.06;
            
            // Sine wave = صوت فقاعة ناعم
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq, startTime);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, startTime + 0.08);
            
            // Envelope سريع للفقاعة
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start(startTime);
            osc.stop(startTime + 0.15);
        }
        
        // إضافة "pop" خفيف للفقاعة
        const pop = ctx.createOscillator();
        const popGain = ctx.createGain();
        pop.type = 'triangle';
        pop.frequency.setValueAtTime(200, t);
        pop.frequency.exponentialRampToValueAtTime(50, t + 0.05);
        popGain.gain.setValueAtTime(0.1, t);
        popGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        pop.connect(popGain);
        popGain.connect(this.sfxGain);
        pop.start(t);
        pop.stop(t + 0.1);
    },
    
    // ====== 2. صوت جمع العملة (إلكتروني) ⭐ ======
    playCoin() {
        if (this.isMuted) return;
        this.ensureContext();
        
        const ctx = this.audioContext;
        const t = ctx.currentTime;
        
        // Arpeggio إلكتروني صاعد: C5 - E5 - G5 - C6
        const notes = [523.25, 659.25, 783.99, 1046.50];
        
        notes.forEach((freq, i) => {
            // Oscillator رئيسي (square wave = صوت إلكتروني)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t + i * 0.04);
            
            // Filter envelope للحصول على صوت "blip" إلكتروني
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, t + i * 0.04);
            filter.frequency.exponentialRampToValueAtTime(500, t + i * 0.04 + 0.1);
            
            gain.gain.setValueAtTime(0.12, t + i * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.12);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start(t + i * 0.04);
            osc.stop(t + i * 0.04 + 0.15);
        });
        
        // إضافة "sparkle" عالي التردد
        const sparkle = ctx.createOscillator();
        const sparkleGain = ctx.createGain();
        sparkle.type = 'sine';
        sparkle.frequency.setValueAtTime(2093, t); // C7
        sparkleGain.gain.setValueAtTime(0.05, t);
        sparkleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        sparkle.connect(sparkleGain);
        sparkleGain.connect(this.sfxGain);
        sparkle.start(t);
        sparkle.stop(t + 0.3);
    },
    
    // ====== 3. صوت الاصطدام (إلكتروني) 💥 ======
    playCrash() {
        if (this.isMuted) return;
        this.ensureContext();
        
        const ctx = this.audioContext;
        const t = ctx.currentTime;
        
        // 1. Noise burst (صوت خشنة إلكترونية)
        const bufferSize = ctx.sampleRate * 0.3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            // White noise مع decay سريع
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.05));
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        // Filter envelope للحصول على صوت " crunch" 
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(3000, t);
        noiseFilter.frequency.exponentialRampToValueAtTime(200, t + 0.2);
        
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(t);
        
        // 2. Bass drop (صوت ارتطام عميق)
        const bass = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bass.type = 'sawtooth';
        bass.frequency.setValueAtTime(150, t);
        bass.frequency.exponentialRampToValueAtTime(40, t + 0.3);
        
        bassGain.gain.setValueAtTime(0.3, t);
        bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        
        // Distortion خفيف للحصول على صوت إلكتروني خشن
        const distortion = ctx.createWaveShaper();
        distortion.curve = this.makeDistortionCurve(20);
        
        bass.connect(distortion);
        distortion.connect(bassGain);
        bassGain.connect(this.sfxGain);
        
        bass.start(t);
        bass.stop(t + 0.4);
        
        // 3. "Thud" إلكتروني
        const thud = ctx.createOscillator();
        const thudGain = ctx.createGain();
        thud.type = 'square';
        thud.frequency.setValueAtTime(80, t);
        thud.frequency.exponentialRampToValueAtTime(30, t + 0.1);
        thudGain.gain.setValueAtTime(0.2, t);
        thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        thud.connect(thudGain);
        thudGain.connect(this.sfxGain);
        thud.start(t);
        thud.stop(t + 0.15);
    },
    
    // ====== 4. صوت فقدان حياة ❤️ ======
    playLifeLost() {
        if (this.isMuted) return;
        this.ensureContext();
        
        const ctx = this.audioContext;
        const t = ctx.currentTime;
        
        // صوت "buzzer" إلكتروني منخفض
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.linearRampToValueAtTime(100, t + 0.3);
        
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        
        // Filter للحصول على صوت "womp" 
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.exponentialRampToValueAtTime(200, t + 0.3);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(t);
        osc.stop(t + 0.5);
        
        // Heartbeat إلكتروني
        const beat1 = ctx.createOscillator();
        const beat1Gain = ctx.createGain();
        beat1.type = 'sine';
        beat1.frequency.setValueAtTime(60, t);
        beat1Gain.gain.setValueAtTime(0.2, t);
        beat1Gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        beat1.connect(beat1Gain);
        beat1Gain.connect(this.sfxGain);
        beat1.start(t);
        beat1.stop(t + 0.1);
        
        const beat2 = ctx.createOscillator();
        const beat2Gain = ctx.createGain();
        beat2.type = 'sine';
        beat2.frequency.setValueAtTime(60, t + 0.15);
        beat2Gain.gain.setValueAtTime(0.2, t + 0.15);
        beat2Gain.gain.exponentialRampToValueAtTime(0.001, t + 0.23);
        beat2.connect(beat2Gain);
        beat2Gain.connect(this.sfxGain);
        beat2.start(t + 0.15);
        beat2.stop(t + 0.25);
    },
    
    // ====== 5. صوت الانتقال للمرحلة (إلكتروني) 🎉 ======
    playLevelUp() {
        if (this.isMuted) return;
        this.ensureContext();
        
        const ctx = this.audioContext;
        const t = ctx.currentTime;
        
        // Fanfare إلكتروني صاعد
        const notes = [
            { freq: 523.25, time: 0.0, type: 'square' },
            { freq: 659.25, time: 0.15, type: 'square' },
            { freq: 783.99, time: 0.30, type: 'square' },
            { freq: 1046.50, time: 0.45, type: 'sawtooth' },
            { freq: 1318.50, time: 0.60, type: 'sawtooth' }
        ];
        
        notes.forEach(note => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.type = note.type;
            osc.frequency.setValueAtTime(note.freq, t + note.time);
            
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(note.freq * 2, t + note.time);
            filter.Q.setValueAtTime(5, t + note.time);
            
            gain.gain.setValueAtTime(0.15, t + note.time);
            gain.gain.exponentialRampToValueAtTime(0.001, t + note.time + 0.4);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start(t + note.time);
            osc.stop(t + note.time + 0.5);
        });
        
        // Bass celebratory
        const bass = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(130.81, t); // C3
        bass.frequency.setValueAtTime(164.81, t + 0.3); // E3
        bass.frequency.setValueAtTime(196.00, t + 0.6); // G3
        bassGain.gain.setValueAtTime(0.2, t);
        bassGain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
        bass.connect(bassGain);
        bassGain.connect(this.sfxGain);
        bass.start(t);
        bass.stop(t + 1.0);
    },
    
    // ====== 6. صوت Game Over (إلكتروني) ======
    playGameOver() {
        if (this.isMuted) return;
        this.ensureContext();
        
        const ctx = this.audioContext;
        const t = ctx.currentTime;
        
        // Descending electronic scale (نغمة حزينة إلكترونية)
        const notes = [440, 415, 392, 370, 349, 330];
        
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
            osc.frequency.setValueAtTime(freq, t + i * 0.15);
            
            gain.gain.setValueAtTime(0.15, t + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.3);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start(t + i * 0.15);
            osc.stop(t + i * 0.15 + 0.4);
        });
    },
    
    // ====== 7. موسيقى خلفية إلكترونية ======
    startMusic(level) {
        if (this.isMuted || this.musicPlaying) return;
        this.ensureContext();
        
        this.musicPlaying = true;
        this.stopMusic(); // تنظيف أي موسيقى سابقة
        
        const ctx = this.audioContext;
        
        // Bass line إلكتروني متكرر
        const bassNotes = {
            1: [130.81, 164.81, 196.00, 164.81], // C-E-G-E (Coral Reef)
            2: [98.00, 123.47, 110.00, 92.50],   // G-B-A-F# (Deep Ocean - darker)
            3: [146.83, 174.61, 196.00, 146.83], // D-F#-G-D (Cave - mysterious)
            4: [130.81, 196.00, 261.63, 329.63]  // C-G-C-E (Shipwreck - epic)
        };
        
        const notes = bassNotes[level] || bassNotes[1];
        let noteIndex = 0;
        
        const playBassNote = () => {
            if (!this.musicPlaying || this.isMuted) return;
            
            const t = ctx.currentTime;
            const freq = notes[noteIndex % notes.length];
            
            // Bass synth
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400, t);
            filter.frequency.linearRampToValueAtTime(300, t + 0.4);
            
            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);
            
            osc.start(t);
            osc.stop(t + 0.5);
            
            // Pad إلكتروني (خلفية هارمونية)
            if (noteIndex % 2 === 0) {
                const pad = ctx.createOscillator();
                const padGain = ctx.createGain();
                pad.type = 'sine';
                pad.frequency.setValueAtTime(freq * 2, t);
                padGain.gain.setValueAtTime(0.03, t);
                padGain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
                pad.connect(padGain);
                padGain.connect(this.musicGain);
                pad.start(t);
                pad.stop(t + 1.0);
            }
            
            noteIndex++;
            this.musicTimeout = setTimeout(playBassNote, 500); // كل نصف ثانية
        };
        
        playBassNote();
    },
    
    stopMusic() {
        this.musicPlaying = false;
        if (this.musicTimeout) {
            clearTimeout(this.musicTimeout);
            this.musicTimeout = null;
        }
    },
    
    // ====== أدوات مساعدة ======
    makeDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        return curve;
    },
    
    ensureContext() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    },
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.audioContext.suspend();
        } else {
            this.audioContext.resume();
            if (this.musicPlaying) {
                // إعادة تشغيل الموسيقى
            }
        }
        return this.isMuted;
    },
    
    setVolume(type, value) {
        if (type === 'master') this.masterGain.gain.value = value;
        if (type === 'music') this.musicGain.gain.value = value;
        if (type === 'sfx') this.sfxGain.gain.value = value;
    }
};

// ====== تصدير للاستخدام ======
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundManager;
}