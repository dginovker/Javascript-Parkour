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

// Create player cube
const geometry = new THREE.BoxGeometry(20, 20, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x535353 });
const player = new THREE.Mesh(geometry, material);
player.position.y = -window.innerHeight/2 + 30; // Position just above ground
scene.add(player);

// Position camera
camera.position.z = 5;

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

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();