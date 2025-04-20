// Input module

/**
 * Sets up keyboard input handlers
 * @param {Object} keys - Object to store key states
 */
export function setupInputHandlers(keys) {
    // Handle key down events
    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'a') keys.a = true;
        if (e.key.toLowerCase() === 'd') keys.d = true;
        if (e.key.toLowerCase() === 'w') keys.w = true;
    });

    // Handle key up events
    window.addEventListener('keyup', (e) => {
        if (e.key.toLowerCase() === 'a') keys.a = false;
        if (e.key.toLowerCase() === 'd') keys.d = false;
        if (e.key.toLowerCase() === 'w') keys.w = false;
    });
} 