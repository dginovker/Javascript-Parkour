# Physics System Documentation

## Core Concepts
- The player is modeled as a rigid sphere.
- Movement is governed by Newton's laws for linear and rotational motion.
- Forces (like gravity, input) cause linear acceleration.
- Torques (like input, friction) cause angular acceleration.
- Collisions with surfaces introduce temporary, impulsive contact forces (normal and friction).

## State Variables
- **Position (Vector3):** Center of mass of the sphere.
- **Linear Velocity (Vector3):** Rate of change of position.
- **Rotation (Quaternion or Euler Angles):** Orientation of the sphere.
- **Angular Velocity (Vector3):** Rate of change of rotation (axis and speed).

## Physical Properties & Constants
- **Mass:** Inertia against linear acceleration.
- **Radius:** Size of the sphere.
- **Moment of Inertia:** Inertia against angular acceleration (e.g., `(2/5) * mass * radius^2` for a solid sphere).
- **Gravity (Vector3):** Constant downward acceleration (e.g., `[0, -9.8 * gravityScale, 0]`).
- **Input Torque Magnitude:** How strongly A/D keys affect rotation.
- **Coefficient of Friction:** Determines magnitude of friction forces (static/kinetic).
- **Coefficient of Restitution:** Determines bounciness during collisions (0 = no bounce, 1 = perfectly elastic).
- **Air Resistance Coefficient:** Determines drag force opposing linear velocity.

## Physics Update Loop (per frame)

1.  **Apply Continuous Forces/Torques:**
    *   Add gravitational force (`mass * gravity`).
    *   Add air resistance force (opposing linear velocity, e.g., `-k * velocity * |velocity|`).
    *   Apply input torque based on A/D keys (around Z-axis).

2.  **Integrate Motion (Prediction):**
    *   Calculate linear acceleration (`net_force / mass`).
    *   Calculate angular acceleration (`net_torque / moment_of_inertia`).
    *   Update linear velocity (`velocity += linear_acceleration * deltaTime`).
    *   Update angular velocity (`angular_velocity += angular_acceleration * deltaTime`).
    *   Predict next position (`predicted_position = position + velocity * deltaTime`).
    *   Predict next rotation (`predicted_rotation = rotation + angular_velocity * deltaTime`).

3.  **Collision Detection:**
    *   Check if the `predicted_position` causes the sphere to overlap with any environment geometry (ground, walls, obstacles).
    *   For each collision, determine the collision point, collision normal (vector pointing out from the surface), and penetration depth.

4.  **Collision Response (for each collision):**
    *   **Resolve Penetration:** Move the player's position back along the collision normal by the penetration depth so it's just touching.
    *   **Calculate Relative Velocity:** Find the velocity of the collision point on the sphere relative to the surface it hit.
    *   **Apply Normal Impulse:** Calculate and apply an impulse along the collision normal to stop penetration and handle bounce (based on coefficient of restitution and relative velocity along the normal). This modifies **linear velocity**.
    *   **Apply Friction Impulse:** Calculate and apply an impulse tangential to the surface, opposing the tangential relative velocity (based on coefficient of friction and the magnitude of the normal impulse). This modifies both **linear velocity** and **angular velocity**, naturally handling rolling and sliding.

5.  **Update Final State:**
    *   Store the final corrected position and rotation.
    *   Store the final velocities (linear and angular) after applying all impulses.

## Notes
- This model handles flat ground, slopes, and other obstacles uniformly through collision detection and response.
- Rolling emerges naturally from the friction impulse applied during contact, which creates a torque.
- There is no longer a need for a separate "isOnGround" state variable managed explicitly in the physics loop; contact is handled dynamically.