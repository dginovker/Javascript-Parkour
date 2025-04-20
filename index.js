// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf7f7f7); // Light gray background
const camera = new THREE.OrthographicCamera(
    window.innerWidth / -2,  // left
    window.innerWidth / 2,   // right
    window.innerHeight / 2,  // top
    window.innerHeight / -2, // bottom
    0.1,
    1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create hilly ground
const groundBaseY = -window.innerHeight/2 + 10;
const groundSegments = 20;
const groundWidth = window.innerWidth;
const segmentWidth = groundWidth / groundSegments;
const maxHillHeight = 50;

// Create ground shape
const groundShape = new THREE.Shape();
const groundPoints = [];
groundShape.moveTo(-groundWidth/2, groundBaseY - 50); // Start below ground

// Generate a hilly terrain using sine waves
for (let i = 0; i <= groundSegments; i++) {
    const x = -groundWidth/2 + i * segmentWidth;
    // Use multiple sine waves with different frequencies for interesting terrain
    const y = groundBaseY + 
              Math.sin(i * 0.5) * maxHillHeight * 0.7 + 
              Math.sin(i * 0.2) * maxHillHeight * 0.3;
    groundShape.lineTo(x, y);
    groundPoints.push({x, y});
}

groundShape.lineTo(groundWidth/2, groundBaseY - 50); // End below ground
groundShape.lineTo(-groundWidth/2, groundBaseY - 50); // Close the shape

// Create ground mesh from shape
const groundGeometry = new THREE.ShapeGeometry(groundShape);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x535353 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
scene.add(ground);

// Create player circle
const geometry = new THREE.SphereGeometry(10, 32, 32); // radius, widthSegments, heightSegments
const material = new THREE.MeshBasicMaterial({ color: 0x535353 });
const player = new THREE.Mesh(geometry, material);

// Physics properties
player.mass = 1.0;
player.radius = 10;
player.momentOfInertia = (2/5) * player.mass * player.radius * player.radius;
player.gravityScale = 10;
player.coefficientOfFriction = 0.8; // Increased for better grip
player.coefficientOfRestitution = 0.02;
player.airResistanceCoefficient = 0.04;
player.inputTorqueMagnitude = 3500.0; // Reset to reasonable value
player.rollingSensitivity = 1.0; // Control rolling conversion sensitivity

// State variables
player.position = new THREE.Vector3(0, 0, 0);
player.linearVelocity = new THREE.Vector3(0, 0, 0);
player.angularVelocity = new THREE.Vector3(0, 0, 0);
player.rotation = new THREE.Euler(0, 0, 0);

// Set initial position - spawn above highest point
player.position.set(0, groundBaseY + maxHillHeight + player.radius * 3, 0);

// Add player to scene
scene.add(player);

// Create debug text element
const debugDiv = document.createElement('div');
debugDiv.style.position = 'absolute';
debugDiv.style.top = '10px';
debugDiv.style.left = '10px';
debugDiv.style.color = 'black';
debugDiv.style.fontFamily = 'monospace';
debugDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
debugDiv.style.padding = '10px';
document.body.appendChild(debugDiv);

// Track key states
const keys = {
    a: false,
    d: false
};

// Handle key events
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'a') keys.a = true;
    if (e.key.toLowerCase() === 'd') keys.d = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() === 'a') keys.a = false;
    if (e.key.toLowerCase() === 'd') keys.d = false;
});

// Handle window resize
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
});

// Position camera
camera.position.z = 5;

// Helper function to find terrain height and normal at a given x position
function getTerrainInfo(x) {
    // Find which segment the player is over
    if (x < groundPoints[0].x) {
        return { height: groundPoints[0].y, normal: new THREE.Vector3(0, 1, 0) };
    }
    if (x > groundPoints[groundPoints.length - 1].x) {
        return { height: groundPoints[groundPoints.length - 1].y, normal: new THREE.Vector3(0, 1, 0) };
    }
    
    // Find the segment the player is over
    let segment = 0;
    for (let i = 0; i < groundPoints.length - 1; i++) {
        if (x >= groundPoints[i].x && x < groundPoints[i + 1].x) {
            segment = i;
            break;
        }
    }
    
    // Calculate height at x using linear interpolation
    const p1 = groundPoints[segment];
    const p2 = groundPoints[segment + 1];
    const t = (x - p1.x) / (p2.x - p1.x);
    const height = p1.y + t * (p2.y - p1.y);
    
    // Calculate normal (perpendicular to the segment)
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const normal = new THREE.Vector3(-dy, dx, 0).normalize();
    
    return { height, normal };
}

// Animation loop
let lastTime = 0;
function animate(currentTime) {
    requestAnimationFrame(animate);
    
    // Calculate delta time
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;
    
    // 1. Apply Continuous Forces/Torques
    const forces = new THREE.Vector3(0, -9.8 * player.gravityScale * player.mass, 0); // Gravity
    
    // Air resistance
    const airResistance = player.linearVelocity.clone().multiplyScalar(-player.airResistanceCoefficient * player.linearVelocity.length());
    forces.add(airResistance);
    
    // Input torque
    const inputTorque = new THREE.Vector3(0, 0, 0);
    if (keys.a) inputTorque.z -= player.inputTorqueMagnitude; // Counterclockwise for A (roll right)
    if (keys.d) inputTorque.z += player.inputTorqueMagnitude; // Clockwise for D (roll left)
    
    // 2. Integrate Motion (Prediction)
    const linearAcceleration = forces.divideScalar(player.mass);
    const angularAcceleration = inputTorque.divideScalar(player.momentOfInertia);
    
    player.linearVelocity.add(linearAcceleration.multiplyScalar(deltaTime));
    player.angularVelocity.add(angularAcceleration.multiplyScalar(deltaTime));
    
    const predictedPosition = player.position.clone().add(player.linearVelocity.clone().multiplyScalar(deltaTime));
    const predictedRotation = new THREE.Euler(
        player.rotation.x + player.angularVelocity.x * deltaTime,
        player.rotation.y + player.angularVelocity.y * deltaTime,
        player.rotation.z + player.angularVelocity.z * deltaTime
    );
    
    // 3. Collision Detection with hilly terrain
    const terrainInfo = getTerrainInfo(predictedPosition.x);
    const terrainHeight = terrainInfo.height;
    const terrainNormal = terrainInfo.normal;
    
    const playerBottom = predictedPosition.y - player.radius;
    const penetrationDepth = terrainHeight - playerBottom;
    
    if (penetrationDepth >= 0) {
        // 4. Collision Response
        // Resolve penetration along the terrain normal
        const resolveVector = terrainNormal.clone().multiplyScalar(penetrationDepth);
        player.position.copy(predictedPosition).add(resolveVector);
        
        // Calculate relative velocity at contact point
        // Project the contact point along the terrain normal
        const contactOffset = terrainNormal.clone().multiplyScalar(-player.radius);
        const contactPointVelocity = new THREE.Vector3().crossVectors(
            player.angularVelocity, contactOffset
        ).add(player.linearVelocity);
        
        // Normal impulse
        const normalVelocity = contactPointVelocity.dot(terrainNormal);
        if (normalVelocity < 0) { // Only apply impulse if moving into the surface
            const normalImpulse = -(1 + player.coefficientOfRestitution) * normalVelocity * player.mass;
            player.linearVelocity.add(terrainNormal.clone().multiplyScalar(normalImpulse / player.mass));
        }
        
        // Align linear velocity with the terrain surface
        // Calculate tangent vector to the terrain
        const tangentVector = new THREE.Vector3(-terrainNormal.y, terrainNormal.x, 0).normalize();
        
        // Apply direct rolling conversion on the tangent vector
        const rollSpeed = -player.angularVelocity.z * player.radius * player.rollingSensitivity;
        player.linearVelocity = tangentVector.multiplyScalar(rollSpeed);
        
        // Apply friction to slow down angular velocity
        player.angularVelocity.multiplyScalar(0.98);
    } else {
        // No collision, use predicted position
        player.position.copy(predictedPosition);
        player.rotation.copy(predictedRotation);
    }
    
    // 5. Update Final State
    player.position.copy(player.position);
    player.rotation.copy(player.rotation);
    
    // Update debug info
    debugDiv.innerHTML = `
        Position: (${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)})<br>
        Linear Velocity: (${player.linearVelocity.x.toFixed(2)}, ${player.linearVelocity.y.toFixed(2)})<br>
        Angular Velocity: (${player.angularVelocity.z.toFixed(2)})<br>
        Rotation: ${player.rotation.z.toFixed(2)}<br>
        Terrain Height: ${terrainHeight.toFixed(2)}<br>
        Terrain Normal: (${terrainNormal.x.toFixed(2)}, ${terrainNormal.y.toFixed(2)})<br>
        Keys: A=${keys.a}, D=${keys.d}
    `;
    
    renderer.render(scene, camera);
}
animate(0);