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

// Create ground obstacle
const groundGeometry = new THREE.BoxGeometry(window.innerWidth, 20, 1);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x535353 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.y = -window.innerHeight/2 + 10; // Position at bottom of screen
scene.add(ground);

// Create player circle
const geometry = new THREE.SphereGeometry(10, 32, 32); // radius, widthSegments, heightSegments
const material = new THREE.MeshBasicMaterial({ color: 0x535353 });
const player = new THREE.Mesh(geometry, material);

// Physics properties
player.mass = 1.0;
player.radius = 10;
player.momentOfInertia = (2/5) * player.mass * player.radius * player.radius;
player.gravityScale = 0.5;
player.coefficientOfFriction = 0.8; // Increased for better grip
player.coefficientOfRestitution = 0.2;
player.airResistanceCoefficient = 0.04;
player.inputTorqueMagnitude = 3500.0; // Reset to reasonable value
player.rollingSensitivity = 1.0; // Control rolling conversion sensitivity

// State variables
player.position = new THREE.Vector3(0, 0, 0);
player.linearVelocity = new THREE.Vector3(0, 0, 0);
player.angularVelocity = new THREE.Vector3(0, 0, 0);
player.rotation = new THREE.Euler(0, 0, 0);

// Set initial position - spawn on ground
const groundY = -window.innerHeight/2 + 10;
player.position.set(0, groundY + player.radius, 0);

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
    
    // Update ground size
    ground.scale.x = width / window.innerWidth;
});

// Position camera
camera.position.z = 5;

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
    if (keys.a) inputTorque.z += player.inputTorqueMagnitude; // Counterclockwise for A (roll right)
    if (keys.d) inputTorque.z -= player.inputTorqueMagnitude; // Clockwise for D (roll left)
        
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
    
    // 3. Collision Detection
    const groundTop = groundY + 10; // Ground is 20 units tall, centered at groundY
    const playerBottom = predictedPosition.y - player.radius;
    
    if (playerBottom <= groundTop) {
        // 4. Collision Response
        const penetrationDepth = groundTop - playerBottom;
        const collisionNormal = new THREE.Vector3(0, 1, 0);
        
        // Resolve penetration
        player.position.copy(predictedPosition).add(collisionNormal.multiplyScalar(penetrationDepth));
        
        // Calculate relative velocity at contact point
        const contactPoint = new THREE.Vector3(0, -player.radius, 0);
        const contactPointVelocity = new THREE.Vector3().crossVectors(player.angularVelocity, contactPoint).add(player.linearVelocity);
        
        // Normal impulse
        const normalVelocity = contactPointVelocity.dot(collisionNormal);
        const normalImpulse = -(1 + player.coefficientOfRestitution) * normalVelocity * player.mass;
        player.linearVelocity.add(collisionNormal.multiplyScalar(normalImpulse / player.mass));
        
        // Apply direct rolling conversion - this enforces the "no slip" condition for a rolling ball
        // For a ball rotating around z-axis, linear velocity in x direction = -angular_velocity * radius
        player.linearVelocity.x = -player.angularVelocity.z * player.radius * player.rollingSensitivity;
        
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
        Keys: A=${keys.a}, D=${keys.d}
    `;
    
    renderer.render(scene, camera);
}
animate(0);