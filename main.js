// Global variables
let scene, camera, renderer, controls;
let meshMap = {};
let loadedModel = null;

// Initialize the Three.js scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff); // White background

    // Create camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(15, 15, 15);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Add renderer to container
    const container = document.getElementById('scene-container');
    container.appendChild(renderer.domElement);

    // Add lights
    setupLights();

    // Add controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // Load the FBX model
    loadModel();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Start render loop
    animate();
}

function setupLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Additional fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-10, 0, -5);
    scene.add(fillLight);
}

function loadModel() {
    const loader = new THREE.FBXLoader();
    
    loader.load(
        'public/sport_shoes_speed_shape.fbx',
        function (object) {
            console.log('Model loaded successfully!');
            loadedModel = object;

            // Scale the model to much larger size (300% bigger = 4x current size)
            object.scale.set(0.36, 0.36, 0.36);

            // Traverse all child meshes
            object.traverse(function (child) {
                if (child.isMesh) {
                    console.log('Mesh name:', child.name);
                    console.log('Material name:', child.material ? child.material.name : 'No material');

                    // Store mesh in dictionary
                    meshMap[child.name] = child;

                    // Ensure mesh has a proper material
                    if (!child.material || !child.material.isMeshStandardMaterial) {
                        child.material = new THREE.MeshStandardMaterial({
                            color: child.material ? child.material.color : 0x888888
                        });
                    }

                    // Enable shadows
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Center the model
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            object.position.sub(center);

            // Add to scene
            scene.add(object);

            // Generate UI controls
            generateColorControls();
            
            // Enable export button
            enableExportButton();
            
            // Initialize mobile panel after model loads
            
            // Re-setup mobile panel toggle after model loads
            setupMobilePanelToggle();
        },
        function (progress) {
            console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
        },
        function (error) {
            console.error('Error loading model:', error);
            // Show error message in UI
            const controlsContainer = document.getElementById('controls-container');
            controlsContainer.innerHTML = `
                <div style="color: #e74c3c; text-align: center; padding: 20px;">
                    <p>❌ Failed to load model</p>
                    <small>Make sure 'sport_shoes_speed_shape.fbx' exists in the 'public' folder</small>
                </div>
            `;
        }
    );
}

function generateColorControls() {
    const controlsContainer = document.getElementById('controls-container');
    
    // Clear loading message
    controlsContainer.innerHTML = '';

    // Get unique mesh names
    const meshNames = Object.keys(meshMap).filter(name => name && name.trim() !== '');

    if (meshNames.length === 0) {
        controlsContainer.innerHTML = '<div class="loading">No customizable parts found</div>';
        return;
    }

    // Generate color picker for each mesh
    meshNames.forEach(meshName => {
        const mesh = meshMap[meshName];
        const cleanName = cleanMeshName(meshName);
        
        // Get current color
        const currentColor = mesh.material.color.getHexString();

        // Create control element
        const controlDiv = document.createElement('div');
        controlDiv.className = 'color-control';
        controlDiv.innerHTML = `
            <label class="color-control-label">${cleanName}</label>
            <div class="color-input-wrapper">
                <input type="color" class="color-input" value="#${currentColor}" data-mesh="${meshName}">
                <input type="text" class="color-value" value="#${currentColor}" readonly>
            </div>
        `;

        // Add event listener
        const colorInput = controlDiv.querySelector('.color-input');
        const colorValue = controlDiv.querySelector('.color-value');
        
        colorInput.addEventListener('input', function(e) {
            const newColor = e.target.value;
            const mesh = meshMap[this.dataset.mesh];
            
            if (mesh && mesh.material) {
                mesh.material.color.setHex(newColor.replace('#', '0x'));
                colorValue.value = newColor;
            }
        });

        controlsContainer.appendChild(controlDiv);
    });
}

function cleanMeshName(name) {
    // Clean up mesh names for display
    return name
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace(/\s+/g, ' ')
        .trim() + ' Color';
}

function onWindowResize() {
    const sceneContainer = document.getElementById('scene-container');
    const isExpanded = sceneContainer && sceneContainer.classList.contains('panel-expanded');
    
    if (window.innerWidth <= 768 && isExpanded) {
        // Mobile with expanded panel - use half height
        camera.aspect = window.innerWidth / (window.innerHeight * 0.5);
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight * 0.5);
    } else {
        // Desktop or mobile collapsed - use full screen
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    // Render scene
    renderer.render(scene, camera);
}

// Export functionality
let originalCameraPosition = null;
let originalCameraTarget = null;

function enableExportButton() {
    const exportBtn = document.getElementById('export-btn');
    exportBtn.disabled = false;
    exportBtn.addEventListener('click', exportToPNG);
}

function exportToPNG() {
    const exportBtn = document.getElementById('export-btn');
    
    // Show exporting state
    exportBtn.classList.add('exporting');
    exportBtn.textContent = '📸 Generating...';
    exportBtn.disabled = true;
    
    // Store current camera position
    originalCameraPosition = camera.position.clone();
    originalCameraTarget = controls.target.clone();
    
    // Disable auto rotation temporarily
    const wasAutoRotating = controls.autoRotate;
    controls.autoRotate = false;
    
    // Set export camera position (3/4 view like reference image)
    setExportCameraPosition();
    
    // Wait a frame for camera to update, then generate preview
    setTimeout(() => {
        // Render at export position
        controls.update();
        renderer.render(scene, camera);
        
        // Create high-resolution preview
        createHighResPreview();
        
        // Show preview modal
        showPreviewModal();
        
        // Restore camera position
        setTimeout(() => {
            restoreCameraPosition();
            controls.autoRotate = wasAutoRotating;
            
            // Reset button state
            exportBtn.classList.remove('exporting');
            exportBtn.textContent = '📸 Preview Export';
            exportBtn.disabled = false;
        }, 100);
        
    }, 100);
}

function createHighResPreview() {
    // Create a high-resolution canvas for preview
    const previewCanvas = document.getElementById('preview-canvas');
    const ctx = previewCanvas.getContext('2d');
    
    // Set high resolution (2x display size)
    const width = 1200;
    const height = 800;
    previewCanvas.width = width;
    previewCanvas.height = height;
    
    // Create temporary high-res renderer with better settings
    const tempRenderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        preserveDrawingBuffer: true,
        alpha: false 
    });
    tempRenderer.setSize(width, height);
    tempRenderer.setPixelRatio(1);
    tempRenderer.shadowMap.enabled = true;
    tempRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    tempRenderer.setClearColor(0xf5f5f5, 1); // Neutral light gray background like reference
    
    // Create temporary scene with improved lighting for export
    const tempScene = scene.clone();
    
    // Clear existing lights and add professional lighting
    tempScene.children = tempScene.children.filter(child => !child.isLight);
    
    // Soft ambient light (toned down)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    tempScene.add(ambientLight);
    
    // Main directional light (key light) - toned down
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.6);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.bias = -0.0001;
    tempScene.add(keyLight);
    
    // Fill light (softer, from opposite side) - toned down
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
    fillLight.position.set(-3, 3, -3);
    tempScene.add(fillLight);
    
    // Rim light (from behind) - toned down
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.15);
    rimLight.position.set(-2, 4, -8);
    tempScene.add(rimLight);
    
    // Render with improved lighting
    tempRenderer.render(tempScene, camera);
    
    // Copy to preview canvas
    ctx.drawImage(tempRenderer.domElement, 0, 0);
    
    // Store the high-res data for download
    window.exportImageData = tempRenderer.domElement.toDataURL('image/png', 1.0);
    
    // Clean up temp renderer
    tempRenderer.dispose();
}

function showPreviewModal() {
    const modal = document.getElementById('export-modal');
    modal.style.display = 'block';
    
    // Add event listeners if not already added
    if (!window.modalListenersAdded) {
        setupModalEventListeners();
        window.modalListenersAdded = true;
    }
}

function setupModalEventListeners() {
    const modal = document.getElementById('export-modal');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-btn');
    const downloadBtn = document.getElementById('download-btn');
    
    // Close modal functions
    const closeModal = () => {
        modal.style.display = 'none';
    };
    
    // Close button
    closeBtn.addEventListener('click', closeModal);
    
    // Cancel button
    cancelBtn.addEventListener('click', closeModal);
    
    // Click outside modal to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Download button
    downloadBtn.addEventListener('click', () => {
        if (window.exportImageData) {
            // Create download link
            const link = document.createElement('a');
            link.download = `customized-sneakers-${Date.now()}.png`;
            link.href = window.exportImageData;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Close modal after download
            closeModal();
        }
    });
    
    // ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeModal();
        }
    });
}

function setExportCameraPosition() {
    // Create a temporary pair of shoes for export
    if (loadedModel) {
        // Clone the model for the second shoe
        const secondShoe = loadedModel.clone();
        
        // Copy materials to ensure same colors
        secondShoe.traverse(function (child) {
            if (child.isMesh && child.material) {
                child.material = child.material.clone();
            }
        });
        
        // Scale up both shoes for better visibility
        const exportScale = 0.25; // Way bigger scale for export
        loadedModel.scale.set(exportScale, exportScale, exportScale);
        secondShoe.scale.set(exportScale, exportScale, exportScale);
        
        // Position the original shoe (left shoe) - more spacing
        loadedModel.position.set(-1.0, 0, 0);
        loadedModel.rotation.y = -0.15; // Slight angle
        
        // Position the second shoe (right shoe) - more spacing
        secondShoe.position.set(1.0, 0, 0);
        secondShoe.rotation.y = 0.15; // Slight angle opposite direction
        
        // Add second shoe temporarily
        scene.add(secondShoe);
        
        // Store reference for cleanup
        window.tempSecondShoe = secondShoe;
    }
    
    // Professional camera position - much further back for way bigger shoes
    camera.position.set(6, 7, 8);
    camera.lookAt(0, 0, 0); // Look at the center of the shoes
    
    // Disable orbit controls during export for consistent framing
    controls.enabled = false;
}

function restoreCameraPosition() {
    // Clean up temporary second shoe
    if (window.tempSecondShoe) {
        scene.remove(window.tempSecondShoe);
        window.tempSecondShoe = null;
    }
    
    // Restore original model position and scale
    if (loadedModel) {
        loadedModel.position.set(0, 0, 0);
        loadedModel.rotation.y = 0;
        loadedModel.scale.set(0.36, 0.36, 0.36); // Restore original scale
    }
    
    // Re-enable orbit controls
    controls.enabled = true;
    
    // Restore camera position
    if (originalCameraPosition && originalCameraTarget) {
        camera.position.copy(originalCameraPosition);
        controls.target.copy(originalCameraTarget);
        controls.update();
    }
}

// Mobile panel collapse functionality

function setupMobilePanelToggle() {
    const panel = document.getElementById('customization-panel');
    const panelHeader = document.getElementById('panel-header');
    const panelToggle = document.getElementById('panel-toggle');
    
    // Check if we're on mobile
    const isMobile = window.innerWidth <= 768;
    
    // Remove existing listeners to prevent duplicates
    panelHeader.removeEventListener('click', window.togglePanelHandler);
    panelToggle.removeEventListener('click', window.toggleButtonHandler);
    
    if (isMobile) {
        // Create and store handler functions
        window.togglePanelHandler = function() {
            togglePanel();
        };
        
        window.toggleButtonHandler = function(e) {
            e.stopPropagation(); // Prevent header click
            togglePanel();
        };
        
        // Add click listeners for mobile
        panelHeader.addEventListener('click', window.togglePanelHandler);
        panelToggle.addEventListener('click', window.toggleButtonHandler);
        
        console.log('Mobile panel toggle set up'); // Debug log
    }
    
    function togglePanel() {
        console.log('Toggle panel called'); // Debug log
        const sceneContainer = document.getElementById('scene-container');
        const isExpanded = panel.classList.contains('expanded');
        console.log('Current expanded state:', isExpanded); // Debug log
        
        if (isExpanded) {
            // Collapse panel - restore full screen
            panel.classList.remove('expanded');
            sceneContainer.classList.remove('panel-expanded');
            panelToggle.textContent = '▲';
            console.log('Collapsing panel'); // Debug log
            setTimeout(() => resizeRenderer('full'), 50);
        } else {
            // Expand panel - resize scene to top 50%
            panel.classList.add('expanded');
            sceneContainer.classList.add('panel-expanded');
            panelToggle.textContent = '▼';
            console.log('Expanding panel'); // Debug log
            setTimeout(() => resizeRenderer('half'), 50);
        }
    }
    
    function resizeRenderer(mode) {
        console.log('Resizing renderer to:', mode);
        if (!renderer) return;
        
        if (mode === 'half') {
            // Resize to top 50% of screen
            const width = window.innerWidth;
            const height = window.innerHeight * 0.5;
            renderer.setSize(width, height);
            
            // Update camera aspect ratio
            if (camera) {
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
            }
            console.log('Renderer resized to half screen:', width, height);
        } else {
            // Resize to full screen
            const width = window.innerWidth;
            const height = window.innerHeight;
            renderer.setSize(width, height);
            
            // Update camera aspect ratio
            if (camera) {
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
            }
            console.log('Renderer resized to full screen:', width, height);
        }
    }
    

}

// Handle window resize to re-setup mobile functionality
window.addEventListener('resize', () => {
    initializeMobilePanel();
    setupMobilePanelToggle();
});

// Initialize when page loads
window.addEventListener('load', () => {
    init();
    initializeMobilePanel();
    setupMobilePanelToggle();
});

function initializeMobilePanel() {
    const panel = document.getElementById('customization-panel');
    const panelToggle = document.getElementById('panel-toggle');
    const sceneContainer = document.getElementById('scene-container');
    
    // Force initial state on mobile
    if (window.innerWidth <= 768) {
        panel.classList.remove('expanded');
        sceneContainer.classList.remove('panel-expanded');
        panelToggle.textContent = '▲';
        console.log('Initialized mobile panel in collapsed state');
        
        // Ensure renderer is full screen initially
        if (renderer) {
            renderer.setSize(window.innerWidth, window.innerHeight);
            if (camera) {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
            }
        }
    }
}
