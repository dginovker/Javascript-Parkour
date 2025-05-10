// Utils module

/**
 * Creates a debug display element
 * @returns {HTMLElement} The debug display element
 */
export function createDebugDisplay() {
    const debugDiv = document.createElement('div');
    debugDiv.style.position = 'absolute';
    debugDiv.style.top = '10px';
    debugDiv.style.left = '10px';
    debugDiv.style.color = 'black';
    debugDiv.style.fontFamily = 'monospace';
    debugDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    debugDiv.style.padding = '10px';
    document.body.appendChild(debugDiv);
    
    return debugDiv;
}
