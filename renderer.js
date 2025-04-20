// Renderer module

/**
 * Initializes the Three.js renderer, scene and camera
 * @returns {Object} Object containing scene, renderer and camera
 */
export function initRenderer() {
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7f7f7); // Light gray background
    
    // Create camera
    const camera = new THREE.OrthographicCamera(
        window.innerWidth / -2,  // left
        window.innerWidth / 2,   // right
        window.innerHeight / 2,  // top
        window.innerHeight / -2, // bottom
        0.1,
        1000
    );
    camera.position.z = 5;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    return { scene, renderer, camera };
}

/**
 * Updates camera and renderer on window resize
 * @param {THREE.OrthographicCamera} camera - The camera to update
 * @param {THREE.WebGLRenderer} renderer - The renderer to update
 */
export function updateCamera(camera, renderer) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Update camera frustum
    camera.left = width / -2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = height / -2;
    
    // Update projection matrix with new values
    camera.updateProjectionMatrix();
    
    // Update renderer size
    renderer.setSize(width, height);
} 