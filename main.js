// ==========================================
// CONFIGURACIÓN DE THREE.JS
// ==========================================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 18, 16);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// ==========================================
// CARGA DE TEXTURAS
// ==========================================
const textureLoader = new THREE.TextureLoader();
const groundMat = new THREE.MeshStandardMaterial({ map: textureLoader.load('img/suelo.jpg'), color: 0x444444 });
const debrisMat = new THREE.MeshStandardMaterial({ map: textureLoader.load('img/escombros.jpg') });
const victimMat = new THREE.SpriteMaterial({ map: textureLoader.load('img/persona.png') });
const droneMat = new THREE.SpriteMaterial({ map: textureLoader.load('img/dron.png') });

// ==========================================
// MAPA 3D (10x10)
// ==========================================
const gridSize = 10;
const cellSize = 2;
let grid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
let objectsInGrid = new Map();

const groundGeo = new THREE.PlaneGeometry(gridSize * cellSize, gridSize * cellSize);
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
scene.add(new THREE.GridHelper(gridSize * cellSize, gridSize, 0x38bdf8, 0x475569));

// ==========================================
// EL AGENTE (Dron)
// ==========================================
const drone = new THREE.Sprite(droneMat);
drone.scale.set(1.5, 1.5, 1);
scene.add(drone);

let agentState = { gridX: 0, gridZ: 0, battery: 100, victimsRescued: 0, steps: 0, isActive: false };

function updateDronePosition(gx, gz) {
    agentState.gridX = gx;
    agentState.gridZ = gz;
    const worldX = (gx * cellSize) - (gridSize * cellSize)/2 + (cellSize/2);
    const worldZ = (gz * cellSize) - (gridSize * cellSize)/2 + (cellSize/2);
    drone.position.set(worldX, 1.2, worldZ);
}
updateDronePosition(0, 0);

// ==========================================
// EDITOR INTERACTIVO
// ==========================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let activeTool = 'escombro';

document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        activeTool = e.target.dataset.tool;
    });
});

window.addEventListener('mousedown', (event) => {
    if (event.target !== renderer.domElement || agentState.isActive) return;
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObject(ground);
    if (intersects.length > 0) {
        const point = intersects[0].point;
        const gx = Math.floor((point.x + (gridSize * cellSize) / 2) / cellSize);
        const gz = Math.floor((point.z + (gridSize * cellSize) / 2) / cellSize);

        if (gx >= 0 && gx < gridSize && gz >= 0 && gz < gridSize) {
            if (gx === 0 && gz === 0) return; // Proteger punto de inicio
            
            const key = `${gx},${gz}`;
            if (objectsInGrid.has(key)) {
                scene.remove(objectsInGrid.get(key));
                objectsInGrid.delete(key);
                grid[gx][gz] = 0;
            }

            const wX = (gx * cellSize) - (gridSize * cellSize)/2 + (cellSize/2);
            const wZ = (gz * cellSize) - (gridSize * cellSize)/2 + (cellSize/2);

            if (activeTool === 'escombro') {
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(cellSize, cellSize, cellSize), debrisMat);
                mesh.position.set(wX, cellSize/2, wZ);
                mesh.castShadow = true;
                scene.add(mesh);
                objectsInGrid.set(key, mesh);
                grid[gx][gz] = 1;
            } else if (activeTool === 'victima') {
                const sprite = new THREE.Sprite(victimMat);
                sprite.scale.set(1.5, 1.5, 1);
                sprite.position.set(wX, 1, wZ);
                scene.add(sprite);
                objectsInGrid.set(key, sprite);
                grid[gx][gz] = 2;
            }
        }
    }
});

// ==========================================
// LÓGICA DE ALGORITMOS E IA
// ==========================================
const delay = ms => new Promise(res => setTimeout(res, ms));

function getValidNeighbors(x, z) {
    const neighbors = [];
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    for (let [dx, dz] of dirs) {
        let nx = x + dx, nz = z + dz;
        if (nx >= 0 && nx < gridSize && nz >= 0 && nz < gridSize && grid[nx][nz] !== 1) {
            neighbors.push({x: nx, z: nz});
        }
    }
    return neighbors;
}

function getNearestVictim(startX, startZ) {
    let nearest = null, minDist = Infinity;
    for (let x = 0; x < gridSize; x++) {
        for (let z = 0; z < gridSize; z++) {
            if (grid[x][z] === 2) {
                let dist = Math.abs(x - startX) + Math.abs(z - startZ);
                if (dist < minDist) { minDist = dist; nearest = {x, z}; }
            }
        }
    }
    return nearest;
}

// Búsqueda en Anchura (BFS)
function runBFS(startX, startZ, targetX, targetZ) {
    let queue = [{x: startX, z: startZ, path: []}];
    let visited = new Set([`${startX},${startZ}`]);
    let nodos = 0;

    while(queue.length > 0) {
        let curr = queue.shift();
        nodos++;
        if (curr.x === targetX && curr.z === targetZ) return { path: curr.path, nodos };

        for (let n of getValidNeighbors(curr.x, curr.z)) {
            let key = `${n.x},${n.z}`;
            if (!visited.has(key)) {
                visited.add(key);
                queue.push({x: n.x, z: n.z, path: [...curr.path, {x: n.x, z: n.z}]});
            }
        }
    }
    return { path: null, nodos };
}

// Algoritmo A* (A-Star)
function runAStar(startX, startZ, targetX, targetZ) {
    let openList = [{x: startX, z: startZ, g: 0, path: []}];
    let closedSet = new Set();
    let nodos = 0;

    while(openList.length > 0) {
        openList.sort((a, b) => {
            let fa = a.g + (Math.abs(a.x - targetX) + Math.abs(a.z - targetZ));
            let fb = b.g + (Math.abs(b.x - targetX) + Math.abs(b.z - targetZ));
            return fa - fb;
        });

        let curr = openList.shift();
        let key = `${curr.x},${curr.z}`;

        if (closedSet.has(key)) continue;
        closedSet.add(key);
        nodos++;

        if (curr.x === targetX && curr.z === targetZ) return { path: curr.path, nodos };

        for (let n of getValidNeighbors(curr.x, curr.z)) {
            if (!closedSet.has(`${n.x},${n.z}`)) {
                openList.push({x: n.x, z: n.z, g: curr.g + 1, path: [...curr.path, {x: n.x, z: n.z}]});
            }
        }
    }
    return { path: null, nodos };
}

function rescueVictim(x, z) {
    const key = `${x},${z}`;
    if (objectsInGrid.has(key)) {
        scene.remove(objectsInGrid.get(key));
        objectsInGrid.delete(key);
    }
    grid[x][z] = 0;
    agentState.victimsRescued++;
}

document.getElementById('start-btn').addEventListener('click', async () => {
    if (agentState.isActive) return;
    agentState.isActive = true;
    const algo = document.getElementById('algorithm').value;
    
    document.getElementById('start-btn').innerText = "MISIÓN EN CURSO...";
    document.getElementById('start-btn').style.background = "#f59e0b";
    let totalNodos = 0;
    
    // Capturar tiempo de inicio
    const startTime = performance.now(); 

    while (agentState.battery > 0 && agentState.isActive) {
        let target = getNearestVictim(agentState.gridX, agentState.gridZ);
        if (!target) break; // Sin víctimas restantes

        if (algo === 'base') {
            // MODO BASE
            let nx = agentState.gridX, nz = agentState.gridZ;
            if (nx < target.x) nx++;
            else if (nx > target.x) nx--;
            else if (nz < target.z) nz++;
            else if (nz > target.z) nz--;

            if (grid[nx][nz] === 1) {
                let vecinos = getValidNeighbors(agentState.gridX, agentState.gridZ);
                if (vecinos.length > 0) {
                    let rand = vecinos[Math.floor(Math.random() * vecinos.length)];
                    nx = rand.x; nz = rand.z;
                } else break; // Atrapado
            }
            
            updateDronePosition(nx, nz);
            agentState.steps++;
            agentState.battery -= 2;
            totalNodos++;
            if (grid[nx][nz] === 2) rescueVictim(nx, nz);
            actualizarUI();
            await delay(300);

        } else {
            // BFS o A*
            let result = algo === 'bfs' 
                ? runBFS(agentState.gridX, agentState.gridZ, target.x, target.z)
                : runAStar(agentState.gridX, agentState.gridZ, target.x, target.z);
                
            totalNodos += result.nodos;

            if (!result.path) {
                grid[target.x][target.z] = 0; 
                continue; 
            }

            for (let step of result.path) {
                if (agentState.battery <= 0) break;
                updateDronePosition(step.x, step.z);
                agentState.steps++;
                agentState.battery -= 2;
                if (grid[step.x][step.z] === 2) rescueVictim(step.x, step.z);
                actualizarUI();
                await delay(300);
            }
        }
    }

    // Capturar tiempo de fin y calcular duración en segundos
    const endTime = performance.now();
    const tiempoTotal = ((endTime - startTime) / 1000).toFixed(2);

    // Registrar resultados incluyendo la nueva columna
    const table = document.querySelector('#metrics-table tbody');
    table.innerHTML += `<tr>
        <td>${algo.toUpperCase()}</td>
        <td>${agentState.victimsRescued}</td>
        <td>${Math.max(0, agentState.battery)}%</td>
        <td>${totalNodos}</td>
        <td>${tiempoTotal}s</td>
    </tr>`;

    // Resetear misión
    agentState.isActive = false;
    document.getElementById('start-btn').innerText = "🚀 INICIAR MISIÓN";
    document.getElementById('start-btn').style.background = "";
    updateDronePosition(0, 0);
    agentState.battery = 100; agentState.steps = 0; agentState.victimsRescued = 0; actualizarUI();
});

function actualizarUI() {
    const batUI = document.getElementById('stat-battery');
    batUI.innerText = `${Math.max(0, agentState.battery)}%`;
    batUI.style.color = agentState.battery > 40 ? "#4ade80" : "#ef4444";
    document.getElementById('stat-victims').innerText = agentState.victimsRescued;
    document.getElementById('stat-steps').innerText = agentState.steps;
}

// ==========================================
// BUCLE VISUAL
// ==========================================
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    drone.position.y = 1.2 + Math.sin(time * 4) * 0.15;
    objectsInGrid.forEach((mesh, key) => {
        if (grid[key.split(',')[0]][key.split(',')[1]] === 2) {
            mesh.position.y = 1 + Math.sin(time * 3 + parseInt(key)) * 0.1;
        }
    });
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});