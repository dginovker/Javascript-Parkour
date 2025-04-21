// Player module

/**
 * Creates the player character with physics properties
 * @param {THREE.Scene} scene - The scene to add the player to
 * @returns {Object} Player object with mesh and physics properties
 */
export function createPlayer(scene) {
    // Create player geometry
    const geometry = new THREE.SphereGeometry(20, 32, 32); // radius, widthSegments, heightSegments
    
    // Create face texture
    const texture = createFaceTexture();
    
    // Create material with face texture
    const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        side: THREE.DoubleSide
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    
    // Physics properties
    const player = {
        mesh: mesh,
        radius: 20,
        mass: 1.0,
        momentOfInertia: 0,
        gravityScale: 35,
        coefficientOfFriction: 10, // How sticky the surface is
        coefficientOfRestitution: 0.3, // How bouncy the surface is
        airResistanceCoefficient: 0.001, // How much air resistance there is.
        groundResistanceCoefficient: 0.008, // How much ground resistance there is
        angularAirResistanceCoefficient: 0.04, // How much air resistance there is when rolling
        inputTorqueMagnitude: 6000.0, // How much torque the player can apply
        airControlForce: 800.0, // Force applied for air control
        airControlDistribution: 0.7, // 70% rotation, 30% linear movement when in air
        jumpForce: 10000.0,
        isGrounded: false,
        type: 'circle', // For collision detection
        currentSurface: null, // Reference to current surface player is on
        groundTolerance: 1.0, // Tolerance for ground detection
        
        // State variables
        position: new THREE.Vector3(0, 0, 0),
        linearVelocity: new THREE.Vector3(0, 0, 0),
        angularVelocity: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
        
        // Update function
        update: function(deltaTime, keys, obstacles) {
            this.updatePhysics(deltaTime, keys, obstacles);
            this.updateMesh();
        },
        
        // Physics update
        updatePhysics: function(deltaTime, keys, obstacles) {
            // Apply continuous forces/torques
            const forces = this.applyForces(keys, deltaTime);
            
            // Apply torque and air control
            const inputTorque = this.applyTorque(keys);
            
            // Integrate motion
            this.integrateMotion(forces, inputTorque, deltaTime);
            
            // Handle collisions with all surfaces
            this.handleCollisions(obstacles, deltaTime);
        },
        
        // Apply forces. Doesn't need deltaTime because calling method applies deltaTime
        applyForces: function(keys, deltaTime) {
            // Initialize with gravity
            const forces = new THREE.Vector3(0, -9.8 * this.gravityScale * this.mass, 0);
            
            // Air resistance
            const airResistance = this.linearVelocity.clone().multiplyScalar(
                -this.airResistanceCoefficient * this.linearVelocity.length()
            );
            forces.add(airResistance);
            
            // Ground resistance when grounded
            if (this.isGrounded) {
                const groundResistance = this.linearVelocity.clone().multiplyScalar(
                    -this.groundResistanceCoefficient * this.linearVelocity.length()
                );
                forces.add(groundResistance);
            }
            // Air control when not grounded
            else {
                // Calculate horizontal control force in the air
                const airControlX = this.calculateAirControl(keys);
                forces.add(airControlX);
            }
            
            // Jump force
            if (keys.w && this.isGrounded && this.currentSurface) {
                // Apply jump force in the normal direction
                const normal = this.currentSurface.normal;
                const jumpVector = normal.clone().multiplyScalar(this.jumpForce * this.mass);
                forces.add(jumpVector);
                this.isGrounded = false;
                this.currentSurface = null;
            }
            
            return forces;
        },
        
        // Calculate air control force
        calculateAirControl: function(keys) {
            let controlDirection = 0;
            
            if (keys.a) controlDirection -= 1;
            if (keys.d) controlDirection += 1;
            
            // Apply horizontal air control force
            if (controlDirection !== 0) {
                // This is the portion of input that goes to linear movement (1 - airControlDistribution)
                const linearControlFactor = 1 - this.airControlDistribution;
                return new THREE.Vector3(
                    controlDirection * this.airControlForce * linearControlFactor,
                    0,
                    0
                );
            }
            
            return new THREE.Vector3(0, 0, 0);
        },
        
        // Apply torque
        applyTorque: function(keys) {
            const inputTorque = new THREE.Vector3(0, 0, 0);
            
            let controlDirection = 0;
            if (keys.a) controlDirection -= 1;
            if (keys.d) controlDirection += 1;
            
            if (controlDirection !== 0) {
                // Adjust torque magnitude based on whether player is in air or not
                let torqueMagnitude = this.inputTorqueMagnitude;
                
                if (!this.isGrounded) {
                    // When in air, reduce the torque by the distribution factor
                    torqueMagnitude *= this.airControlDistribution;
                }
                
                inputTorque.z += controlDirection * torqueMagnitude;
            }
            
            // Apply air resistance to angular velocity when in the air
            if (!this.isGrounded) {
                const angularAirResistance = -this.angularAirResistanceCoefficient * 
                    this.angularVelocity.z * Math.abs(this.angularVelocity.z);
                inputTorque.z += angularAirResistance * this.momentOfInertia;
            }
            
            return inputTorque;
        },
        
        // Integrate motion
        integrateMotion: function(forces, inputTorque, deltaTime) {
            // Calculate accelerations
            const linearAcceleration = forces.clone().divideScalar(this.mass);
            const angularAcceleration = inputTorque.divideScalar(this.momentOfInertia);
            
            // Update velocities
            this.linearVelocity.add(linearAcceleration.multiplyScalar(deltaTime));
            this.angularVelocity.add(angularAcceleration.multiplyScalar(deltaTime));
            
            // Update rotation
            this.rotation.z -= this.angularVelocity.z * deltaTime;
            
            // Predict new position
            return this.position.clone().add(this.linearVelocity.clone().multiplyScalar(deltaTime));
        },
        
        // Handle collisions with obstacles
        handleCollisions: function(obstacles, deltaTime) {
            // Get predicted position
            const predictedPosition = this.position.clone().add(
                this.linearVelocity.clone().multiplyScalar(deltaTime)
            );
            
            // Reset grounded state
            this.isGrounded = false;
            this.currentSurface = null;
            
            // Get the obstacle collision info
            const { findObstacleSurfaceAt } = window.require ? 
                window.require('./obstacles.js') : 
                { findObstacleSurfaceAt: window.findObstacleSurfaceAt };
                
            const obstacleInfo = findObstacleSurfaceAt(
                obstacles, 
                predictedPosition.x, 
                predictedPosition.y,
                this.radius
            );
            
            // Handle obstacle collision if there is one
            if (obstacleInfo) {
                this.handleObstacleCollision(predictedPosition, obstacleInfo, deltaTime);
            } else {
                // No collision, use predicted position
                this.position.copy(predictedPosition);
            }
        },
        
        // Handle collision with obstacle
        handleObstacleCollision: function(predictedPosition, surfaceInfo, deltaTime) {
            if (!surfaceInfo) return false;
            
            const normal = surfaceInfo.normal;
            
            // Resolve penetration
            const resolveVector = normal.clone().multiplyScalar(surfaceInfo.penetrationDepth);
            this.position.copy(predictedPosition).add(resolveVector);
            
            // Set grounded state only for top surfaces
            if (surfaceInfo.allowGrounded && normal.y > 0) {
                this.isGrounded = true;
                this.currentSurface = surfaceInfo;
                
                // Apply rolling physics for top surfaces
                this.applyRollingPhysics(normal, deltaTime);
            } else {
                // Handle side or bottom collision (bounce)
                this.applyBouncePhysics(normal);
            }
            
            return true;
        },
        
        // Apply rolling physics
        applyRollingPhysics: function(normal, deltaTime) {
            // Create a tangent vector (perpendicular to the normal)
            const tangent = new THREE.Vector3(-normal.y, normal.x, 0).normalize();
            
            // Calculate current tangential velocity
            const currentTangentialSpeed = this.linearVelocity.dot(tangent);
            
            // Calculate desired tangential speed based on angular velocity
            const desiredTangentialSpeed = -this.angularVelocity.z * this.radius;
            
            // Apply friction to make actual tangential speed approach desired speed
            const speedDifference = desiredTangentialSpeed - currentTangentialSpeed;
            const frictionImpulse = speedDifference * this.coefficientOfFriction * deltaTime;
            
            // Apply to linear velocity
            this.linearVelocity.add(tangent.clone().multiplyScalar(frictionImpulse));
            
            // Adjust angular velocity to match linear velocity for consistent rolling
            const angularCorrection = -currentTangentialSpeed / this.radius - this.angularVelocity.z;
            const angularCorrectionStrength = 5.0;
            this.angularVelocity.z += angularCorrection * angularCorrectionStrength * deltaTime;
            
            // Apply normal impulse if moving into the surface
            const normalVelocity = this.linearVelocity.dot(normal);
            if (normalVelocity < 0) {
                const normalImpulse = -(1 + this.coefficientOfRestitution) * normalVelocity * this.mass;
                this.linearVelocity.add(normal.clone().multiplyScalar(normalImpulse / this.mass));
            }
        },
        
        // Apply bounce physics
        applyBouncePhysics: function(normal) {
            // Calculate velocity in normal direction
            const normalVelocity = this.linearVelocity.dot(normal);
            
            // Only bounce if moving into the surface
            if (normalVelocity < 0) {
                // Calculate bounce impulse
                const bounceImpulse = -(1 + this.coefficientOfRestitution) * normalVelocity * this.mass;
                
                // Apply impulse to linear velocity
                this.linearVelocity.add(normal.clone().multiplyScalar(bounceImpulse / this.mass));
            }
        },
        
        // Update mesh position and rotation
        updateMesh: function() {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.copy(this.rotation);
            
            // Calculate moment of inertia for sphere
            // I = (2/5) * m * r^2 for solid sphere
            this.momentOfInertia = (2/5) * this.mass * this.radius * this.radius;
        }
    };
    
    // Initialize player position (will be adjusted by main.js based on floor obstacle)
    player.position.set(0, 100, 0); // Start at origin, above ground
    player.momentOfInertia = (2/5) * player.mass * player.radius * player.radius;
    
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