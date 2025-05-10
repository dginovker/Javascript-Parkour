// Player module

/**
 * Creates the player character with Planck.js physics
 * @param {THREE.Scene} scene - The scene to add the player to
 * @param {planck.World} world - The Planck.js physics world
 * @returns {Object} Player object with mesh and physics properties
 */
export function createPlayer(scene, world) {
    // Create player geometry
    const geometry = new THREE.SphereGeometry(20, 32, 32);
    
    // Create face texture
    const texture = createFaceTexture();
    
    // Create material with face texture
    const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        side: THREE.DoubleSide
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    
    // Create Planck.js body
    const body = world.createBody({
        type: 'dynamic',
        position: planck.Vec2(0, 100),
        linearDamping: 0.05,
        angularDamping: 0.1
    });

    // Create circle shape for the player
    const shape = planck.Circle(20);
    
    // Create fixture with physics properties
    body.createFixture(shape, {
        density: 1.0,
        friction: 0.3,
        restitution: 0.2
    });

    // Set mass data for better control
    body.setMassData({
        mass: 1.0,
        center: planck.Vec2(0, 0),
        I: 1.0
    });
    
    // Physics properties
    const player = {
        mesh: mesh,
        body: body,
        radius: 20,
        jumpForce: 30.0,
        moveForce: 60.0,
        maxSpeed: 400.0,
        isGrounded: false,
        type: 'circle',
        
        // Update function
        update: function(deltaTime, keys, obstacles) {
            this.updateGrounded();
            this.updatePhysics(keys);
            this.updateMesh();
        },
        
        // Ground detection using Planck.js contacts
        updateGrounded: function() {
            let isGrounded = false;
            for (let contact = this.body.getContactList(); contact; contact = contact.next) {
                if (!contact.contact.isTouching()) continue;
                const fixtureA = contact.contact.getFixtureA();
                const fixtureB = contact.contact.getFixtureB();
                const bodyA = fixtureA.getBody();
                const bodyB = fixtureB.getBody();
                // Check if the other body is not the player
                const otherBody = (bodyA === this.body) ? bodyB : bodyA;
                // Only check static bodies (obstacles)
                if (otherBody.getType() !== 'static') continue;
                // Get the world manifold to check the contact normal
                const worldManifold = contact.contact.getWorldManifold();
                if (worldManifold && worldManifold.normal && worldManifold.normal.y > 0.5) {
                    isGrounded = true;
                    break;
                }
            }
            this.isGrounded = isGrounded;
        },
        
        // Physics update
        updatePhysics: function(keys) {
            // Apply movement forces
            if (keys.a) {
                this.body.applyForceToCenter(planck.Vec2(-this.moveForce, 0));
            }
            if (keys.d) {
                this.body.applyForceToCenter(planck.Vec2(this.moveForce, 0));
            }
            
            // Apply jump force
            if (keys.w && this.isGrounded) {
                this.body.applyLinearImpulse(
                    planck.Vec2(0, this.jumpForce),
                    this.body.getWorldCenter()
                );
                this.isGrounded = false;
            }
            
            // Limit maximum speed
            const velocity = this.body.getLinearVelocity();
            const speed = velocity.length();
            if (speed > this.maxSpeed) {
                velocity.mul(this.maxSpeed / speed);
                this.body.setLinearVelocity(velocity);
            }
        },
        
        // Update mesh position and rotation
        updateMesh: function() {
            const position = this.body.getPosition();
            this.mesh.position.set(position.x, position.y, 0);
            
            const angle = this.body.getAngle();
            this.mesh.rotation.z = angle;
        }
    };
    
    // Add player to scene
    scene.add(player.mesh);
    
    return player;
}

/**
 * Creates a face texture for the player
 * @returns {THREE.CanvasTexture} Texture with face drawn on it
 */
function createFaceTexture() {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Draw face
    context.fillStyle = '#ee4949';
    context.beginPath();
    context.arc(128, 128, 128, 0, Math.PI * 2);
    context.fill();
    
    // Draw eyes
    context.fillStyle = 'white';
    context.beginPath();
    context.arc(90, 100, 15, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(166, 100, 15, 0, Math.PI * 2);
    context.fill();
    
    // Draw pupils
    context.fillStyle = 'black';
    context.beginPath();
    context.arc(90, 100, 7, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(166, 100, 7, 0, Math.PI * 2);
    context.fill();
    
    // Draw mouth
    context.strokeStyle = 'black';
    context.lineWidth = 8;
    context.beginPath();
    context.arc(128, 140, 30, 0, Math.PI);
    context.stroke();
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
} 