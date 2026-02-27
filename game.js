// Game configuration
const CONFIG = {
    canvas: {
        width: 800,
        height: 600
    },
    player: {
        width: 32,
        height: 32,
        speed: 3
    },
    tree: {
        width: 48,
        height: 64
    },
    fire: {
        minSafeDistance: 80,
        maxSize: 40,
        health: 100,
        safeDistanceMultiplier: 2 // Distance = fireSize * this multiplier
    },
    waterGun: {
        baseDamage: 10,
        levelUpThreshold: 5
    }
};

// Open burning facts
const openBurningFacts = [
    "Some counties where open burning is most noticeable are Madison, McDowell, Mitchell, Polk, Rutherford, Transylvania, Watauga, Wilkes and Yancey counties.",
    "Some causes are land clearing, bonfires/Campfires, accidental fires from discarded cigarettes or equipment, burning of yard waste.",
    "Open burning causes serious health effects, including respiratory illnesses, heart disease, cancer, nausea, headaches, and neurological disorders, due to exposure to toxic chemicals.",
    "People with heart disease, asthma, emphysema or other respiratory diseases are especially sensitive to air pollutants caused by open burning.",
    "You can experience eye and nose irritation, difficulty breathing, coughing and headaches from the pollution.",
    "Low-intensity fires reduce understory vegetation and sometimes damage small trees.",
    "Open burning, particularly wildfires, can cause injury, mortality, and disorientation to animals.",
    "Burning is only allowed when the AQ forecast is Code green or Code yellow. This rule is often not followed.",
    "The wind transports pollutants; they settle in our lakes, streams, and soil; and they seep into our ground water."
];

// Game state
const gameState = {
    level: 1,
    score: 0,
    waterGunLevel: 1,
    tutorialStep: 0,
    currentCampsite: null,
    playerX: 100,
    playerY: 300,
    isMoving: false,
    facingRight: true,
    gamePhase: 'tutorial', // tutorial, travel, inspection, wildfire
    previousPhase: null,
    keys: {},
    fires: [],
    campsitesCompleted: 0,
    isInspecting: false,
    isShooting: false,
    particles: [],
    checklist: {
        hasLicense: null,
        licenseValid: null,
        fireSafe: null
    },
    wildfireTimer: null,
    factIndex: 0,
    audioEnabled: true,
    walkingSoundCooldown: false,
    fireSoundCooldown: false
};

// Load progress from localStorage
function loadProgress() {
    const savedProgress = localStorage.getItem('pollutionRangerProgress');
    if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        gameState.level = progress.level || 1;
        gameState.score = progress.score || 0;
        gameState.waterGunLevel = progress.waterGunLevel || 1;
        gameState.campsitesCompleted = progress.campsitesCompleted || 0;
        gameState.factIndex = progress.factIndex || 0;
    }
}

// Save progress to localStorage
function saveProgress() {
    const progress = {
        level: gameState.level,
        score: gameState.score,
        waterGunLevel: gameState.waterGunLevel,
        campsitesCompleted: gameState.campsitesCompleted,
        factIndex: gameState.factIndex
    };
    localStorage.setItem('pollutionRangerProgress', JSON.stringify(progress));
}

// Tutorial steps
const tutorialSteps = [
    {
        title: "Welcome, Park Ranger!",
        text: "Your mission is to inspect campsites and ensure fire safety. Open burning without proper permits and precautions can lead to devastating wildfires. Let's learn how to keep our parks safe!"
    },
    {
        title: "Moving Around",
        text: "Use ARROW KEYS or WASD to move your ranger around the campsite. You'll need to inspect different parts of each site."
    },
    {
        title: "Legal Campfires",
        text: "A legal campfire must have:\n• A valid license with a campfire logo\n• Safe distance from trees (at least 80 pixels)\n• Appropriate size (not too large)"
    },
    {
        title: "Extinguishing Fires",
        text: "For illegal fires:\n• CLICK to shoot your water gun\n• Press X to cover fire with a tarp\n• Your water gun gets stronger as you progress!\n• Click multiple times to put out fires completely."
    },
    {
        title: "Inspecting Licenses",
        text: "At each campsite, inspect the license:\n• Click on the license for a closer look\n• Press Y if it has a valid campfire logo\n• Press N if it's invalid or missing the logo"
    },
    {
        title: "Making Decisions",
        text: "After inspection, mark the campsite:\n• Legal: If it meets all requirements\n• Illegal: If it violates any rules\n\nBe careful! Wrong decisions end the game!"
    },
    {
        title: "Audio Settings",
        text: "You can enable or disable audio in this game:\n• Click the speaker icon in the bottom left corner\n• Audio is currently enabled by default\n• Toggle it anytime during gameplay"
    },
    {
        title: "Resetting Progress",
        text: "If you need to start over, press Shift + R to reset your game progress.\nA confirmation popup will appear to prevent accidental resets.\n\nThis will clear your score, level, and water gun upgrades."
    },
    {
        title: "Special Events",
        text: "In rare dry conditions, wildfires may occur!\nYou'll need to surround the fire to contain it.\n\nEvery 25 campsites, a massive wildfire event happens!\nPut out all fires within 1 minute or lose the game.\n\nGood luck, Ranger! Let's protect our forests!"
    }
];

// Canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Audio context and background music
let audioContext;
let backgroundMusic;

function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        backgroundMusic = document.getElementById('background-music');

        // Resume audio context on first user interaction
        const resumeAudio = () => {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            // Start background music if enabled
            if (gameState.audioEnabled && backgroundMusic) {
                backgroundMusic.play().catch(e => console.warn('Could not play background music:', e));
            }
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('keydown', resumeAudio);
        };
        document.addEventListener('click', resumeAudio);
        document.addEventListener('keydown', resumeAudio);
    } catch (e) {
        console.warn('Web Audio API not supported');
    }
}

// UI elements
const tutorialDiv = document.getElementById('tutorial');
const tutorialText = document.getElementById('tutorial-text');
const tutorialNext = document.getElementById('tutorial-next');
const tutorialClose = document.getElementById('tutorial-close');
const licenseViewer = document.getElementById('license-viewer');
const licenseCanvas = document.getElementById('licenseCanvas');
const licenseCtx = licenseCanvas.getContext('2d');
const campsiteMenu = document.getElementById('campsite-menu');
const gameOverDiv = document.getElementById('game-over');
const resultMessage = document.getElementById('result-message');
const resultTitle = document.getElementById('result-title');
const resultText = document.getElementById('result-text');
const bibliographyDiv = document.getElementById('bibliography');
const bibliographyClose = document.getElementById('bibliography-close');
const bibliographyLink = document.getElementById('bibliography-link');
const audioToggle = document.getElementById('audio-toggle');

// Initialize game
function init() {
    // Ensure DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
        return;
    }

    initAudio();
    loadProgress();
    setupEventListeners();

    // Check if tutorial has been shown before
    const tutorialShown = localStorage.getItem('pollutionRangerTutorialShown');
    if (!tutorialShown) {
        showTutorial();
        localStorage.setItem('pollutionRangerTutorialShown', 'true');
    } else {
        // Start game directly
        gameState.gamePhase = 'travel';
        generateCampsite();
    }

    updateHUD();
    gameLoop();
}

// Setup event listeners
function setupEventListeners() {
    // Keyboard events
    document.addEventListener('keydown', (e) => {
        gameState.keys[e.key.toLowerCase()] = true;
        
        if (e.key.toLowerCase() === 'x' && gameState.isInspecting && gameState.currentCampsite) {
            coverFireWithTarp();
        }
        
        // Press '?' to show tutorial
        if (e.key === '?' && tutorialDiv.classList.contains('hidden') && gameState.gamePhase !== 'tutorial') {
            showTutorial();
        }
        
        // Press Y or N when viewing license
        if (!licenseViewer.classList.contains('hidden')) {
            if (e.key.toLowerCase() === 'y') {
                verifyLicense(true);
            } else if (e.key.toLowerCase() === 'n') {
                verifyLicense(false);
            }
        }
        
        // Press Shift + R to reset game progress
        if (e.key.toLowerCase() === 'r' && e.shiftKey && gameState.gamePhase !== 'tutorial') {
            if (confirm('Are you sure you want to reset your game progress? This cannot be undone.')) {
                resetProgress();
            }
        }
    });
    
    document.addEventListener('keyup', (e) => {
        gameState.keys[e.key.toLowerCase()] = false;
    });
    
    // Mouse events for shooting and clicking license
    canvas.addEventListener('click', (e) => {
        if (gameState.isInspecting && gameState.currentCampsite) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Check if clicking on license
            const campsite = gameState.currentCampsite;
            if (campsite.license) {
                const license = campsite.license;
                if (x >= license.x && x <= license.x + license.width &&
                    y >= license.y && y <= license.y + license.height) {
                    inspectLicense();
                    return;
                }
            }
            
            // Otherwise shoot water gun
            shootWaterGun(x, y);
        }
    });
    
    // Tutorial buttons
    tutorialNext.addEventListener('click', nextTutorialStep);
    tutorialClose.addEventListener('click', startGame);
    
    // License buttons
    document.getElementById('license-yes').addEventListener('click', () => verifyLicense(true));
    document.getElementById('license-no').addEventListener('click', () => verifyLicense(false));
    
    // Checklist items
    document.getElementById('check-license').addEventListener('click', toggleLicenseCheck);
    document.getElementById('check-license-valid').addEventListener('click', () => {
        if (gameState.checklist.hasLicense === true) {
            inspectLicense();
        }
    });
    document.getElementById('check-fire-safe').addEventListener('click', toggleFireSafeCheck);
    
    // Decision buttons
    document.getElementById('mark-legal').addEventListener('click', () => makeDecision(true));
    document.getElementById('mark-illegal').addEventListener('click', () => makeDecision(false));
    
    // Next campsite button
    document.getElementById('next-campsite').addEventListener('click', goToNextCampsite);
    
    // Menu buttons (kept for backward compatibility but hidden)
    document.getElementById('inspect-license').addEventListener('click', inspectLicense);
    document.getElementById('menu-mark-legal').addEventListener('click', () => markCampsite(true));
    document.getElementById('menu-mark-illegal').addEventListener('click', () => markCampsite(false));
    
    // Restart button
    document.getElementById('restart-game').addEventListener('click', restartGame);

    // Bibliography
    bibliographyLink.addEventListener('click', showBibliography);
    bibliographyClose.addEventListener('click', hideBibliography);
    bibliographyDiv.addEventListener('click', (e) => {
        if (e.target === bibliographyDiv) {
            hideBibliography();
        }
    });

    // Audio toggle
    audioToggle.addEventListener('click', toggleAudio);
    updateAudioIcon();
}

// Tutorial functions
function showTutorial() {
    const previousPhase = gameState.gamePhase;
    gameState.gamePhase = 'tutorial';
    gameState.tutorialStep = 0;
    tutorialDiv.classList.remove('hidden');
    tutorialNext.classList.remove('hidden');
    tutorialClose.classList.add('hidden');
    displayTutorialStep();
    
    // Store previous phase to resume after tutorial
    gameState.previousPhase = previousPhase;
}

function displayTutorialStep() {
    const step = tutorialSteps[gameState.tutorialStep];
    tutorialText.innerHTML = `<h3>${step.title}</h3><p>${step.text.replace(/\n/g, '<br>')}</p>`;
    
    if (gameState.tutorialStep === tutorialSteps.length - 1) {
        tutorialNext.classList.add('hidden');
        tutorialClose.classList.remove('hidden');
    }
}

function nextTutorialStep() {
    gameState.tutorialStep++;
    if (gameState.tutorialStep < tutorialSteps.length) {
        displayTutorialStep();
    }
}

function startGame() {
    tutorialDiv.classList.add('hidden');

    // Resume previous phase if reopening tutorial, otherwise start new game
    if (gameState.previousPhase && gameState.previousPhase !== 'tutorial' && gameState.currentCampsite) {
        gameState.gamePhase = gameState.previousPhase;
    } else {
        gameState.gamePhase = 'travel';
        generateCampsite();
    }
}

function showBibliography() {
    bibliographyDiv.classList.remove('hidden');
    document.getElementById('hud').style.display = 'none';
    document.getElementById('checklist').style.display = 'none';
}

function hideBibliography() {
    bibliographyDiv.classList.add('hidden');
    document.getElementById('hud').style.display = 'flex';
    document.getElementById('checklist').style.display = 'block';
}

function toggleAudio() {
    gameState.audioEnabled = !gameState.audioEnabled;
    updateAudioIcon();

    // Control background music
    if (backgroundMusic) {
        if (gameState.audioEnabled) {
            backgroundMusic.play().catch(e => console.warn('Could not play background music:', e));
        } else {
            backgroundMusic.pause();
        }
    }
}

function updateAudioIcon() {
    const audioToggle = document.getElementById('audio-toggle');
    audioToggle.textContent = gameState.audioEnabled ? '🔊' : '🔇';
}

// Audio functions
function createTone(frequency, duration, type = 'sine') {
    if (!audioContext || !gameState.audioEnabled || audioContext.state !== 'running') return;

    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = type;

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.warn('Error creating tone:', e);
    }
}

function playWaterSplash() {
    if (!gameState.audioEnabled || !audioContext || audioContext.state !== 'running') return;
    // Water splash sound - more natural with bubbles
    try {
        const bufferSize = audioContext.sampleRate * 0.3; // 300ms
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate water splash with bubbles
        for (let i = 0; i < bufferSize; i++) {
            const t = i / bufferSize;
            // Main splash - filtered noise
            const splash = (Math.random() * 2 - 1) * Math.exp(-t * 4) * 0.3;
            // Bubble pops - occasional high-frequency bursts
            const bubbles = (Math.random() > 0.95 ? (Math.random() * 2 - 1) * 0.1 : 0) * Math.exp(-t * 2);
            // Low-frequency rumble
            const rumble = Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 3) * 0.05;

            data[i] = splash + bubbles + rumble;
        }

        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();

        source.buffer = buffer;
        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, audioContext.currentTime);

        gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        source.start(audioContext.currentTime);
    } catch (e) {
        console.warn('Error playing water splash:', e);
    }
}

function playTarpSwish() {
    if (!gameState.audioEnabled || !audioContext || audioContext.state !== 'running') return;
    try {
        // Tarp swish sound - filtered noise sweep
        const bufferSize = audioContext.sampleRate * 0.3; // 300ms
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate filtered noise with frequency sweep
        for (let i = 0; i < bufferSize; i++) {
            const t = i / bufferSize;
            const freq = 200 + t * 400; // Sweep from 200 to 600 Hz
            const sample = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 2); // Filtered noise
            data[i] = sample * 0.3;
        }

        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();

        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        source.start(audioContext.currentTime);
    } catch (e) {
        console.warn('Error playing tarp swish:', e);
    }
}

function playWalkingSound() {
    if (!gameState.audioEnabled || !audioContext || audioContext.state !== 'running') return;
    try {
        // Walking sound - subtle crunch noise
        const bufferSize = audioContext.sampleRate * 0.15; // 150ms
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate subtle crunch noise
        for (let i = 0; i < bufferSize; i++) {
            const t = i / bufferSize;
            const noise = (Math.random() * 2 - 1) * Math.exp(-t * 3); // Quick decay
            const crunch = Math.sin(2 * Math.PI * 80 * t) * noise * 0.1; // Low frequency modulation
            data[i] = crunch;
        }

        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();

        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        gainNode.gain.setValueAtTime(0.02, audioContext.currentTime);

        source.start(audioContext.currentTime);
    } catch (e) {
        console.warn('Error playing walking sound:', e);
    }
}

function playFireSound() {
    if (!gameState.audioEnabled || !audioContext || audioContext.state !== 'running') return;
    // Fire crackling sound - subtle pops and crackles
    const playCrackle = () => {
        if (!gameState.audioEnabled || !audioContext || audioContext.state !== 'running') return;
        try {
            const bufferSize = audioContext.sampleRate * (0.02 + Math.random() * 0.08); // 20-100ms
            const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
            const data = buffer.getChannelData(0);

            // Generate crackling noise
            for (let i = 0; i < bufferSize; i++) {
                const t = i / bufferSize;
                const crackle = (Math.random() * 2 - 1) * Math.exp(-t * 5) * 0.05; // Very subtle
                data[i] = crackle;
            }

            const source = audioContext.createBufferSource();
            const gainNode = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();

            source.buffer = buffer;
            source.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioContext.destination);

            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1000 + Math.random() * 2000, audioContext.currentTime);
            filter.Q.setValueAtTime(1, audioContext.currentTime);

            gainNode.gain.setValueAtTime(0.01, audioContext.currentTime);

            source.start(audioContext.currentTime);
        } catch (e) {
            console.warn('Error playing fire crackle:', e);
        }
    };

    // Play random crackles
    for (let i = 0; i < 2; i++) {
        setTimeout(playCrackle, Math.random() * 1500);
    }
}






// Campsite generation
function generateCampsite() {
    const isWildfire = gameState.level > 3 && Math.random() < 0.1; // 10% chance after level 3
    const isLegal = (Math.random() < 0.375) && !isWildfire; // 3/8 chance of legal, but never for wildfires
    
    const campsite = {
        isLegal: isLegal,
        isWildfire: isWildfire,
        hasLicense: Math.random() > 0.2,
        licenseValid: isLegal ? true : Math.random() > 0.5,
        trees: [],
        fire: null,
        tent: null,
        people: [],
        license: null,
        inspected: false,
        licenseInspected: false,
        licenseViewed: false,
        fireExtinguished: false
    };
    
    // Generate tent first
    let tentX, tentY, tentValid;
    let tentAttempts = 0;
    do {
        tentValid = true;
        tentX = 100 + Math.random() * 200;
        tentY = CONFIG.canvas.height - 150 - Math.random() * 50;
        tentAttempts++;
    } while (!tentValid && tentAttempts < 10);
    campsite.tent = {
        x: tentX,
        y: tentY,
        width: 60,
        height: 50
    };

    // Generate trees (keep them in bottom half, scattered, and not overlapping tent)
    const numTrees = 8 + Math.floor(Math.random() * 6);
    for (let i = 0; i < numTrees; i++) {
        let treeX, treeY, validPosition;
        let attempts = 0;
        do {
            validPosition = true;
            treeX = 50 + Math.random() * 700;
            treeY = CONFIG.canvas.height * 0.5 + Math.random() * (CONFIG.canvas.height * 0.5 - CONFIG.tree.height);
            // Check if tree overlaps with existing trees
            for (let tree of campsite.trees) {
                const dist = Math.sqrt(Math.pow(treeX - tree.x, 2) + Math.pow(treeY - tree.y, 2));
                if (dist < CONFIG.tree.width + 40) {
                    validPosition = false;
                    break;
                }
            }
            // Check if tree overlaps with tent
            const tentDist = Math.sqrt(Math.pow(treeX - campsite.tent.x, 2) + Math.pow(treeY - campsite.tent.y, 2));
            if (tentDist < 200) {
                validPosition = false;
            }
            attempts++;
        } while (!validPosition && attempts < 10);
        if (validPosition || attempts >= 10) {
            campsite.trees.push({
                x: treeX,
                y: treeY,
                width: CONFIG.tree.width,
                height: CONFIG.tree.height
            });
        }
    }
    
    // Check if this should be a wildfire event
    const isWildfireEvent = gameState.campsitesCompleted > 0 && (gameState.campsitesCompleted + 1) % 25 === 0;

    if (isWildfireEvent) {
        // Generate multiple fires covering most of the map
        campsite.fires = [];
        const numFires = 15 + Math.floor(Math.random() * 10); // 15-25 fires

        for (let i = 0; i < numFires; i++) {
            let fireX, fireY;
            let attempts = 0;
            do {
                fireX = 50 + Math.random() * (CONFIG.canvas.width - 100);
                fireY = CONFIG.canvas.height * 0.4 + Math.random() * (CONFIG.canvas.height * 0.6 - 100);
                attempts++;
            } while (attempts < 10); // Just place them randomly

            campsite.fires.push({
                x: fireX,
                y: fireY,
                size: 30 + Math.random() * 20,
                health: CONFIG.fire.health,
                isWildfire: true
            });
        }

        campsite.isWildfire = true;
        campsite.fire = campsite.fires[0]; // For compatibility
        gameState.wildfireTimer = 60; // 60 seconds
    } else {
        // Generate fire position
        let fireX, fireY, fireSafe;
        let attempts = 0;
        do {
            fireX = 250 + Math.random() * 300;
            fireY = CONFIG.canvas.height - 100 - Math.random() * 100; // Keep fire on ground
            fireSafe = true;

            // Determine fire size first
            const fireSize = isLegal ? 20 + Math.random() * 15 : (Math.random() > 0.5 ? 45 + Math.random() * 20 : 20 + Math.random() * 15);
            const minSafeDistance = fireSize * CONFIG.fire.safeDistanceMultiplier;

            // Check distance from trees
            for (let tree of campsite.trees) {
                const dist = Math.sqrt(Math.pow(fireX - tree.x, 2) + Math.pow(fireY - tree.y, 2));
                if (dist < minSafeDistance) {
                    fireSafe = false;
                    if (!isLegal) break; // For illegal fires, can be close to trees
                }
            }

            // Check distance from tent
            const tentDist = Math.sqrt(Math.pow(fireX - campsite.tent.x, 2) + Math.pow(fireY - campsite.tent.y, 2));
            if (tentDist < minSafeDistance) {
                fireSafe = false;
                if (!isLegal) fireSafe = true; // Illegal fires can be close to tent
            }

            attempts++;
            // If legal, keep trying for safe position. If illegal, allow unsafe position after attempts
            if (isLegal && !fireSafe && attempts < 20) continue;
            if (!isLegal && attempts > 5) break;
        } while (isLegal && !fireSafe && attempts < 20);

        const fireSize = isLegal ? 20 + Math.random() * 15 : (Math.random() > 0.5 ? 45 + Math.random() * 20 : 20 + Math.random() * 15);

        campsite.fire = {
            x: fireX,
            y: fireY,
            size: fireSize,
            health: CONFIG.fire.health,
            isTooLarge: fireSize > CONFIG.fire.maxSize,
            isTooClose: !fireSafe
        };
    }
    
    // Generate people with animation state
    const numPeople = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numPeople; i++) {
        campsite.people.push({
            x: campsite.tent.x + Math.random() * 100 - 20,
            y: campsite.tent.y + Math.random() * 60 - 20,
            width: 32,
            height: 32,
            targetX: 0,
            targetY: 0,
            speed: 1 + Math.random() * 0.5,
            animationFrame: 0,
            direction: Math.random() > 0.5 ? 1 : -1
        });
        
        // Set initial target
        campsite.people[i].targetX = 100 + Math.random() * 600;
        campsite.people[i].targetY = CONFIG.canvas.height - 100 - Math.random() * 80;
    }
    
    // Generate license near the tent
    if (campsite.hasLicense) {
        campsite.license = {
            x: campsite.tent.x + campsite.tent.width + 10 + Math.random() * 30,
            y: campsite.tent.y - 20 + Math.random() * 20,
            width: 30,
            height: 40,
            hasLogo: campsite.licenseValid
        };
    }
    
    gameState.currentCampsite = campsite;
    gameState.gamePhase = 'inspection';
    gameState.isInspecting = true;
    gameState.playerX = 100;
    gameState.playerY = 300;
    
    // Reset checklist
    gameState.checklist = {
        hasLicense: null,
        licenseValid: null,
        fireSafe: null
    };
    updateChecklistDisplay();
}

// Drawing functions
function drawPlayer() {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(gameState.playerX, gameState.playerY, CONFIG.player.width, CONFIG.player.height);
    
    // Hat
    ctx.fillStyle = '#654321';
    ctx.fillRect(gameState.playerX + 4, gameState.playerY - 8, 24, 8);
    ctx.fillRect(gameState.playerX + 8, gameState.playerY - 12, 16, 4);
    
    // Face
    ctx.fillStyle = '#FFD6A5';
    ctx.fillRect(gameState.playerX + 8, gameState.playerY + 4, 16, 16);
    
    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(gameState.playerX + 10, gameState.playerY + 8, 3, 3);
    ctx.fillRect(gameState.playerX + 19, gameState.playerY + 8, 3, 3);
    
    // Body
    ctx.fillStyle = '#6B8E23';
    ctx.fillRect(gameState.playerX + 4, gameState.playerY + 20, 24, 12);
    
    // Badge
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(gameState.playerX + 13, gameState.playerY + 22, 6, 6);

    // Water gun in hand
    ctx.fillStyle = '#4169E1'; // Royal blue for water gun
    if (gameState.facingRight) {
        // Right hand - angled water gun
        ctx.save();
        ctx.translate(gameState.playerX + 28, gameState.playerY + 24);
        ctx.rotate(-0.5); // More pronounced upward angle
        ctx.fillRect(-8, -2, 12, 4); // barrel
        ctx.fillRect(-2, 2, 6, 8); // handle
        ctx.fillStyle = '#000080'; // Darker blue for details
        ctx.fillRect(-8, 0, 12, 2); // barrel top
        ctx.fillRect(2, 4, 2, 4); // trigger
        ctx.restore();
    } else {
        // Left hand - angled water gun
        ctx.save();
        ctx.translate(gameState.playerX + 8, gameState.playerY + 24);
        ctx.rotate(0.3); // Slight upward angle
        ctx.fillRect(-4, -2, 12, 4); // barrel
        ctx.fillRect(4, 2, 6, 8); // handle
        ctx.fillStyle = '#000080'; // Darker blue for details
        ctx.fillRect(-4, 0, 12, 2); // barrel top
        ctx.fillRect(6, 4, 2, 4); // trigger
        ctx.restore();
    }
}

function drawTree(tree) {
    // Trunk
    ctx.fillStyle = '#654321';
    ctx.fillRect(tree.x + 16, tree.y + 32, 16, 32);
    
    // Foliage (simple pixel art style)
    ctx.fillStyle = '#228B22';
    ctx.fillRect(tree.x, tree.y, 48, 40);
    ctx.fillStyle = '#1a6b1a';
    ctx.fillRect(tree.x + 8, tree.y + 8, 32, 24);
    ctx.fillStyle = '#2d9e2d';
    ctx.fillRect(tree.x + 4, tree.y + 4, 40, 12);
}

function drawFire(fire) {
    // If fire is covered with tarp, draw black square
    if (fire.isCovered) {
        ctx.fillStyle = '#000';
        ctx.fillRect(fire.x - fire.size / 2, fire.y - fire.size / 2, fire.size, fire.size);
        return;
    }

    const baseSize = Math.max(5, fire.size * (fire.health / CONFIG.fire.health));

    // Fire animation
    const flicker = Math.sin(Date.now() / 100) * 3;

    // Red base
    ctx.fillStyle = '#FF4500';
    ctx.beginPath();
    ctx.arc(fire.x, fire.y, Math.max(1, baseSize / 2 + flicker), 0, Math.PI * 2);
    ctx.fill();

    // Orange middle
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    ctx.arc(fire.x, fire.y - 5, Math.max(1, baseSize / 3 + flicker), 0, Math.PI * 2);
    ctx.fill();

    // Yellow top
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(fire.x, fire.y - 10, Math.max(1, baseSize / 4 + flicker), 0, Math.PI * 2);
    ctx.fill();

    // Health bar (only for regular fires, not wildfires)
    if (!fire.isWildfire) {
        const barWidth = 50;
        const barHeight = 5;
        ctx.fillStyle = '#333';
        ctx.fillRect(fire.x - barWidth / 2, fire.y - baseSize - 10, barWidth, barHeight);
        ctx.fillStyle = fire.health > 50 ? '#4CAF50' : fire.health > 25 ? '#FFA500' : '#F44336';
        ctx.fillRect(fire.x - barWidth / 2, fire.y - baseSize - 10, barWidth * (fire.health / CONFIG.fire.health), barHeight);
    }
}

function drawTent(tent) {
    // Tent body
    ctx.fillStyle = '#CD853F';
    ctx.beginPath();
    ctx.moveTo(tent.x, tent.y + tent.height);
    ctx.lineTo(tent.x + tent.width / 2, tent.y);
    ctx.lineTo(tent.x + tent.width, tent.y + tent.height);
    ctx.closePath();
    ctx.fill();
    
    // Tent door
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(tent.x + tent.width / 2 - 10, tent.y + tent.height - 20, 20, 20);
}

function drawPerson(person) {
    // Simple stick figure camper
    ctx.fillStyle = '#FFD6A5';
    ctx.fillRect(person.x + 12, person.y + 4, 8, 8);
    
    // Body
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(person.x + 10, person.y + 12, 12, 12);
    
    // Animated arms (swinging while walking)
    const armSwing = Math.sin(person.animationFrame * 0.3) * 3;
    ctx.fillRect(person.x + 4, person.y + 14 + armSwing, 6, 4);
    ctx.fillRect(person.x + 22, person.y + 14 - armSwing, 6, 4);
    
    // Animated legs (walking)
    const legOffset = Math.abs(Math.sin(person.animationFrame * 0.2)) * 4;
    ctx.fillRect(person.x + 10, person.y + 24 + legOffset, 4, 8);
    ctx.fillRect(person.x + 18, person.y + 24 - legOffset, 4, 8);
}

function drawLicense(license) {
    ctx.fillStyle = '#F5F5DC';
    ctx.fillRect(license.x, license.y, license.width, license.height);
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(license.x, license.y, license.width, license.height);
    
    // "L" for license
    ctx.fillStyle = '#000';
    ctx.font = '16px monospace';
    ctx.fillText('L', license.x + 10, license.y + 25);
}

function drawLicenseDetail(license) {
    licenseCtx.fillStyle = '#F5F5DC';
    licenseCtx.fillRect(0, 0, 400, 300);
    
    // Border
    licenseCtx.strokeStyle = '#8B4513';
    licenseCtx.lineWidth = 4;
    licenseCtx.strokeRect(10, 10, 380, 280);
    
    // Title
    licenseCtx.fillStyle = '#000';
    licenseCtx.font = 'bold 24px monospace';
    licenseCtx.fillText('CAMPFIRE LICENSE', 50, 50);
    
    // Details
    licenseCtx.font = '16px monospace';
    licenseCtx.fillText('License #: ' + Math.floor(Math.random() * 10000), 50, 100);
    licenseCtx.fillText('Valid: 2025', 50, 130);
    licenseCtx.fillText('Location: Campsite ' + gameState.level, 50, 160);
    
    // Logo area
    if (license.hasLogo) {
        // Draw campfire logo
        licenseCtx.fillStyle = '#FF4500';
        licenseCtx.beginPath();
        licenseCtx.arc(200, 220, 30, 0, Math.PI * 2);
        licenseCtx.fill();
        
        licenseCtx.fillStyle = '#FFD700';
        licenseCtx.beginPath();
        licenseCtx.arc(200, 215, 20, 0, Math.PI * 2);
        licenseCtx.fill();
        
        licenseCtx.fillStyle = '#000';
        licenseCtx.font = '12px monospace';
        licenseCtx.fillText('CAMPFIRE', 165, 265);
        licenseCtx.fillText('AUTHORIZED', 155, 280);
    } else {
        // No logo or wrong logo
        licenseCtx.fillStyle = '#4169E1';
        licenseCtx.fillRect(170, 190, 60, 60);
        licenseCtx.fillStyle = '#000';
        licenseCtx.font = '12px monospace';
        licenseCtx.fillText('CAMPING', 175, 265);
        licenseCtx.fillText('ONLY', 185, 280);
    }
}

function drawBackground() {
    // Sky
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height * 0.4);
    
    // Ground
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, CONFIG.canvas.height * 0.4, CONFIG.canvas.width, CONFIG.canvas.height * 0.6);
}

function drawCampsite() {
    if (!gameState.currentCampsite) return;
    
    drawBackground();
    
    const campsite = gameState.currentCampsite;
    
    // Draw elements in layers
    campsite.trees.forEach(tree => drawTree(tree));
    drawTent(campsite.tent);
    campsite.people.forEach(person => drawPerson(person));
    if (campsite.license) drawLicense(campsite.license);
    if (campsite.fire && campsite.fire.health > 0) drawFire(campsite.fire);
    if (campsite.fires) {
        campsite.fires.forEach(fire => {
            if (fire.health > 0) drawFire(fire);
        });
    }
    drawPlayer();

    // Draw wildfire timer
    if (gameState.wildfireTimer !== null) {
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 24px monospace';
        ctx.fillText(`Time: ${Math.ceil(gameState.wildfireTimer)}s`, 10, 30);
    }

    // Play fire sounds periodically
    if (gameState.currentCampsite && (gameState.currentCampsite.fire || gameState.currentCampsite.fires) && !gameState.fireSoundCooldown) {
        playFireSound();
        gameState.fireSoundCooldown = true;
        setTimeout(() => gameState.fireSoundCooldown = false, 2000); // Play fire sound every 2 seconds
    }
    
    // Draw particles
    gameState.particles.forEach((particle, index) => {
        ctx.fillStyle = `rgba(107, 182, 255, ${particle.alpha})`;
        ctx.fillRect(particle.x, particle.y, 4, 4);
        
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.alpha -= 0.02;
        
        if (particle.alpha <= 0) {
            gameState.particles.splice(index, 1);
        }
    });
}

// Update camper positions and animation
function updateCampers() {
    if (!gameState.currentCampsite) return;
    
    const campsite = gameState.currentCampsite;
    
    for (let person of campsite.people) {
        // Update animation frame
        person.animationFrame++;
        if (person.animationFrame > 100) person.animationFrame = 0;
        
        // Calculate distance to target
        const dx = person.targetX - person.x;
        const dy = person.targetY - person.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Check distance from fire to avoid it
        const fireX = campsite.fire.x;
        const fireY = campsite.fire.y;
        const fireAvoidRadius = 120;
        const fireDistX = person.x - fireX;
        const fireDistY = person.y - fireY;
        const fireDist = Math.sqrt(fireDistX * fireDistX + fireDistY * fireDistY);
        
        // Move towards target
        if (dist > 10) {
            let moveX = (dx / dist) * person.speed;
            let moveY = (dy / dist) * person.speed;
            
            // If too close to fire, move away instead
            if (fireDist < fireAvoidRadius) {
                const avoidStrength = (fireAvoidRadius - fireDist) / fireAvoidRadius;
                moveX += (fireDistX / fireDist) * person.speed * 2 * avoidStrength;
                moveY += (fireDistY / fireDist) * person.speed * 2 * avoidStrength;
            }
            
            person.x += moveX;
            person.y += moveY;
        } else {
            // Reached target, pick new one
            person.targetX = 100 + Math.random() * 600;
            person.targetY = CONFIG.canvas.height - 100 - Math.random() * 80;
        }
        
        // Keep campers on screen
        person.x = Math.max(0, Math.min(CONFIG.canvas.width - person.width, person.x));
        person.y = Math.max(CONFIG.canvas.height * 0.4, Math.min(CONFIG.canvas.height - person.height, person.y));
    }
}

// Game logic
function handlePlayerMovement() {
    if (!gameState.isInspecting) return;

    const keys = gameState.keys;
    let moved = false;

    if (keys['arrowleft'] || keys['a']) {
        gameState.playerX -= CONFIG.player.speed;
        gameState.facingRight = false;
        moved = true;
    }
    if (keys['arrowright'] || keys['d']) {
        gameState.playerX += CONFIG.player.speed;
        gameState.facingRight = true;
        moved = true;
    }
    if (keys['arrowup'] || keys['w']) {
        gameState.playerY -= CONFIG.player.speed;
        moved = true;
    }
    if (keys['arrowdown'] || keys['s']) {
        gameState.playerY += CONFIG.player.speed;
        moved = true;
    }

    // Boundary checking
    gameState.playerX = Math.max(0, Math.min(CONFIG.canvas.width - CONFIG.player.width, gameState.playerX));
    gameState.playerY = Math.max(CONFIG.canvas.height * 0.4, Math.min(CONFIG.canvas.height - CONFIG.player.height, gameState.playerY));

    gameState.isMoving = moved;

    // Play walking sound when moving
    if (moved && !gameState.walkingSoundCooldown) {
        playWalkingSound();
        gameState.walkingSoundCooldown = true;
        setTimeout(() => gameState.walkingSoundCooldown = false, 300); // Prevent sound spam
    }
}

function shootWaterGun(targetX, targetY) {
    if (!gameState.currentCampsite) return;

    const campsite = gameState.currentCampsite;

    // Maximum range is 15% of screen width
    const maxRange = CONFIG.canvas.width * 0.15;
    const playerCenterX = gameState.playerX + CONFIG.player.width / 2;
    const playerCenterY = gameState.playerY + CONFIG.player.height / 2;

    let hitFire = false;

    if (campsite.fires) {
        // Handle multiple fires (wildfire)
        campsite.fires.forEach(fire => {
            if (fire.health <= 0) return;

            const distToFire = Math.sqrt(Math.pow(playerCenterX - fire.x, 2) + Math.pow(playerCenterY - fire.y, 2));

            if (distToFire > maxRange) return;

            const dist = Math.sqrt(Math.pow(targetX - fire.x, 2) + Math.pow(targetY - fire.y, 2));

            if (dist < 100) {
                const damage = CONFIG.waterGun.baseDamage * gameState.waterGunLevel;
                fire.health = Math.max(0, fire.health - damage);
                hitFire = true;

                // Create water particles
                for (let i = 0; i < 10; i++) {
                    gameState.particles.push({
                        x: playerCenterX,
                        y: playerCenterY,
                        vx: (targetX - playerCenterX) / 20 + (Math.random() - 0.5) * 2,
                        vy: (targetY - playerCenterY) / 20 + (Math.random() - 0.5) * 2,
                        alpha: 1
                    });
                }
            }
        });

        // Check if all fires are extinguished
        const allExtinguished = campsite.fires.every(fire => fire.health <= 0);
        if (allExtinguished) {
            campsite.fireExtinguished = true;
        }
    } else if (campsite.fire && campsite.fire.health > 0) {
        // Handle single fire
        const fire = campsite.fire;
        const distToFire = Math.sqrt(Math.pow(playerCenterX - fire.x, 2) + Math.pow(playerCenterY - fire.y, 2));

        if (distToFire > maxRange) return;

        const dist = Math.sqrt(Math.pow(targetX - fire.x, 2) + Math.pow(targetY - fire.y, 2));

        if (dist < 100) {
            const damage = CONFIG.waterGun.baseDamage * gameState.waterGunLevel;
            fire.health = Math.max(0, fire.health - damage);
            hitFire = true;

            // Create water particles
            for (let i = 0; i < 10; i++) {
                gameState.particles.push({
                    x: playerCenterX,
                    y: playerCenterY,
                    vx: (targetX - playerCenterX) / 20 + (Math.random() - 0.5) * 2,
                    vy: (targetY - playerCenterY) / 20 + (Math.random() - 0.5) * 2,
                    alpha: 1
                });
            }

            if (fire.health <= 0) {
                campsite.fireExtinguished = true;
            }
        }
    }

    if (hitFire) {
        playWaterSplash();
    }
}

function coverFireWithTarp() {
    if (!gameState.currentCampsite) return;

    const campsite = gameState.currentCampsite;

    // Maximum range is 15% of screen width
    const maxRange = CONFIG.canvas.width * 0.15;
    const playerCenterX = gameState.playerX + CONFIG.player.width / 2;
    const playerCenterY = gameState.playerY + CONFIG.player.height / 2;

    let coveredFire = false;

    if (campsite.fires) {
        // Handle multiple fires (wildfire)
        campsite.fires.forEach(fire => {
            if (fire.health <= 0) return;

            const dist = Math.sqrt(Math.pow(playerCenterX - fire.x, 2) + Math.pow(playerCenterY - fire.y, 2));

            if (dist < maxRange) {
                fire.health = 0;
                fire.isCovered = true;
                coveredFire = true;
            }
        });

        // Check if all fires are extinguished
        const allExtinguished = campsite.fires.every(fire => fire.health <= 0);
        if (allExtinguished) {
            campsite.fireExtinguished = true;
        }
    } else if (campsite.fire && campsite.fire.health > 0) {
        // Handle single fire
        const fire = campsite.fire;
        const dist = Math.sqrt(
            Math.pow(playerCenterX - fire.x, 2) +
            Math.pow(playerCenterY - fire.y, 2)
        );

        if (dist < maxRange) {
            fire.health = 0;
            fire.isCovered = true;
            campsite.fireExtinguished = true;
            coveredFire = true;
        }
    }

    if (coveredFire) {
        playTarpSwish();
    }
}

function inspectLicense() {
    if (!gameState.currentCampsite || !gameState.currentCampsite.license) {
        alert('No license found at this campsite!');
        gameState.checklist.hasLicense = false;
        updateChecklistDisplay();
        return;
    }
    
    // Automatically check that license exists
    gameState.checklist.hasLicense = true;
    updateChecklistDisplay();
    
    campsiteMenu.classList.add('hidden');
    licenseViewer.classList.remove('hidden');
    drawLicenseDetail(gameState.currentCampsite.license);
}

function verifyLicense(isValid) {
    if (!gameState.currentCampsite) return;
    
    const actuallyValid = gameState.currentCampsite.license && gameState.currentCampsite.license.hasLogo;
    gameState.currentCampsite.licenseInspected = true;
    gameState.currentCampsite.licenseViewed = true;
    gameState.currentCampsite.playerSaysLicenseValid = isValid;
    gameState.checklist.licenseValid = isValid;
    
    licenseViewer.classList.add('hidden');
    updateChecklistDisplay();
}

// Checklist functions
function toggleLicenseCheck() {
    if (!gameState.currentCampsite) return;
    
    const hasLicense = gameState.currentCampsite.hasLicense;
    gameState.checklist.hasLicense = hasLicense;
    updateChecklistDisplay();
}

function toggleFireSafeCheck() {
    if (!gameState.currentCampsite) return;
    
    const fire = gameState.currentCampsite.fire;
    if (!fire) return;
    
    // Determine if fire is safe
    // Must be at least (fireSize * 2) pixels away from trees and tent
    const minSafeDistance = fire.size * CONFIG.fire.safeDistanceMultiplier;
    const campsite = gameState.currentCampsite;
    let isLegal = !fire.isTooClose && !fire.isTooLarge;
    
    // Check trees
    for (let tree of campsite.trees) {
        const dist = Math.sqrt(Math.pow(fire.x - tree.x, 2) + Math.pow(fire.y - tree.y, 2));
        if (dist < minSafeDistance) {
            isLegal = false;
            break;
        }
    }
    
    // Check tent
    const tentDist = Math.sqrt(Math.pow(fire.x - campsite.tent.x, 2) + Math.pow(fire.y - campsite.tent.y, 2));
    if (tentDist < minSafeDistance) {
        isLegal = false;
    }
    
    gameState.checklist.fireSafe = isLegal;
    updateChecklistDisplay();
}

function updateChecklistDisplay() {
    const checkItems = {
        'check-license': gameState.checklist.hasLicense,
        'check-license-valid': gameState.checklist.licenseValid,
        'check-fire-safe': gameState.checklist.fireSafe
    };
    
    for (const [id, value] of Object.entries(checkItems)) {
        const element = document.getElementById(id);
        const checkbox = element.querySelector('.checkbox');
        
        element.classList.remove('checked', 'checked-no');
        
        if (value === true) {
            checkbox.textContent = '☑';
            element.classList.add('checked');
        } else if (value === false) {
            checkbox.textContent = '☒';
            element.classList.add('checked-no');
        } else {
            checkbox.textContent = '☐';
        }
    }
}

function makeDecision(isLegal) {
    if (!gameState.currentCampsite) return;
    
    const campsite = gameState.currentCampsite;
    
    // Determine actual safety
    const actuallyHasLicense = campsite.hasLicense;
    const actuallyValidLicense = campsite.license && campsite.license.hasLogo;
    const actuallyFireSafe = !campsite.fire.isTooClose && !campsite.fire.isTooLarge;
    const actuallyNeedToExtinguish = !actuallyHasLicense || !actuallyValidLicense || !actuallyFireSafe;
    const actuallyLegal = actuallyHasLicense && actuallyValidLicense && actuallyFireSafe;
    
    let correct = true;
    let message = '';
    
    if (isLegal && !actuallyLegal) {
        // Player said safe but it's not
        correct = false;
        message = 'Incorrect! This campsite is Illegal.\n\n';
        
        if (!actuallyHasLicense) {
            message += '❌ No license was present.\n';
        } else if (!actuallyValidLicense) {
            message += '❌ The license was invalid (no campfire logo).\n';
        }
        
        if (campsite.fire.isTooClose) {
            message += '❌ Fire was too close to trees.\n';
        }
        
        if (campsite.fire.isTooLarge) {
            message += '❌ Fire was too large.\n';
        }
        
        if (actuallyNeedToExtinguish && campsite.fire.health > 0) {
            message += '❌ The illegal fire should have been extinguished.\n';
        }
    } else if (!isLegal && actuallyLegal) {
        // Player said unsafe but it's safe
        correct = false;
        message = 'Incorrect! This campsite was Legal.\n\n';
        message += '✓ Valid license with campfire logo\n';
        message += '✓ Fire at safe distance from trees\n';
        message += '✓ Fire was appropriate size\n';
    } else if (!isLegal && !actuallyLegal) {
        // Player correctly identified as unsafe
        if (actuallyNeedToExtinguish && campsite.fire.health > 0) {
            correct = false;
            message = 'Almost! You correctly identified this as illegal, but you needed to extinguish the illegal fire first!';
        } else {
            correct = true;
            message = 'Correct! This campsite was Illegal.\n\n';
            
            if (!actuallyHasLicense) {
                message += '✓ No license present\n';
            } else if (!actuallyValidLicense) {
                message += '✓ Invalid license (no campfire logo)\n';
            }
            
            if (campsite.fire.isTooClose) {
                message += '✓ Fire too close to trees\n';
            }
            
            if (campsite.fire.isTooLarge) {
                message += '✓ Fire too large\n';
            }
            
            if (actuallyNeedToExtinguish) {
                message += '✓ Fire was extinguished\n';
            }
        }
    } else {
        // Player correctly identified as safe
        correct = true;
        message = 'Correct! This campsite was Legal.\n\n';
        message += '✓ Valid license with campfire logo\n';
        message += '✓ Fire at safe distance from trees\n';
        message += '✓ Fire was appropriate size\n';
    }
    
    if (correct) {
        resultTitle.textContent = '✓ Well Done, Ranger!';
        resultTitle.style.color = '#4CAF50';
        gameState.score++;
    } else {
        resultTitle.textContent = '✗ Incorrect';
        resultTitle.style.color = '#F44336';
    }
    
    // Always increment completed count and check for level ups
    gameState.campsitesCompleted++;

    // Level up water gun
    if (gameState.campsitesCompleted % CONFIG.waterGun.levelUpThreshold === 0) {
        gameState.waterGunLevel++;
        message += `\n🎉 Water Gun upgraded to Level ${gameState.waterGunLevel}!`;
    }

    // Increase difficulty
    if (gameState.campsitesCompleted % 5 === 0) {
        gameState.level++;
        message += `\n🏆 Advanced to Level ${gameState.level}!`;
    }

    // Show open burning fact every 5 campsites
    if (gameState.campsitesCompleted % 5 === 0) {
        const fact = openBurningFacts[gameState.factIndex % openBurningFacts.length];
        message += `\n\n📚 Open Burning Fact:\n${fact}`;
        gameState.factIndex++;
    }
    
    updateHUD();
    saveProgress();
    
    resultText.textContent = message;
    resultMessage.classList.remove('hidden');
}

function goToNextCampsite() {
    resultMessage.classList.add('hidden');
    generateCampsite();
}

function markCampsite(asLegal) {
    if (!gameState.currentCampsite) return;
    
    const campsite = gameState.currentCampsite;
    
    // Check if player's assessment is correct
    let correct = true;
    let reason = '';
    
    if (asLegal && !campsite.isLegal) {
        correct = false;
        reason = 'You marked an illegal fire as legal! ';
        if (campsite.fire.isTooClose) reason += 'The fire was too close to trees. ';
        if (campsite.fire.isTooLarge) reason += 'The fire was too large. ';
        if (campsite.license && !campsite.license.hasLogo) reason += 'The license was invalid. ';
        if (!campsite.license) reason += 'There was no license. ';
    } else if (!asLegal && campsite.isLegal) {
        correct = false;
        reason = 'You marked a legal fire as illegal! This campsite followed all the rules.';
    }
    
    if (correct) {
        gameState.score++;
        gameState.campsitesCompleted++;
        
        // Level up water gun
        if (gameState.campsitesCompleted % CONFIG.waterGun.levelUpThreshold === 0) {
            gameState.waterGunLevel++;
        }
        
        // Increase difficulty
        if (gameState.campsitesCompleted % 5 === 0) {
            gameState.level++;
        }
        
        updateHUD();
        campsiteMenu.classList.add('hidden');
        
        // Next campsite
        setTimeout(() => {
            generateCampsite();
        }, 500);
    } else {
        endGame(false, reason);
    }
}

function endGame(won, reason) {
    gameState.gamePhase = 'gameOver';
    gameState.isInspecting = false;
    
    campsiteMenu.classList.add('hidden');
    licenseViewer.classList.add('hidden');
    
    const title = document.getElementById('game-over-title');
    const message = document.getElementById('game-over-message');
    
    if (won) {
        title.textContent = 'Congratulations, Ranger!';
        message.textContent = `You've successfully protected the forest! Campsites inspected: ${gameState.score}`;
    } else {
        title.textContent = 'Game Over';
        message.textContent = `${reason}\n\nCampsites successfully inspected: ${gameState.score}`;
    }
    
    gameOverDiv.classList.remove('hidden');
}

function restartGame() {
    gameState.level = 1;
    gameState.score = 0;
    gameState.waterGunLevel = 1;
    gameState.campsitesCompleted = 0;
    gameState.currentCampsite = null;
    gameState.particles = [];
    
    localStorage.removeItem('pollutionRangerProgress');
    
    gameOverDiv.classList.add('hidden');
    updateHUD();
    generateCampsite();
}

function resetProgress() {
    gameState.level = 1;
    gameState.score = 0;
    gameState.waterGunLevel = 1;
    gameState.campsitesCompleted = 0;
    gameState.currentCampsite = null;
    gameState.particles = [];
    gameState.factIndex = 0;

    localStorage.removeItem('pollutionRangerProgress');

    updateHUD();
    generateCampsite();
}

function updateHUD() {
    document.getElementById('level-number').textContent = gameState.level;
    document.getElementById('gun-level').textContent = gameState.waterGunLevel;
    document.getElementById('score-value').textContent = gameState.score;
}

// Check if player is near interactables
function checkNearInteractables() {
    if (!gameState.isInspecting || !gameState.currentCampsite) return;
    
    const campsite = gameState.currentCampsite;
    const playerCenterX = gameState.playerX + CONFIG.player.width / 2;
    const playerCenterY = gameState.playerY + CONFIG.player.height / 2;
    
    // Check if player walks into license (only once per campsite)
    if (campsite.license && !campsite.licenseViewed) {
        const license = campsite.license;
        if (playerCenterX >= license.x && playerCenterX <= license.x + license.width &&
            playerCenterY >= license.y && playerCenterY <= license.y + license.height) {
            campsite.licenseViewed = true;
            inspectLicense();
            return;
        }
    }
}

// Main game loop
function gameLoop() {
    ctx.clearRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

    if (gameState.gamePhase === 'inspection') {
        handlePlayerMovement();
        updateCampers();
        drawCampsite();
        checkNearInteractables();

        // Update wildfire timer
        if (gameState.wildfireTimer !== null) {
            gameState.wildfireTimer -= 1/60; // Assuming 60 FPS

            if (gameState.wildfireTimer <= 0) {
                // Time's up - game over
                endGame(false, 'The wildfire spread out of control! Time ran out.');
                return;
            }

            // Check if all fires are extinguished
            if (gameState.currentCampsite && gameState.currentCampsite.fires) {
                const allExtinguished = gameState.currentCampsite.fires.every(fire => fire.health <= 0);
                if (allExtinguished) {
                    // Wildfire contained successfully
                    gameState.score++;
                    gameState.campsitesCompleted++;
                    gameState.wildfireTimer = null;
                    resultTitle.textContent = '✓ Wildfire Contained!';
                    resultTitle.style.color = '#4CAF50';
                    resultText.textContent = 'You successfully put out all the fires!\n\nGreat job, Ranger!';
                    resultMessage.classList.remove('hidden');
                    // Hide decision menu since wildfire is automatically illegal
                    campsiteMenu.classList.add('hidden');
                }
            }
        }
    }

    // Boundary checking to prevent walking on the sky
    gameState.playerX = Math.max(0, Math.min(CONFIG.canvas.width - CONFIG.player.width, gameState.playerX));
    gameState.playerY = Math.max(CONFIG.canvas.height * 0.4, Math.min(CONFIG.canvas.height - CONFIG.player.height, gameState.playerY));

    requestAnimationFrame(gameLoop);
}

// Start the game
init();
