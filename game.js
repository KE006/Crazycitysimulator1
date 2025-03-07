// Game constants
const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;
const PLAYER_SPEED = 5;
const PLAYER_SIZE = 30;
const CIVILIAN_SIZE = 25;
const CIVILIAN_SPEED = 2;
const PANIC_SPEED = 4;
const PANIC_THRESHOLD = 3; // Number of witnesses needed to trigger panic
const CITY_WIDTH = 5000; // Width of the entire city
const BUILDING_COUNT = 30;
const CIVILIAN_COUNT = 500;
const WEAPON_RANGE = {
    fist: 40,
    knife: 50,
    crowbar: 70,
    axe: 60,
    gun: 300,
    bomb: 150
};
const WEAPON_DAMAGE = {
    fist: 20,
    knife: 50,
    crowbar: 40,
    axe: 60,
    gun: 100,
    bomb: 200
};
const RELOAD_TIME = 1000; // milliseconds

// Add these constants for weapon visuals
const WEAPON_COLORS = {
    fist: '#8B4513',
    knife: '#C0C0C0',
    crowbar: '#708090',
    axe: '#A52A2A',
    gun: '#2F4F4F',
    bomb: '#000000'
};

const WEAPON_SHAPES = {
    fist: drawFist,
    knife: drawKnife,
    crowbar: drawCrowbar,
    axe: drawAxe,
    gun: drawGun,
    bomb: drawBomb
};

// Add ammo constants
const WEAPON_AMMO = {
    gun: 50,
    bomb: 5
};

const WEAPON_FIRE_RATE = {
    gun: 100 // milliseconds between shots
};

// Game variables
let canvas, ctx;
let player = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    speed: PLAYER_SPEED,
    currentWeapon: 'fist',
    isReloading: false,
    reloadTimeLeft: 0,
    direction: 'right', // 'left' or 'right'
    ammo: {
        gun: WEAPON_AMMO.gun,
        bomb: WEAPON_AMMO.bomb
    },
    lastFireTime: 0,
    isFiring: false
};

let camera = {
    x: 0,
    offsetMax: CITY_WIDTH - CANVAS_WIDTH
};

let buildings = [];
let civilians = [];
let witnesses = 0;
let panicMode = false;
let gameObjects = []; // For destroyed objects, blood, etc.

// Input handling
let keys = {};
let inventoryOpen = false;

// Add gravity constants
const GRAVITY = 0.5;
const GROUND_Y = CANVAS_HEIGHT - 30;

// Add bombs array to track active bombs
let bombs = [];
let explosions = [];
let flyingCivilians = [];

// Add helicopter variables
let helicopter = null;
let civilianDeathCount = 0;
const HELICOPTER_THRESHOLD = 400;
const HELICOPTER_SPEED = 3;
const HELICOPTER_DROP_COUNT = 2222; // Changed from 9999 to 2222

// Add death phrases array
const DEATH_PHRASES = [
    "Why me?!",
    "C'mon!",
    "Nooooo!",
    "I had plans!",
    "Not fair!",
    "I'm too young!",
    "My family...",
    "I regret nothing!",
    "Tell my wife...",
    "Avenge me!",
    "This is it?",
    "I see the light...",
    "Ouch!",
    "That hurt!",
    "I'll be back!",
    "Seriously?!"
];

// Add vehicle constants
const VEHICLE_SPEED = 10;
const VEHICLE_TYPES = [
    {
        name: "Car",
        width: 100,
        height: 50,
        color: "#D22",
        hitbox: 120
    },
    {
        name: "Truck",
        width: 150,
        height: 70,
        color: "#44A",
        hitbox: 170
    }
];

// Add vehicles array
let vehicles = [];
let inVehicle = false;
let currentVehicle = null;

// Add timer for regular reinforcements
let reinforcementTimer = 60000; // 60 seconds (1 minute)
let lastReinforcementTime = 0;

// Add special feature constants and variables
const SPECIAL_FEATURE_KEY = 'z';
let specialFeatureActive = false;
let specialFeatureCooldown = 0;
const SPECIAL_FEATURE_COOLDOWN = 30000; // 30 seconds

// Initialize the game
function init() {
    canvas = document.getElementById('game-canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext('2d');
    
    // Event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('click', handleClick);
    
    // Set up inventory
    const weaponElements = document.querySelectorAll('.weapon');
    weaponElements.forEach(weapon => {
        weapon.addEventListener('click', () => {
            selectWeapon(weapon.dataset.weapon);
            toggleInventory(false);
        });
    });
    
    // Add bomb to inventory if not already there
    const inventory = document.getElementById('inventory');
    if (!document.querySelector('[data-weapon="bomb"]')) {
        const bombElement = document.createElement('div');
        bombElement.className = 'weapon';
        bombElement.dataset.weapon = 'bomb';
        bombElement.textContent = 'Bomb';
        bombElement.addEventListener('click', () => {
            selectWeapon('bomb');
            toggleInventory(false);
        });
        inventory.appendChild(bombElement);
    }
    
    // Generate city
    generateBuildings();
    generateCivilians();
    generateVehicles();
    
    // Initialize reinforcement timer
    lastReinforcementTime = Date.now();
    
    // Start game loop
    gameLoop();
}

function handleKeyDown(e) {
    keys[e.key.toLowerCase()] = true;
    
    // Toggle inventory
    if (e.key.toLowerCase() === 'e') {
        toggleInventory(!inventoryOpen);
    }
    
    // Start attack
    if (e.key === ' ') {
        player.isFiring = true;
    }
    
    // Place bomb
    if (e.key.toLowerCase() === 'g' && player.currentWeapon === 'bomb') {
        placeBomb();
    }
    
    // Enter/exit vehicle
    if (e.key.toLowerCase() === 'w') {
        if (!inVehicle) {
            // Try to enter a vehicle
            tryEnterVehicle();
        } else {
            // Exit vehicle
            exitVehicle();
        }
    }
    
    // Activate special feature
    if (e.key.toLowerCase() === SPECIAL_FEATURE_KEY && specialFeatureCooldown <= 0) {
        activateSpecialFeature();
    }
}

function handleKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
    
    // Stop attack
    if (e.key === ' ') {
        player.isFiring = false;
    }
}

function handleClick(e) {
    if (player.currentWeapon === 'gun' && !player.isReloading) {
        shootGun();
    }
}

function toggleInventory(open) {
    inventoryOpen = open;
    const inventory = document.getElementById('inventory');
    if (open) {
        inventory.classList.remove('hidden');
    } else {
        inventory.classList.add('hidden');
    }
}

function selectWeapon(weapon) {
    player.currentWeapon = weapon;
    document.getElementById('current-weapon').textContent = `Current: ${weapon.charAt(0).toUpperCase() + weapon.slice(1)}`;
    
    // Update ammo counter
    if (weapon === 'gun') {
        document.getElementById('ammo-counter').textContent = `Ammo: ${player.ammo.gun}/${WEAPON_AMMO.gun}`;
    } else if (weapon === 'bomb') {
        document.getElementById('ammo-counter').textContent = `Bombs: ∞`;
    } else {
        document.getElementById('ammo-counter').textContent = `Ammo: ∞`;
    }
}

function generateBuildings() {
    for (let i = 0; i < BUILDING_COUNT; i++) {
        const width = Math.random() * 300 + 100;
        const height = Math.random() * 200 + 100;
        const x = Math.random() * (CITY_WIDTH - width);
        // Ensure buildings are exactly on the ground
        const y = CANVAS_HEIGHT - height - 30; // 30 is the ground height
        
        buildings.push({
            x, y, width, height,
            color: `rgb(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)})`
        });
    }
}

function generateCivilians() {
    for (let i = 0; i < CIVILIAN_COUNT; i++) {
        civilians.push({
            x: Math.random() * CITY_WIDTH,
            y: CANVAS_HEIGHT - 80,
            width: CIVILIAN_SIZE,
            height: CIVILIAN_SIZE,
            speed: CIVILIAN_SPEED,
            direction: Math.random() > 0.5 ? 1 : -1,
            witnessed: false,
            health: 100,
            dead: false,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
        });
    }
}

function generateVehicles() {
    // Create two vehicles at random positions
    for (let i = 0; i < 2; i++) {
        const vehicleType = VEHICLE_TYPES[i];
        vehicles.push({
            x: 500 + Math.random() * (CITY_WIDTH - 1000),
            y: CANVAS_HEIGHT - vehicleType.height - 30, // On the ground
            width: vehicleType.width,
            height: vehicleType.height,
            type: vehicleType,
            speed: VEHICLE_SPEED,
            direction: 'right'
        });
    }
}

function update() {
    if (inventoryOpen) return;
    
    // Update special feature cooldown
    if (specialFeatureCooldown > 0) {
        specialFeatureCooldown -= 16; // Approximately 16ms per frame at 60fps
    }
    
    // Check for timed reinforcements
    const now = Date.now();
    if (now - lastReinforcementTime >= reinforcementTimer && !helicopter) {
        spawnHelicopter();
        lastReinforcementTime = now;
    }
    
    if (inVehicle && currentVehicle) {
        // Vehicle movement
        let moveX = 0;
        
        if (keys['a'] || keys['arrowleft']) {
            moveX -= currentVehicle.speed;
            currentVehicle.direction = 'left';
        }
        if (keys['d'] || keys['arrowright']) {
            moveX += currentVehicle.speed;
            currentVehicle.direction = 'right';
        }
        
        // Update vehicle position
        currentVehicle.x += moveX;
        
        // Keep vehicle within bounds
        currentVehicle.x = Math.max(0, Math.min(currentVehicle.x, CITY_WIDTH - currentVehicle.width));
        
        // Check for collisions with civilians
        checkVehicleCollisions();
        
        // Update camera to follow vehicle
        player.x = currentVehicle.x + currentVehicle.width/2 - player.width/2;
    } else {
        // Normal player movement
        let moveX = 0;
        let moveY = 0;
        
        if (keys['w'] || keys['arrowup']) {
            moveY -= player.speed;
        }
        if (keys['s'] || keys['arrowdown']) {
            moveY += player.speed;
        }
        if (keys['a'] || keys['arrowleft']) {
            moveX -= player.speed;
            player.direction = 'left';
        }
        if (keys['d'] || keys['arrowright']) {
            moveX += player.speed;
            player.direction = 'right';
        }
        
        // Jump
        if (keys['shift']) {
            moveY -= player.speed * 2;
        }
        
        // Update player position
        player.x += moveX;
        player.y += moveY;
        
        // Keep player within bounds
        player.y = Math.max(50, Math.min(player.y, CANVAS_HEIGHT - player.height - 30));
        player.x = Math.max(0, Math.min(player.x, CITY_WIDTH - player.width));
    }
    
    // Update camera
    updateCamera();
    
    // Update civilians
    updateCivilians();
    
    // Update bombs
    updateBombs();
    
    // Update explosions
    updateExplosions();
    
    // Update flying civilians
    updateFlyingCivilians();
    
    // Update helicopter if active
    if (helicopter) {
        updateHelicopter();
    } else if (civilianDeathCount >= HELICOPTER_THRESHOLD) {
        // Spawn helicopter when threshold reached
        spawnHelicopter();
        lastReinforcementTime = now; // Reset timer when spawning due to death count
    }
    
    // Check panic mode
    if (witnesses >= PANIC_THRESHOLD && !panicMode) {
        panicMode = true;
        document.getElementById('panic-meter').textContent = 'Panic: 100%';
    }
}

function updateCamera() {
    // Camera follows player with some threshold
    const cameraThreshold = CANVAS_WIDTH / 4;
    
    if (player.x - camera.x > CANVAS_WIDTH - cameraThreshold) {
        camera.x = Math.min(player.x - (CANVAS_WIDTH - cameraThreshold), camera.offsetMax);
    } else if (player.x - camera.x < cameraThreshold) {
        camera.x = Math.max(player.x - cameraThreshold, 0);
    }
}

function updateCivilians() {
    // Create a spatial hash to prevent civilians from overlapping
    const occupiedPositions = {};
    
    civilians.forEach(civilian => {
        if (civilian.dead) return;
        
        // Check if civilian witnesses player attacking or violence
        const distance = Math.hypot(
            civilian.x - player.x,
            civilian.y - player.y
        );
        
        // Only witness if player is attacking or has a weapon out, not just proximity
        if (distance < 200 && !civilian.witnessed && 
            (gameObjects.some(obj => obj.type === 'attackAnimation' || obj.type === 'muzzleFlash' || obj.type === 'blood'))) {
            civilian.witnessed = true;
            witnesses++;
            document.getElementById('panic-meter').textContent = `Panic: ${Math.min(100, Math.floor((witnesses / PANIC_THRESHOLD) * 100))}%`;
        }
        
        // Move civilians
        if (panicMode || civilian.witnessed) {
            // Run away from player
            const direction = civilian.x < player.x ? -1 : 1;
            
            // Calculate new position
            let newX = civilian.x + direction * PANIC_SPEED;
            
            // Prevent running out of bounds - add buffer zone
            const bufferZone = 100;
            if (newX < bufferZone) {
                // If near left edge, run right instead
                newX = civilian.x + PANIC_SPEED;
            } else if (newX > CITY_WIDTH - civilian.width - bufferZone) {
                // If near right edge, run left instead
                newX = civilian.x - PANIC_SPEED;
            }
            
            // Check for collision with other civilians
            const gridX = Math.floor(newX / 30);
            const gridY = Math.floor(civilian.y / 30);
            const posKey = `${gridX},${gridY}`;
            
            if (!occupiedPositions[posKey]) {
                civilian.x = newX;
                occupiedPositions[posKey] = civilian;
            } else {
                // Try to move vertically to avoid collision
                const verticalOffset = Math.random() > 0.5 ? 5 : -5;
                civilian.y += verticalOffset;
                
                // Keep within ground bounds
                civilian.y = Math.max(CANVAS_HEIGHT - 80, Math.min(civilian.y, GROUND_Y - civilian.height));
            }
        } else {
            // Normal wandering
            let newX = civilian.x + civilian.direction * civilian.speed;
            
            // Change direction at edges with buffer
            const bufferZone = 50;
            if (newX <= bufferZone) {
                civilian.direction = 1;
                newX = bufferZone + 1;
            } else if (newX >= CITY_WIDTH - civilian.width - bufferZone) {
                civilian.direction = -1;
                newX = CITY_WIDTH - civilian.width - bufferZone - 1;
            } else if (Math.random() < 0.005) {
                civilian.direction *= -1;
            }
            
            // Check for collision with other civilians
            const gridX = Math.floor(newX / 30);
            const gridY = Math.floor(civilian.y / 30);
            const posKey = `${gridX},${gridY}`;
            
            if (!occupiedPositions[posKey]) {
                civilian.x = newX;
                occupiedPositions[posKey] = civilian;
            } else {
                // If position is occupied, try to change direction
                civilian.direction *= -1;
            }
        }
    });
}

function attack() {
    if (player.currentWeapon === 'gun') {
        shootGun();
        return;
    }
    
    const range = WEAPON_RANGE[player.currentWeapon];
    const damage = WEAPON_DAMAGE[player.currentWeapon];
    
    // Add attack animation
    gameObjects.push({
        type: 'attackAnimation',
        weapon: player.currentWeapon,
        x: player.x + (player.direction === 'right' ? player.width : 0),
        y: player.y + player.height / 2,
        direction: player.direction,
        timeLeft: 10
    });
    
    // Check for civilians in range
    civilians.forEach(civilian => {
        if (civilian.dead) return;
        
        const attackX = player.direction === 'right' ? player.x + player.width : player.x - range;
        const distance = Math.hypot(
            (civilian.x - camera.x) - (attackX - camera.x),
            civilian.y - player.y
        );
        
        if (distance < range) {
            civilian.health -= damage;
            
            // Add hit effect based on weapon
            let hitEffect = 'hit';
            if (player.currentWeapon === 'knife') hitEffect = 'cut';
            if (player.currentWeapon === 'axe') hitEffect = 'slash';
            if (player.currentWeapon === 'crowbar') hitEffect = 'smash';
            
            // Add blood effect
            gameObjects.push({
                type: 'blood',
                x: civilian.x,
                y: civilian.y,
                timeLeft: 100,
                size: damage / 10 + 5 // Size based on damage
            });
            
            // Add hit text
            gameObjects.push({
                type: 'hitText',
                text: `-${damage}`,
                x: civilian.x,
                y: civilian.y - 20,
                timeLeft: 30
            });
            
            if (civilian.health <= 0) {
                civilian.dead = true;
                civilianDeathCount++;
                // Nearby civilians witness this
                witnessDeath(civilian.x, civilian.y);
            }
        }
    });
}

function shootGun() {
    if (player.isReloading || player.ammo.gun <= 0) return;
    
    // Decrease ammo
    player.ammo.gun--;
    
    // Update ammo counter
    document.getElementById('ammo-counter').textContent = `Ammo: ${player.ammo.gun}/${WEAPON_AMMO.gun}`;
    
    const range = WEAPON_RANGE.gun;
    const damage = WEAPON_DAMAGE.gun;
    
    // Add muzzle flash
    gameObjects.push({
        type: 'muzzleFlash',
        x: player.x + (player.direction === 'right' ? player.width + 15 : -15),
        y: player.y + player.height / 2,
        timeLeft: 5
    });
    
    // Add bullet trail
    const bulletEndX = player.direction === 'right' ? 
        player.x + player.width + range : 
        player.x - range;
    
    gameObjects.push({
        type: 'bulletTrail',
        startX: player.x + (player.direction === 'right' ? player.width + 15 : -15),
        startY: player.y + player.height / 2,
        endX: bulletEndX,
        endY: player.y + player.height / 2,
        timeLeft: 5
    });
    
    // Check for hit
    const bulletDirection = player.direction === 'right' ? 1 : -1;
    const bulletStartX = player.x + (player.direction === 'right' ? player.width : 0);
    
    let hitSomething = false;
    
    civilians.forEach(civilian => {
        if (civilian.dead || hitSomething) return;
        
        // Check if bullet trajectory intersects with civilian
        if (bulletDirection > 0 && civilian.x > bulletStartX && civilian.x < bulletStartX + range ||
            bulletDirection < 0 && civilian.x < bulletStartX && civilian.x > bulletStartX - range) {
            
            const civilianY = civilian.y + civilian.height / 2;
            const playerY = player.y + player.height / 2;
            
            if (Math.abs(civilianY - playerY) < 30) {
                civilian.health -= damage;
                hitSomething = true;
                
                // Add impact point
                gameObjects.push({
                    type: 'bulletImpact',
                    x: civilian.x + (bulletDirection > 0 ? 0 : civilian.width),
                    y: player.y + player.height / 2,
                    timeLeft: 15
                });
                
                // Add blood effect
                gameObjects.push({
                    type: 'blood',
                    x: civilian.x,
                    y: civilian.y,
                    timeLeft: 100,
                    size: 20
                });
                
                // Add hit text
                gameObjects.push({
                    type: 'hitText',
                    text: `-${damage}`,
                    x: civilian.x,
                    y: civilian.y - 20,
                    timeLeft: 30
                });
                
                if (civilian.health <= 0) {
                    civilian.dead = true;
                    civilianDeathCount++;
                    // Nearby civilians witness this
                    witnessDeath(civilian.x, civilian.y);
                }
            }
        }
    });
    
    // Start reloading if out of ammo
    if (player.ammo.gun <= 0) {
        startReload();
    }
}

function witnessDeath(x, y) {
    civilians.forEach(civilian => {
        if (civilian.dead || civilian.witnessed) return;
        
        // Only witness if they can "see" the death
        const distance = Math.hypot(civilian.x - x, civilian.y - y);
        
        // Check if there's a line of sight (not behind buildings)
        let canSee = true;
        
        // Check if any buildings block the view
        buildings.forEach(building => {
            // Simple line-of-sight check
            if (x < building.x && civilian.x > building.x + building.width ||
                x > building.x + building.width && civilian.x < building.x) {
                // Death and civilian are on opposite sides of the building
                if (y >= building.y && y <= building.y + building.height) {
                    canSee = false;
                }
            }
        });
        
        if (distance < 200 && canSee) {
            civilian.witnessed = true;
            witnesses++;
            document.getElementById('panic-meter').textContent = `Panic: ${Math.min(100, Math.floor((witnesses / PANIC_THRESHOLD) * 100))}%`;
        }
    });
    
    // Add death phrase at the death location
    const phrase = DEATH_PHRASES[Math.floor(Math.random() * DEATH_PHRASES.length)];
    
    gameObjects.push({
        type: 'speechBubble',
        x: x,
        y: y - 40,
        text: phrase,
        timeLeft: 90
    });
}

// Add these functions for drawing different weapons
function drawFist(x, y, direction) {
    ctx.fillStyle = WEAPON_COLORS.fist;
    if (direction === 'right') {
        ctx.beginPath();
        ctx.arc(x + 15, y, 10, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.arc(x - 15, y, 10, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawKnife(x, y, direction) {
    ctx.fillStyle = WEAPON_COLORS.knife;
    if (direction === 'right') {
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x + 25, y);
        ctx.lineTo(x, y + 5);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x - 25, y);
        ctx.lineTo(x, y + 5);
        ctx.fill();
    }
}

function drawCrowbar(x, y, direction) {
    ctx.strokeStyle = WEAPON_COLORS.crowbar;
    ctx.lineWidth = 3;
    if (direction === 'right') {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 20, y);
        ctx.lineTo(x + 25, y - 8);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 20, y);
        ctx.lineTo(x - 25, y - 8);
        ctx.stroke();
    }
}

function drawAxe(x, y, direction) {
    ctx.fillStyle = WEAPON_COLORS.axe;
    if (direction === 'right') {
        // Handle
        ctx.fillRect(x, y - 2, 20, 4);
        // Blade
        ctx.beginPath();
        ctx.moveTo(x + 20, y - 15);
        ctx.lineTo(x + 30, y);
        ctx.lineTo(x + 20, y + 15);
        ctx.fill();
    } else {
        // Handle
        ctx.fillRect(x - 20, y - 2, 20, 4);
        // Blade
        ctx.beginPath();
        ctx.moveTo(x - 20, y - 15);
        ctx.lineTo(x - 30, y);
        ctx.lineTo(x - 20, y + 15);
        ctx.fill();
    }
}

function drawGun(x, y, direction) {
    ctx.fillStyle = WEAPON_COLORS.gun;
    if (direction === 'right') {
        // Gun body
        ctx.fillRect(x, y - 3, 15, 6);
        // Barrel
        ctx.fillRect(x + 15, y - 1, 10, 2);
        // Handle
        ctx.fillRect(x + 5, y + 3, 5, 8);
    } else {
        // Gun body
        ctx.fillRect(x - 15, y - 3, 15, 6);
        // Barrel
        ctx.fillRect(x - 25, y - 1, 10, 2);
        // Handle
        ctx.fillRect(x - 10, y + 3, 5, 8);
    }
}

function drawBomb(x, y, direction) {
    ctx.fillStyle = WEAPON_COLORS.bomb;
    ctx.beginPath();
    ctx.arc(x + (direction === 'right' ? 15 : -15), y, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw fuse
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + (direction === 'right' ? 15 : -15), y - 10);
    ctx.lineTo(x + (direction === 'right' ? 20 : -20), y - 20);
    ctx.stroke();
    
    // Draw spark
    ctx.fillStyle = '#FF0';
    ctx.beginPath();
    ctx.arc(x + (direction === 'right' ? 20 : -20), y - 20, 3, 0, Math.PI * 2);
    ctx.fill();
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT - 30);
    skyGradient.addColorStop(0, '#1E90FF');
    skyGradient.addColorStop(1, '#87CEEB');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT - 30);
    
    // Draw ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, CANVAS_HEIGHT - 30, CANVAS_WIDTH, 30);
    
    // Draw buildings
    buildings.forEach(building => {
        // Building shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(building.x - camera.x + 10, building.y + 10, building.width, building.height);
        
        // Building body
        ctx.fillStyle = building.color;
        ctx.fillRect(building.x - camera.x, building.y, building.width, building.height);
        
        // Building outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(building.x - camera.x, building.y, building.width, building.height);
        
        // Draw windows
        ctx.fillStyle = '#FFFF99';
        const windowSize = 15;
        const windowSpacing = 25;
        
        for (let wx = windowSize; wx < building.width - windowSize; wx += windowSpacing) {
            for (let wy = windowSize; wy < building.height - windowSize; wy += windowSpacing) {
                if (Math.random() > 0.3) { // Some windows are lit
                    ctx.fillRect(building.x - camera.x + wx, building.y + wy, windowSize, windowSize);
                    
                    // Window frame
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(building.x - camera.x + wx, building.y + wy, windowSize, windowSize);
                }
            }
        }
        
        // Draw door
        ctx.fillStyle = '#8B4513';
        const doorWidth = 30;
        const doorHeight = 60;
        const doorX = building.x - camera.x + building.width / 2 - doorWidth / 2;
        const doorY = building.y + building.height - doorHeight;
        ctx.fillRect(doorX, doorY, doorWidth, doorHeight);
        
        // Door handle
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(doorX + doorWidth - 5, doorY + doorHeight / 2, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw civilians
    civilians.forEach(civilian => {
        if (civilian.dead) {
            // Draw dead civilian
            ctx.fillStyle = 'darkred';
            ctx.fillRect(civilian.x - camera.x, civilian.y + civilian.height - 10, civilian.width, 10);
            
            // Draw X eyes
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            
            // Left X
            ctx.beginPath();
            ctx.moveTo(civilian.x - camera.x + civilian.width / 2 - 5, civilian.y - 15);
            ctx.lineTo(civilian.x - camera.x + civilian.width / 2 - 1, civilian.y - 5);
            ctx.moveTo(civilian.x - camera.x + civilian.width / 2 - 5, civilian.y - 5);
            ctx.lineTo(civilian.x - camera.x + civilian.width / 2 - 1, civilian.y - 15);
            ctx.stroke();
            
            // Right X
            ctx.beginPath();
            ctx.moveTo(civilian.x - camera.x + civilian.width / 2 + 5, civilian.y - 15);
            ctx.lineTo(civilian.x - camera.x + civilian.width / 2 + 1, civilian.y - 5);
            ctx.moveTo(civilian.x - camera.x + civilian.width / 2 + 5, civilian.y - 5);
            ctx.lineTo(civilian.x - camera.x + civilian.width / 2 + 1, civilian.y - 15);
            ctx.stroke();
        } else {
            // Draw living civilian
            // Body
            ctx.fillStyle = civilian.color;
            ctx.fillRect(civilian.x - camera.x, civilian.y, civilian.width, civilian.height);
            
            // Head
            ctx.beginPath();
            ctx.arc(
                civilian.x - camera.x + civilian.width / 2,
                civilian.y - 10,
                10,
                0,
                Math.PI * 2
            );
            ctx.fill();
            
            // Eyes
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(
                civilian.x - camera.x + civilian.width / 2 - 3,
                civilian.y - 12,
                2,
                0,
                Math.PI * 2
            );
            ctx.arc(
                civilian.x - camera.x + civilian.width / 2 + 3,
                civilian.y - 12,
                2,
                0,
                Math.PI * 2
            );
            ctx.fill();
            
            // Mouth (happy or scared)
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            if (civilian.witnessed || panicMode) {
                // Scared mouth (O shape)
                ctx.arc(
                    civilian.x - camera.x + civilian.width / 2,
                    civilian.y - 7,
                    3,
                    0,
                    Math.PI,
                    false
                );
            } else {
                // Happy mouth (smile)
                ctx.arc(
                    civilian.x - camera.x + civilian.width / 2,
                    civilian.y - 7,
                    3,
                    0,
                    Math.PI,
                    false
                );
            }
            ctx.stroke();
            
            // Arms
            ctx.strokeStyle = civilian.color;
            ctx.lineWidth = 3;
            
            // Left arm
            ctx.beginPath();
            ctx.moveTo(civilian.x - camera.x, civilian.y + 10);
            
            if (civilian.witnessed || panicMode) {
                // Arms up if panicking
                ctx.lineTo(civilian.x - camera.x - 10, civilian.y - 5);
            } else {
                ctx.lineTo(civilian.x - camera.x - 10, civilian.y + 15);
            }
            ctx.stroke();
            
            // Right arm
            ctx.beginPath();
            ctx.moveTo(civilian.x - camera.x + civilian.width, civilian.y + 10);
            
            if (civilian.witnessed || panicMode) {
                // Arms up if panicking
                ctx.lineTo(civilian.x - camera.x + civilian.width + 10, civilian.y - 5);
            } else {
                ctx.lineTo(civilian.x - camera.x + civilian.width + 10, civilian.y + 15);
            }
            ctx.stroke();
            
            // Legs
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            
            // Left leg
            ctx.beginPath();
            ctx.moveTo(civilian.x - camera.x + 5, civilian.y + civilian.height);
            ctx.lineTo(civilian.x - camera.x, civilian.y + civilian.height + 15);
            ctx.stroke();
            
            // Right leg
            ctx.beginPath();
            ctx.moveTo(civilian.x - camera.x + civilian.width - 5, civilian.y + civilian.height);
            ctx.lineTo(civilian.x - camera.x + civilian.width, civilian.y + civilian.height + 15);
            ctx.stroke();
        }
        
        // Health bar for debugging
        if (!civilian.dead && civilian.health < 100) {
            const healthPercent = civilian.health / 100;
            ctx.fillStyle = 'red';
            ctx.fillRect(civilian.x - camera.x, civilian.y - 20, civilian.width, 5);
            ctx.fillStyle = 'green';
            ctx.fillRect(civilian.x - camera.x, civilian.y - 20, civilian.width * healthPercent, 5);
        }
    });
    
    // Draw game objects (blood, effects, etc.)
    gameObjects.forEach((obj, index) => {
        if (obj.timeLeft <= 0) {
            gameObjects.splice(index, 1);
            return;
        }
        
        if (obj.type === 'blood') {
            ctx.fillStyle = 'rgba(255, 0, 0, ' + (obj.timeLeft / 100) + ')';
            ctx.beginPath();
            ctx.arc(obj.x - camera.x, obj.y, obj.size || 15, 0, Math.PI * 2);
            ctx.fill();
        } else if (obj.type === 'muzzleFlash') {
            ctx.fillStyle = 'rgba(255, 255, 0, ' + (obj.timeLeft / 5) + ')';
            ctx.beginPath();
            ctx.arc(obj.x - camera.x, obj.y, 10, 0, Math.PI * 2);
            ctx.fill();
            
            // Add glow effect
            const gradient = ctx.createRadialGradient(
                obj.x - camera.x, obj.y, 5,
                obj.x - camera.x, obj.y, 20
            );
            gradient.addColorStop(0, 'rgba(255, 255, 0, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(obj.x - camera.x, obj.y, 20, 0, Math.PI * 2);
            ctx.fill();
        } else if (obj.type === 'bulletTrail') {
            ctx.strokeStyle = 'rgba(255, 255, 255, ' + (obj.timeLeft / 5) + ')';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(obj.startX - camera.x, obj.startY);
            ctx.lineTo(obj.endX - camera.x, obj.endY);
            ctx.stroke();
        } else if (obj.type === 'bulletImpact') {
            ctx.fillStyle = 'rgba(255, 255, 255, ' + (obj.timeLeft / 15) + ')';
            ctx.beginPath();
            ctx.arc(obj.x - camera.x, obj.y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Impact lines
            ctx.strokeStyle = 'rgba(255, 255, 255, ' + (obj.timeLeft / 15) + ')';
            ctx.lineWidth = 1;
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i;
                ctx.beginPath();
                ctx.moveTo(obj.x - camera.x, obj.y);
                ctx.lineTo(
                    obj.x - camera.x + Math.cos(angle) * 10,
                    obj.y + Math.sin(angle) * 10
                );
                ctx.stroke();
            }
        } else if (obj.type === 'hitText') {
            ctx.fillStyle = 'rgba(255, 0, 0, ' + (obj.timeLeft / 30) + ')';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(obj.text, obj.x - camera.x, obj.y - (30 - obj.timeLeft));
        } else if (obj.type === 'attackAnimation') {
            // Draw attack animation based on weapon
            const x = obj.x - camera.x;
            const y = obj.y;
            
            if (WEAPON_SHAPES[obj.weapon]) {
                WEAPON_SHAPES[obj.weapon](x, y, obj.direction);
            }
        } else if (obj.type === 'bombPlaced') {
            // Draw bomb countdown
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(Math.ceil(obj.timeLeft / 1000), obj.x - camera.x, obj.y - 30);
        } else if (obj.type === 'bombTick') {
            // Draw tick animation
            ctx.fillStyle = `rgba(255, 0, 0, ${obj.timeLeft / 30})`;
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(obj.text, obj.x - camera.x, obj.y - (30 - obj.timeLeft) / 2);
        } else if (obj.type === 'explosionText') {
            // Draw explosion text
            ctx.fillStyle = `rgba(255, 50, 0, ${obj.timeLeft / 60})`;
            ctx.font = 'bold 40px Impact';
            ctx.textAlign = 'center';
            ctx.fillText(obj.text, obj.x - camera.x, obj.y - 20);
        } else if (obj.type === 'helicopterAnnouncement') {
            ctx.fillStyle = `rgba(255, 255, 255, ${obj.timeLeft / 180})`;
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(obj.text, obj.x, obj.y);
            
            // Add flashing effect
            if (Math.floor(obj.timeLeft / 10) % 2 === 0) {
                ctx.fillStyle = `rgba(255, 0, 0, ${obj.timeLeft / 180})`;
                ctx.fillText(obj.text, obj.x, obj.y);
            }
        } else if (obj.type === 'dropAnnouncement') {
            ctx.fillStyle = `rgba(255, 255, 255, ${obj.timeLeft / 120})`;
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(obj.text, obj.x - camera.x, obj.y);
        } else if (obj.type === 'reloadText') {
            ctx.fillStyle = `rgba(255, 255, 255, ${obj.timeLeft / (RELOAD_TIME / 16)})`;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(obj.text, obj.x - camera.x, obj.y);
        } else if (obj.type === 'speechBubble') {
            // Draw speech bubble
            const textWidth = ctx.measureText(obj.text).width;
            const bubbleWidth = textWidth + 20;
            const bubbleHeight = 30;
            
            // Bubble background
            ctx.fillStyle = `rgba(255, 255, 255, ${obj.timeLeft / 90})`;
            ctx.beginPath();
            ctx.roundRect(obj.x - camera.x - bubbleWidth/2, obj.y - bubbleHeight/2, bubbleWidth, bubbleHeight, 10);
            ctx.fill();
            
            // Bubble pointer
            ctx.beginPath();
            ctx.moveTo(obj.x - camera.x, obj.y + bubbleHeight/2);
            ctx.lineTo(obj.x - camera.x + 10, obj.y + bubbleHeight/2 + 10);
            ctx.lineTo(obj.x - camera.x + 20, obj.y + bubbleHeight/2);
            ctx.fill();
            
            // Text
            ctx.fillStyle = `rgba(0, 0, 0, ${obj.timeLeft / 90})`;
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(obj.text, obj.x - camera.x, obj.y + 5);
        } else if (obj.type === 'vehicleText') {
            ctx.fillStyle = `rgba(255, 255, 255, ${obj.timeLeft / 60})`;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(obj.text, obj.x - camera.x, obj.y);
        } else if (obj.type === 'vehicleImpact') {
            // Draw impact lines
            ctx.strokeStyle = `rgba(255, 255, 255, ${obj.timeLeft / 20})`;
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i;
                const length = 20 + Math.random() * 10;
                ctx.beginPath();
                ctx.moveTo(obj.x - camera.x, obj.y);
                ctx.lineTo(
                    obj.x - camera.x + Math.cos(angle) * length,
                    obj.y + Math.sin(angle) * length
                );
                ctx.stroke();
            }
        } else if (obj.type === 'timerAnnouncement') {
            ctx.fillStyle = `rgba(255, 255, 255, ${obj.timeLeft / 120})`;
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(obj.text, obj.x, obj.y);
            
            // Add flashing effect
            if (Math.floor(obj.timeLeft / 10) % 2 === 0) {
                ctx.fillStyle = `rgba(0, 255, 0, ${obj.timeLeft / 120})`;
                ctx.fillText(obj.text, obj.x, obj.y);
            }
        } else if (obj.type === 'specialFeatureAnnouncement') {
            ctx.fillStyle = `rgba(255, 0, 0, ${obj.timeLeft / 180})`;
            ctx.font = 'bold 40px Impact';
            ctx.textAlign = 'center';
            ctx.fillText(obj.text, obj.x, obj.y);
            
            // Add flashing effect
            if (Math.floor(obj.timeLeft / 5) % 2 === 0) {
                ctx.fillStyle = `rgba(255, 255, 255, ${obj.timeLeft / 180})`;
                ctx.fillText(obj.text, obj.x, obj.y);
            }
        }
        
        obj.timeLeft--;
    });
    
    // Draw bombs
    bombs.forEach(bomb => {
        // Draw bomb
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(bomb.x - camera.x, bomb.y, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw fuse
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bomb.x - camera.x, bomb.y - 15);
        ctx.lineTo(bomb.x - camera.x, bomb.y - 25);
        ctx.stroke();
        
        // Draw spark
        ctx.fillStyle = '#FF0';
        ctx.beginPath();
        ctx.arc(bomb.x - camera.x, bomb.y - 25, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw countdown
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(Math.ceil(bomb.timeLeft / 1000), bomb.x - camera.x, bomb.y + 5);
    });

    // Draw explosions
    explosions.forEach(explosion => {
        const gradient = ctx.createRadialGradient(
            explosion.x - camera.x, explosion.y, 0,
            explosion.x - camera.x, explosion.y, explosion.radius
        );
        gradient.addColorStop(0, `rgba(255, 200, 0, ${explosion.alpha})`);
        gradient.addColorStop(0.5, `rgba(255, 100, 0, ${explosion.alpha * 0.8})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(explosion.x - camera.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw flying civilians with parachutes
    flyingCivilians.forEach(civilian => {
        ctx.save();
        ctx.translate(civilian.x - camera.x + civilian.width / 2, civilian.y + civilian.height / 2);
        ctx.rotate(civilian.rotation);
        
        if (civilian.dead) {
            // Draw dead flying civilian
            ctx.fillStyle = 'darkred';
            ctx.fillRect(-civilian.width / 2, -civilian.height / 2, civilian.width, civilian.height);
        } else {
            // Draw flying civilian
            ctx.fillStyle = civilian.color;
            ctx.fillRect(-civilian.width / 2, -civilian.height / 2, civilian.width, civilian.height);
            
            // Draw head
            ctx.beginPath();
            ctx.arc(0, -civilian.height / 2 - 10, 10, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw parachute if they have one
            if (civilian.hasParachute) {
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(0, -civilian.height - 30, 25, Math.PI, 0, false);
                ctx.fill();
                
                // Draw strings
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-20, -civilian.height - 30);
                ctx.lineTo(0, -civilian.height / 2);
                ctx.moveTo(20, -civilian.height - 30);
                ctx.lineTo(0, -civilian.height / 2);
                ctx.stroke();
            }
        }
        
        ctx.restore();
    });
    
    // Draw vehicles
    vehicles.forEach(vehicle => {
        // Draw vehicle body
        ctx.fillStyle = vehicle.type.color;
        ctx.fillRect(vehicle.x - camera.x, vehicle.y, vehicle.width, vehicle.height);
        
        // Draw windows
        ctx.fillStyle = '#AAF';
        ctx.fillRect(vehicle.x - camera.x + vehicle.width * 0.7, 
                    vehicle.y + 10, 
                    vehicle.width * 0.2, 
                    vehicle.height * 0.4);
        
        // Draw wheels
        ctx.fillStyle = '#333';
        const wheelSize = vehicle.height * 0.3;
        ctx.fillRect(vehicle.x - camera.x + vehicle.width * 0.15, 
                    vehicle.y + vehicle.height - wheelSize/2, 
                    wheelSize, 
                    wheelSize);
        ctx.fillRect(vehicle.x - camera.x + vehicle.width * 0.75, 
                    vehicle.y + vehicle.height - wheelSize/2, 
                    wheelSize, 
                    wheelSize);
    });
    
    // Draw player only if not in vehicle
    if (!player.isHidden) {
        // Player shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(player.x - camera.x + 5, player.y + 5, player.width, player.height);
        
        // Player body
        ctx.fillStyle = 'blue';
        ctx.fillRect(player.x - camera.x, player.y, player.width, player.height);
        
        // Player head
        ctx.beginPath();
        ctx.arc(
            player.x - camera.x + player.width / 2,
            player.y - 15,
            15,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Player eyes
        ctx.fillStyle = 'white';
        if (player.direction === 'right') {
            ctx.beginPath();
            ctx.arc(
                player.x - camera.x + player.width / 2 + 5,
                player.y - 18,
                3,
                0,
                Math.PI * 2
            );
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(
                player.x - camera.x + player.width / 2 - 5,
                player.y - 18,
                3,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
        
        // Draw weapon
        const weaponX = player.x - camera.x + (player.direction === 'right' ? player.width : 0);
        const weaponY = player.y + player.height / 2;
        
        if (WEAPON_SHAPES[player.currentWeapon]) {
            WEAPON_SHAPES[player.currentWeapon](weaponX, weaponY, player.direction);
        }
        
        // Draw reloading indicator
        if (player.isReloading) {
            ctx.fillStyle = 'white';
            ctx.font = '14px Arial';
            ctx.fillText('Reloading...', player.x - camera.x, player.y - 30);
            
            // Progress bar
            const reloadProgress = 1 - (player.reloadTimeLeft / RELOAD_TIME);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(player.x - camera.x - 10, player.y - 25, player.width + 20, 5);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(player.x - camera.x - 10, player.y - 25, (player.width + 20) * reloadProgress, 5);
        }
    }

    // Draw reinforcement timer if no helicopter is active
    if (!helicopter) {
        const timeRemaining = Math.max(0, Math.ceil((reinforcementTimer - (Date.now() - lastReinforcementTime)) / 1000));
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`Next reinforcements: ${timeRemaining}s`, CANVAS_WIDTH - 20, 30);
    }

    // Draw special feature cooldown if applicable
    if (specialFeatureCooldown > 0) {
        const cooldownPercent = specialFeatureCooldown / SPECIAL_FEATURE_COOLDOWN;
        const cooldownText = `RAMPAGE: ${Math.ceil(specialFeatureCooldown / 1000)}s`;
        
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillRect(20, 60, 150 * cooldownPercent, 15);
        
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(cooldownText, 25, 72);
    } else if (specialFeatureCooldown <= 0) {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.fillRect(20, 60, 150, 15);
        
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('RAMPAGE READY - PRESS Z', 25, 72);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game when the page loads
window.onload = init;

// Function to place a bomb
function placeBomb() {
    // Check if player is near a building
    let nearBuilding = null;
    
    for (let i = 0; i < buildings.length; i++) {
        const building = buildings[i];
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        
        // Check if player is near the building
        if (
            playerCenterX > building.x - 50 && 
            playerCenterX < building.x + building.width + 50 &&
            playerCenterY > building.y - 50 && 
            playerCenterY < building.y + building.height + 50
        ) {
            nearBuilding = building;
            break;
        }
    }
    
    if (nearBuilding) {
        // No ammo check - bombs are infinite now
        document.getElementById('ammo-counter').textContent = `Bombs: ∞`;
        
        // Place bomb at the building
        const bombX = nearBuilding.x + nearBuilding.width / 2;
        const bombY = nearBuilding.y + nearBuilding.height - 20;
        
        bombs.push({
            x: bombX,
            y: bombY,
            building: nearBuilding,
            timeLeft: 5000, // 5 seconds
            lastTick: Date.now()
        });
        
        // Add visual indicator
        gameObjects.push({
            type: 'bombPlaced',
            x: bombX,
            y: bombY,
            timeLeft: 5000,
            lastTick: Date.now()
        });
    }
}

// Function to update bombs
function updateBombs() {
    const now = Date.now();
    
    for (let i = bombs.length - 1; i >= 0; i--) {
        const bomb = bombs[i];
        const deltaTime = now - bomb.lastTick;
        
        bomb.timeLeft -= deltaTime;
        bomb.lastTick = now;
        
        if (bomb.timeLeft <= 0) {
            // Explode the bomb
            createExplosion(bomb.x, bomb.y, bomb.building);
            bombs.splice(i, 1);
        }
    }
    
    // Also update bomb visual indicators
    gameObjects.forEach(obj => {
        if (obj.type === 'bombPlaced') {
            const deltaTime = now - obj.lastTick;
            obj.timeLeft -= deltaTime;
            obj.lastTick = now;
            
            // Add ticking effect
            if (Math.floor(obj.timeLeft / 1000) !== Math.floor((obj.timeLeft + deltaTime) / 1000)) {
                // Add tick visual
                gameObjects.push({
                    type: 'bombTick',
                    x: obj.x,
                    y: obj.y - 20,
                    text: Math.ceil(obj.timeLeft / 1000).toString(),
                    timeLeft: 30
                });
            }
        }
    });
}

// Function to create an explosion
function createExplosion(x, y, building) {
    // Create explosion visual effect
    explosions.push({
        x: x,
        y: y,
        radius: 10,
        maxRadius: 150,
        growthRate: 10,
        alpha: 1,
        fadeRate: 0.02
    });
    
    // Add explosion sound effect (visual representation)
    gameObjects.push({
        type: 'explosionText',
        x: x,
        y: y,
        text: 'BOOM!',
        timeLeft: 60
    });
    
    // Generate flying civilians from the building
    const civilianCount = Math.floor(Math.random() * 20) + 10; // 10-30 civilians
    
    for (let i = 0; i < civilianCount; i++) {
        const civilianX = building.x + Math.random() * building.width;
        const civilianY = building.y + Math.random() * building.height;
        
        // Calculate explosion force direction
        const centerX = x;
        const centerY = y;
        const dx = civilianX - centerX;
        const dy = civilianY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize and apply force
        const forceX = (dx / distance) * (Math.random() * 10 + 5);
        const forceY = (dy / distance) * (Math.random() * 10 - 15); // Negative to go up
        
        flyingCivilians.push({
            x: civilianX,
            y: civilianY,
            width: CIVILIAN_SIZE,
            height: CIVILIAN_SIZE,
            velocityX: forceX,
            velocityY: forceY,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            onGround: false,
            health: 100,
            dead: false
        });
    }
    
    // Remove the building
    const buildingIndex = buildings.findIndex(b => b === building);
    if (buildingIndex !== -1) {
        buildings.splice(buildingIndex, 1);
    }
    
    // Affect nearby civilians
    civilians.forEach(civilian => {
        if (civilian.dead) return;
        
        const dx = civilian.x - x;
        const dy = civilian.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < WEAPON_RANGE.bomb) {
            // Calculate damage based on distance
            const damage = Math.floor(WEAPON_DAMAGE.bomb * (1 - distance / WEAPON_RANGE.bomb));
            civilian.health -= damage;
            
            // Add blood effect
            gameObjects.push({
                type: 'blood',
                x: civilian.x,
                y: civilian.y,
                timeLeft: 100,
                size: damage / 10 + 5
            });
            
            // Add hit text
            gameObjects.push({
                type: 'hitText',
                text: `-${damage}`,
                x: civilian.x,
                y: civilian.y - 20,
                timeLeft: 30
            });
            
            if (civilian.health <= 0) {
                civilian.dead = true;
                civilianDeathCount++;
                // Nearby civilians witness this
                witnessDeath(civilian.x, civilian.y);
            } else {
                // Knock back the civilian
                const knockbackX = (dx / distance) * 10;
                civilian.x += knockbackX;
                civilian.witnessed = true;
                witnesses++;
            }
        }
        
        // All civilians within a larger radius witness the explosion
        if (distance < WEAPON_RANGE.bomb * 2 && !civilian.witnessed) {
            civilian.witnessed = true;
            witnesses++;
            document.getElementById('panic-meter').textContent = `Panic: ${Math.min(100, Math.floor((witnesses / PANIC_THRESHOLD) * 100))}%`;
        }
    });
}

// Function to update explosions
function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        
        // Grow the explosion
        explosion.radius += explosion.growthRate;
        
        // Fade the explosion
        if (explosion.radius >= explosion.maxRadius / 2) {
            explosion.alpha -= explosion.fadeRate;
        }
        
        // Remove when completely faded
        if (explosion.alpha <= 0) {
            explosions.splice(i, 1);
        }
    }
}

// Function to update flying civilians
function updateFlyingCivilians() {
    for (let i = flyingCivilians.length - 1; i >= 0; i--) {
        const civilian = flyingCivilians[i];
        
        // Apply gravity (less if they have a parachute)
        if (civilian.hasParachute) {
            civilian.velocityY += GRAVITY * 0.2;
            // Cap fall speed with parachute
            civilian.velocityY = Math.min(civilian.velocityY, 2);
        } else {
            civilian.velocityY += GRAVITY;
        }
        
        // Update position
        civilian.x += civilian.velocityX;
        civilian.y += civilian.velocityY;
        
        // Update rotation
        civilian.rotation += civilian.rotationSpeed;
        
        // Check if hit ground
        if (civilian.y + civilian.height >= GROUND_Y && !civilian.onGround) {
            civilian.onGround = true;
            civilian.velocityY = 0;
            civilian.y = GROUND_Y - civilian.height;
            
            // If they had a parachute, they survive
            if (civilian.hasParachute) {
                // Add to regular civilians
                civilians.push({
                    x: civilian.x,
                    y: civilian.y,
                    width: civilian.width,
                    height: civilian.height,
                    speed: CIVILIAN_SPEED,
                    direction: Math.random() > 0.5 ? 1 : -1,
                    witnessed: false, // New civilians don't know what's happening yet
                    health: 100,
                    dead: false,
                    color: civilian.color
                });
                
                // Remove from flying civilians
                flyingCivilians.splice(i, 1);
            } else {
                // 50% chance to die on impact without parachute
                if (Math.random() < 0.5) {
                    civilian.dead = true;
                    civilianDeathCount++;
                    
                    // Add blood splatter
                    gameObjects.push({
                        type: 'blood',
                        x: civilian.x,
                        y: civilian.y + civilian.height,
                        timeLeft: 200,
                        size: 25
                    });
                } else {
                    // Add to regular civilians
                    civilians.push({
                        x: civilian.x,
                        y: civilian.y,
                        width: civilian.width,
                        height: civilian.height,
                        speed: CIVILIAN_SPEED,
                        direction: Math.random() > 0.5 ? 1 : -1,
                        witnessed: true, // They definitely witnessed the explosion
                        health: 50, // Injured
                        dead: false,
                        color: civilian.color
                    });
                    
                    // Remove from flying civilians
                    flyingCivilians.splice(i, 1);
                }
            }
        }
        
        // Remove if out of bounds
        if (civilian.x < -100 || civilian.x > CITY_WIDTH + 100 || civilian.y > CANVAS_HEIGHT + 100) {
            flyingCivilians.splice(i, 1);
        }
    }
}

// Function to spawn helicopter
function spawnHelicopter() {
    helicopter = {
        x: -200,
        y: 100,
        width: 150,
        height: 60,
        speed: HELICOPTER_SPEED,
        dropPoint: CITY_WIDTH / 2,
        hasDropped: false,
        leavingScene: false
    };
    
    // Add helicopter sound effect (visual)
    gameObjects.push({
        type: 'helicopterAnnouncement',
        x: CANVAS_WIDTH / 2,
        y: 100,
        text: 'REINFORCEMENTS INCOMING!',
        timeLeft: 180
    });
}

// Function to update helicopter
function updateHelicopter() {
    // Move helicopter
    if (!helicopter.leavingScene) {
        helicopter.x += helicopter.speed;
        
        // Check if at drop point
        if (helicopter.x >= helicopter.dropPoint && !helicopter.hasDropped) {
            dropReinforcements();
            helicopter.hasDropped = true;
            helicopter.leavingScene = true;
        }
    } else {
        helicopter.x += helicopter.speed * 2;
        
        // Remove helicopter when off screen
        if (helicopter.x > CITY_WIDTH + 200) {
            helicopter = null;
            civilianDeathCount = 0; // Reset death counter
            
            // Add next reinforcement timer notification
            gameObjects.push({
                type: 'timerAnnouncement',
                x: CANVAS_WIDTH / 2,
                y: 50,
                text: 'NEXT REINFORCEMENTS IN 60 SECONDS',
                timeLeft: 120
            });
        }
    }
}

// Function to drop reinforcements
function dropReinforcements() {
    // Visual effect for drop
    gameObjects.push({
        type: 'dropAnnouncement',
        x: helicopter.x,
        y: helicopter.y + 80,
        text: 'DROPPING CIVILIANS',
        timeLeft: 120
    });
    
    // Add new civilians in batches
    const batchSize = 50;
    const totalBatches = HELICOPTER_DROP_COUNT / batchSize;
    
    for (let batch = 0; batch < totalBatches; batch++) {
        setTimeout(() => {
            for (let i = 0; i < batchSize; i++) {
                const dropX = helicopter.x - 100 + Math.random() * 200;
                
                // Create parachuting civilian
                flyingCivilians.push({
                    x: dropX,
                    y: helicopter.y + 20,
                    width: CIVILIAN_SIZE,
                    height: CIVILIAN_SIZE,
                    velocityX: (Math.random() - 0.5) * 2,
                    velocityY: Math.random() * 2 + 1, // Slower fall with parachute
                    rotation: 0,
                    rotationSpeed: 0,
                    color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                    onGround: false,
                    health: 100,
                    dead: false,
                    hasParachute: true
                });
            }
        }, batch * 500); // Drop a batch every 500ms
    }
}

// Function to start reloading
function startReload() {
    player.isReloading = true;
    player.reloadTimeLeft = RELOAD_TIME;
    
    // Add visual indicator
    gameObjects.push({
        type: 'reloadText',
        x: player.x,
        y: player.y - 30,
        text: 'RELOADING...',
        timeLeft: RELOAD_TIME / 16 // Approximately match reload time
    });
    
    // Use requestAnimationFrame for smoother reload animation
    const updateReload = () => {
        player.reloadTimeLeft -= 16; // Approximately 16ms per frame at 60fps
        
        if (player.reloadTimeLeft <= 0) {
            player.isReloading = false;
            player.reloadTimeLeft = 0;
            player.ammo.gun = WEAPON_AMMO.gun; // Refill ammo
            document.getElementById('ammo-counter').textContent = `Ammo: ${player.ammo.gun}/${WEAPON_AMMO.gun}`;
        } else {
            requestAnimationFrame(updateReload);
        }
    };
    
    requestAnimationFrame(updateReload);
}

// Function to try entering a vehicle
function tryEnterVehicle() {
    for (let i = 0; i < vehicles.length; i++) {
        const vehicle = vehicles[i];
        const distance = Math.hypot(
            (player.x + player.width/2) - (vehicle.x + vehicle.width/2),
            (player.y + player.height/2) - (vehicle.y + vehicle.height/2)
        );
        
        if (distance < 80) {
            // Enter vehicle
            inVehicle = true;
            currentVehicle = vehicle;
            
            // Hide player
            player.isHidden = true;
            
            // Add notification
            gameObjects.push({
                type: 'vehicleText',
                x: vehicle.x + vehicle.width/2,
                y: vehicle.y - 30,
                text: `Entered ${vehicle.type.name}`,
                timeLeft: 60
            });
            
            break;
        }
    }
}

// Function to exit vehicle
function exitVehicle() {
    if (!currentVehicle) return;
    
    // Position player next to vehicle
    player.x = currentVehicle.x + currentVehicle.width + 10;
    player.y = CANVAS_HEIGHT - player.height - 30; // On ground
    
    // Show player
    player.isHidden = false;
    
    // Add notification
    gameObjects.push({
        type: 'vehicleText',
        x: currentVehicle.x + currentVehicle.width/2,
        y: currentVehicle.y - 30,
        text: `Exited ${currentVehicle.type.name}`,
        timeLeft: 60
    });
    
    inVehicle = false;
    currentVehicle = null;
}

// Function to check vehicle collisions with civilians
function checkVehicleCollisions() {
    if (!inVehicle || !currentVehicle) return;
    
    civilians.forEach(civilian => {
        if (civilian.dead) return;
        
        // Check if civilian is in front of vehicle
        const vehicleFront = currentVehicle.direction === 'right' ? 
            currentVehicle.x + currentVehicle.width : 
            currentVehicle.x;
        
        const civilianCenter = civilian.x + civilian.width/2;
        const distance = Math.abs(civilianCenter - vehicleFront);
        
        if (distance < 20 && 
            civilian.y + civilian.height > currentVehicle.y && 
            civilian.y < currentVehicle.y + currentVehicle.height) {
            
            // Hit civilian with vehicle - do HALF damage instead of instant kill
            civilian.health -= 50; // Half health
            
            // Add blood effect
            gameObjects.push({
                type: 'blood',
                x: civilian.x,
                y: civilian.y,
                timeLeft: 150,
                size: 20
            });
            
            // Check if now dead
            if (civilian.health <= 0) {
                civilian.dead = true;
                civilianDeathCount++;
                
                // Add death phrase
                addDeathPhrase(civilian);
            } else {
                // Add injury phrase
                const injuryPhrases = ["Ouch!", "My leg!", "Help!", "Watch it!", "I'm hurt!"];
                const phrase = injuryPhrases[Math.floor(Math.random() * injuryPhrases.length)];
                
                gameObjects.push({
                    type: 'speechBubble',
                    x: civilian.x,
                    y: civilian.y - 40,
                    text: phrase,
                    timeLeft: 60
                });
            }
            
            // Nearby civilians witness this
            witnessDeath(civilian.x, civilian.y);
            
            // Add impact effect
            gameObjects.push({
                type: 'vehicleImpact',
                x: civilian.x,
                y: civilian.y,
                timeLeft: 20
            });
            
            // Knockback effect
            civilian.x += (currentVehicle.direction === 'right' ? 50 : -50);
        }
    });
}

// Function to add death phrase
function addDeathPhrase(civilian) {
    const phrase = DEATH_PHRASES[Math.floor(Math.random() * DEATH_PHRASES.length)];
    
    gameObjects.push({
        type: 'speechBubble',
        x: civilian.x,
        y: civilian.y - 40,
        text: phrase,
        timeLeft: 90
    });
}

// Function to activate special feature
function activateSpecialFeature() {
    specialFeatureActive = true;
    specialFeatureCooldown = SPECIAL_FEATURE_COOLDOWN;
    
    // Add visual effect
    gameObjects.push({
        type: 'specialFeatureAnnouncement',
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        text: 'RAMPAGE MODE ACTIVATED!',
        timeLeft: 180
    });
    
    // Make player temporarily invincible and super fast
    const originalSpeed = player.speed;
    player.speed = player.speed * 3;
    
    // Create shockwave effect
    createShockwave(player.x + player.width/2, player.y + player.height/2);
    
    // Reset after 10 seconds
    setTimeout(() => {
        specialFeatureActive = false;
        player.speed = originalSpeed;
        
        gameObjects.push({
            type: 'specialFeatureAnnouncement',
            x: CANVAS_WIDTH / 2,
            y: CANVAS_HEIGHT / 2,
            text: 'RAMPAGE MODE ENDED',
            timeLeft: 120
        });
    }, 10000);
}

// Function to create shockwave
function createShockwave(x, y) {
    // Create expanding shockwave
    const shockwave = {
        x: x,
        y: y,
        radius: 10,
        maxRadius: 500,
        growthRate: 15,
        alpha: 1,
        fadeRate: 0.01
    };
    
    // Add to explosions array
    explosions.push(shockwave);
    
    // Affect all civilians within radius
    const updateShockwave = () => {
        // Grow the shockwave
        shockwave.radius += shockwave.growthRate;
        
        // Affect civilians
        civilians.forEach(civilian => {
            if (civilian.dead) return;
            
            const distance = Math.hypot(
                civilian.x - x,
                civilian.y - y
            );
            
            if (distance < shockwave.radius && distance > shockwave.radius - shockwave.growthRate) {
                // Calculate force direction
                const dx = civilian.x - x;
                const dy = civilian.y - y;
                const normalizedDistance = Math.sqrt(dx * dx + dy * dy);
                
                // Create flying civilian
                flyingCivilians.push({
                    x: civilian.x,
                    y: civilian.y,
                    width: civilian.width,
                    height: civilian.height,
                    velocityX: (dx / normalizedDistance) * 15,
                    velocityY: (dy / normalizedDistance) * 10 - 10, // Up and outward
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.2,
                    color: civilian.color,
                    onGround: false,
                    health: civilian.health,
                    dead: false
                });
                
                // Remove from regular civilians
                civilian.dead = true;
            }
        });
        
        // Continue until max radius
        if (shockwave.radius < shockwave.maxRadius) {
            requestAnimationFrame(updateShockwave);
        }
    };
    
    requestAnimationFrame(updateShockwave);
} 