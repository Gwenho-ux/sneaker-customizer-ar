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

        colorInput.addEventListener('input', function (e) {
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
        window.togglePanelHandler = function () {
            togglePanel();
        };

        window.toggleButtonHandler = function (e) {
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

// ============================================================================
// AR FUNCTIONALITY
// ============================================================================

// AR Mode Variables
let isARMode = false;
let arVideo = null;
let arOverlayCanvas = null;
let arOverlayContext = null;
let ar3DCanvas = null;
let arCamera = null;
let arRenderer = null;
let arScene = null;
let arShoeModel = null;
let pose = null;
let videoStream = null;
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// AR Initialization
function initAR() {
    console.log('Initializing AR...');

    // Get AR elements
    arVideo = document.getElementById('ar-video');
    arOverlayCanvas = document.getElementById('ar-overlay-canvas');
    ar3DCanvas = document.getElementById('ar-3d-canvas');
    arOverlayContext = arOverlayCanvas.getContext('2d');

    // Initialize MediaPipe Pose
    pose = new Pose({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
    });

    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.7, // Higher confidence for better detection
        minTrackingConfidence: 0.6
    });

    pose.onResults(onPoseResults);

    // Setup AR event listeners
    setupAREventListeners();

    console.log('AR initialized successfully');
}

// Setup AR Event Listeners
function setupAREventListeners() {
    const arModeBtn = document.getElementById('ar-mode-btn');
    const normalModeBtn = document.getElementById('normal-mode-btn');
    const arCaptureBtn = document.getElementById('ar-capture-btn');

    if (arModeBtn) {
        arModeBtn.addEventListener('click', enterARMode);
    }

    if (normalModeBtn) {
        normalModeBtn.addEventListener('click', exitARMode);
    }

    if (arCaptureBtn) {
        arCaptureBtn.addEventListener('click', captureARPhoto);
    }
}

// Enter AR Mode
async function enterARMode() {
    console.log('Entering AR mode...');

    try {
        updateARStatus('Requesting camera permission...', 'detecting');

        // Get camera constraints based on device type
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: isMobile ? 'environment' : 'user', // Back camera on mobile, front on desktop
                frameRate: { ideal: 30 }
            },
            audio: false
        };

        // Request camera access
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        arVideo.srcObject = videoStream;

        // Wait for video to load and play
        await new Promise((resolve) => {
            arVideo.onloadedmetadata = () => {
                arVideo.play();
                console.log('Video loaded:', arVideo.videoWidth, 'x', arVideo.videoHeight);
                resolve();
            };
        });

        // Setup AR scene
        setupARScene();

        // Show AR UI
        showARInterface();

        // Start pose detection
        updateARStatus('Looking for feet...', 'detecting');
        startPoseDetection();

        isARMode = true;

        console.log('AR mode activated successfully');

    } catch (error) {
        console.error('Error entering AR mode:', error);
        updateARStatus('Camera access denied. Please allow camera permission.', 'error');

        // Handle different error cases
        if (error.name === 'NotAllowedError') {
            updateARStatus('Camera permission denied. Please enable camera access.', 'error');
        } else if (error.name === 'NotFoundError') {
            updateARStatus('No camera found. Please connect a camera.', 'error');
        } else {
            updateARStatus('Camera error. Please try again.', 'error');
        }
    }
}

// Exit AR Mode
function exitARMode() {
    console.log('Exiting AR mode...');

    // Stop camera stream
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }

    // Hide AR UI
    hideARInterface();

    // Reset AR status
    updateARStatus('Looking for feet...', '');

    isARMode = false;

    console.log('AR mode deactivated');
}

// Setup AR Scene
function setupARScene() {
    // Create AR-specific Three.js scene
    arScene = new THREE.Scene();

    // Create AR camera with different settings optimized for foot AR
    arCamera = new THREE.PerspectiveCamera(
        60, // Slightly narrower FOV for better perspective
        ar3DCanvas.width / ar3DCanvas.height,
        0.1,
        100
    );

    // Position camera for better AR perspective
    arCamera.position.set(0, 0, 5);
    arCamera.lookAt(0, 0, 0);

    // Create AR renderer
    arRenderer = new THREE.WebGLRenderer({
        canvas: ar3DCanvas,
        alpha: true,
        antialias: true
    });
    arRenderer.setSize(ar3DCanvas.width, ar3DCanvas.height);
    arRenderer.setClearColor(0x000000, 0); // Transparent background

    // Clone the current shoe model for AR
    if (loadedModel) {
        arShoeModel = loadedModel.clone();
        arShoeModel.scale.set(0.1, 0.1, 0.1); // Much smaller scale for AR
        arScene.add(arShoeModel);

        // Add lighting for AR scene
        const arLight = new THREE.DirectionalLight(0xffffff, 1);
        arLight.position.set(0, 10, 5);
        arScene.add(arLight);

        const arAmbientLight = new THREE.AmbientLight(0xffffff, 0.6);
        arScene.add(arAmbientLight);
    }
}

// Show AR Interface
function showARInterface() {
    console.log('Showing AR interface...');

    const arContainer = document.getElementById('ar-container');
    const sceneContainer = document.getElementById('scene-container');
    const panel = document.getElementById('customization-panel');
    const arModeBtn = document.getElementById('ar-mode-btn');
    const normalModeBtn = document.getElementById('normal-mode-btn');
    const exportBtn = document.getElementById('export-btn');
    const arCaptureBtn = document.getElementById('ar-capture-btn');

    // Show AR container
    if (arContainer) {
        arContainer.classList.remove('hidden');
        console.log('AR container shown');
    }

    // Hide 3D scene
    if (sceneContainer) {
        sceneContainer.style.display = 'none';
        console.log('3D scene hidden');
    }

    // Update panel appearance
    if (panel) {
        panel.classList.add('ar-active');
        // Ensure panel is visible on mobile
        if (isMobile) {
            panel.classList.add('ar-mode');
        }
    }

    // Toggle buttons
    if (arModeBtn) arModeBtn.classList.add('hidden');
    if (normalModeBtn) normalModeBtn.classList.remove('hidden');
    if (exportBtn) exportBtn.classList.add('hidden');
    if (arCaptureBtn) arCaptureBtn.classList.remove('hidden');

    // Apply mobile-specific video styles
    if (isMobile && arVideo) {
        arVideo.classList.remove('front-camera');
        console.log('Applied mobile camera styles');
    }

    // Resize AR canvases to match video
    setTimeout(() => {
        resizeARCanvases();
    }, 100);

    console.log('AR interface setup complete');
}

// Hide AR Interface
function hideARInterface() {
    const arContainer = document.getElementById('ar-container');
    const sceneContainer = document.getElementById('scene-container');
    const panel = document.getElementById('customization-panel');
    const arModeBtn = document.getElementById('ar-mode-btn');
    const normalModeBtn = document.getElementById('normal-mode-btn');
    const exportBtn = document.getElementById('export-btn');
    const arCaptureBtn = document.getElementById('ar-capture-btn');

    // Hide AR container
    if (arContainer) arContainer.classList.add('hidden');

    // Show 3D scene
    if (sceneContainer) sceneContainer.style.display = 'block';

    // Update panel appearance
    if (panel) panel.classList.remove('ar-active');

    // Toggle buttons
    if (arModeBtn) arModeBtn.classList.remove('hidden');
    if (normalModeBtn) normalModeBtn.classList.add('hidden');
    if (exportBtn) exportBtn.classList.remove('hidden');
    if (arCaptureBtn) arCaptureBtn.classList.add('hidden');
}

// Start Pose Detection
function startPoseDetection() {
    if (!pose || !arVideo) return;

    console.log('Starting pose detection...');

    const camera = new Camera(arVideo, {
        onFrame: async () => {
            if (isARMode && arVideo.readyState >= 2 && arVideo.videoWidth > 0) {
                try {
                    await pose.send({ image: arVideo });
                } catch (error) {
                    console.error('Pose detection error:', error);
                }
            }
        },
        width: 1280,
        height: 720
    });

    // Add error handling
    camera.start().catch(error => {
        console.error('Camera start error:', error);
        updateARStatus('Camera error - try refreshing', 'error');
    });
}

// Handle Pose Detection Results
function onPoseResults(results) {
    if (!isARMode || !arOverlayContext || !arOverlayCanvas) return;

    // Resize canvases to match video
    resizeARCanvases();

    // Clear overlay canvas
    arOverlayContext.clearRect(0, 0, arOverlayCanvas.width, arOverlayCanvas.height);

    // Check if pose landmarks are detected with proper validation
    if (results.poseLandmarks && results.poseLandmarks.length >= 33) {
        const landmarks = results.poseLandmarks;

        // Get foot landmarks with visibility check
        const leftAnkle = landmarks[27]?.visibility > 0.5 ? landmarks[27] : null;
        const rightAnkle = landmarks[28]?.visibility > 0.5 ? landmarks[28] : null;
        const leftHeel = landmarks[29]?.visibility > 0.5 ? landmarks[29] : null;
        const rightHeel = landmarks[30]?.visibility > 0.5 ? landmarks[30] : null;
        const leftFootIndex = landmarks[31]?.visibility > 0.5 ? landmarks[31] : null;
        const rightFootIndex = landmarks[32]?.visibility > 0.5 ? landmarks[32] : null;

        // Count visible foot landmarks
        const leftFootLandmarks = [leftAnkle, leftHeel, leftFootIndex].filter(Boolean).length;
        const rightFootLandmarks = [rightAnkle, rightHeel, rightFootIndex].filter(Boolean).length;

        console.log(`Foot detection: Left=${leftFootLandmarks}/3, Right=${rightFootLandmarks}/3`);

        // Check if we have good foot detection (at least 2 landmarks per foot)
        const hasGoodLeftFoot = leftFootLandmarks >= 2;
        const hasGoodRightFoot = rightFootLandmarks >= 2;

        if (hasGoodLeftFoot || hasGoodRightFoot) {
            // Check if we have both ankle and foot index for positioning
            const hasCompleteRightFoot = rightAnkle && rightFootIndex;
            const hasCompleteLeftFoot = leftAnkle && leftFootIndex;

            if (hasCompleteRightFoot || hasCompleteLeftFoot) {
                updateARStatus('Shoe positioned! Try moving your foot 👟✨', 'success');

                // Draw foot indicators
                drawFootIndicators(leftAnkle, rightAnkle, leftFootIndex, rightFootIndex);

                // Position AR shoe
                positionARShoe(leftAnkle, rightAnkle, leftFootIndex, rightFootIndex);
            } else {
                updateARStatus('Feet detected - show ankle and toes clearly 👣', 'detecting');

                // Draw whatever foot indicators we have
                drawFootIndicators(leftAnkle, rightAnkle, leftFootIndex, rightFootIndex);
            }

            // Always render AR scene when feet detected
            if (arRenderer && arScene && arCamera) {
                arRenderer.render(arScene, arCamera);
            }
        } else {
            updateARStatus('Point camera at your feet - move closer 👣', 'detecting');

            // Clear the 3D scene when no feet detected
            if (arShoeModel) {
                arShoeModel.visible = false;
            }

            // Draw a simple indicator that pose detection is working
            drawPoseDetectionIndicator();
        }
    } else {
        updateARStatus('Looking for pose...', 'detecting');

        // Hide shoe when no pose detected
        if (arShoeModel) {
            arShoeModel.visible = false;
        }

        // Draw "no pose" indicator
        drawNoPoseIndicator();
    }
}

// Draw indicator when pose detection is working but no feet found
function drawPoseDetectionIndicator() {
    const centerX = arOverlayCanvas.width / 2;
    const centerY = arOverlayCanvas.height / 2;

    arOverlayContext.fillStyle = 'rgba(255, 255, 0, 0.7)';
    arOverlayContext.font = 'bold 16px Poppins';
    arOverlayContext.textAlign = 'center';
    arOverlayContext.fillText('📸 Pose detection active', centerX, centerY - 40);
    arOverlayContext.fillText('Point camera at your feet', centerX, centerY - 20);
    arOverlayContext.textAlign = 'left';
}

// Draw indicator when no pose is detected at all
function drawNoPoseIndicator() {
    const centerX = arOverlayCanvas.width / 2;
    const centerY = arOverlayCanvas.height / 2;

    arOverlayContext.fillStyle = 'rgba(255, 107, 107, 0.7)';
    arOverlayContext.font = 'bold 16px Poppins';
    arOverlayContext.textAlign = 'center';
    arOverlayContext.fillText('⚠️ Looking for person...', centerX, centerY - 20);
    arOverlayContext.fillText('Make sure you are in the camera view', centerX, centerY);
    arOverlayContext.textAlign = 'left';
}

// Draw Foot Indicators
function drawFootIndicators(leftAnkle, rightAnkle, leftFootIndex, rightFootIndex) {
    const canvasWidth = arOverlayCanvas.width;
    const canvasHeight = arOverlayCanvas.height;

    // Draw indicators for detected foot parts
    if (leftAnkle) {
        const x = leftAnkle.x * canvasWidth;
        const y = leftAnkle.y * canvasHeight;
        drawFootPoint(x, y, 'L👣', '#00ff00'); // Green for ankle
    }

    if (rightAnkle) {
        const x = rightAnkle.x * canvasWidth;
        const y = rightAnkle.y * canvasHeight;
        drawFootPoint(x, y, 'R👣', '#00ff00'); // Green for ankle
    }

    if (leftFootIndex) {
        const x = leftFootIndex.x * canvasWidth;
        const y = leftFootIndex.y * canvasHeight;
        drawFootPoint(x, y, 'L👟', '#ff6b6b'); // Red for foot tip
    }

    if (rightFootIndex) {
        const x = rightFootIndex.x * canvasWidth;
        const y = rightFootIndex.y * canvasHeight;
        drawFootPoint(x, y, 'R👟', '#ff6b6b'); // Red for foot tip
    }

    // Draw connection line between ankle and foot for active foot
    if (rightAnkle && rightFootIndex) {
        drawFootConnection(rightAnkle, rightFootIndex, canvasWidth, canvasHeight, '#00ff00');
    } else if (leftAnkle && leftFootIndex) {
        drawFootConnection(leftAnkle, leftFootIndex, canvasWidth, canvasHeight, '#00ff00');
    }
}

// Draw individual foot point
function drawFootPoint(x, y, label, color = '#00ff00') {
    // Draw circle
    arOverlayContext.fillStyle = color;
    arOverlayContext.beginPath();
    arOverlayContext.arc(x, y, 10, 0, 2 * Math.PI);
    arOverlayContext.fill();

    // Draw white border
    arOverlayContext.strokeStyle = '#ffffff';
    arOverlayContext.lineWidth = 2;
    arOverlayContext.stroke();

    // Draw label
    arOverlayContext.fillStyle = '#ffffff';
    arOverlayContext.font = 'bold 14px Poppins';
    arOverlayContext.shadowColor = '#000000';
    arOverlayContext.shadowBlur = 3;
    arOverlayContext.fillText(label, x + 15, y + 5);
    arOverlayContext.shadowBlur = 0;
}

// Draw connection line between foot landmarks
function drawFootConnection(ankle, footIndex, canvasWidth, canvasHeight, color = '#00ff00') {
    const ankleX = ankle.x * canvasWidth;
    const ankleY = ankle.y * canvasHeight;
    const footX = footIndex.x * canvasWidth;
    const footY = footIndex.y * canvasHeight;

    // Draw connection line
    arOverlayContext.strokeStyle = color;
    arOverlayContext.lineWidth = 3;
    arOverlayContext.setLineDash([5, 5]); // Dashed line
    arOverlayContext.beginPath();
    arOverlayContext.moveTo(ankleX, ankleY);
    arOverlayContext.lineTo(footX, footY);
    arOverlayContext.stroke();
    arOverlayContext.setLineDash([]); // Reset to solid line
}

// Position AR Shoe
function positionARShoe(leftAnkle, rightAnkle, leftFootIndex, rightFootIndex) {
    if (!arShoeModel || !arCamera) return;

    // Determine which foot to use and get both ankle and foot landmarks
    let ankle = null;
    let footIndex = null;
    let isLeftFoot = false;

    // Prefer right foot, but use left if right is not available
    if (rightAnkle && rightFootIndex) {
        ankle = rightAnkle;
        footIndex = rightFootIndex;
        isLeftFoot = false;
    } else if (leftAnkle && leftFootIndex) {
        ankle = leftAnkle;
        footIndex = leftFootIndex;
        isLeftFoot = true;
    }

    if (ankle && footIndex) {
        // Calculate foot center position (between ankle and foot index)
        const footCenterX = (ankle.x + footIndex.x) / 2;
        const footCenterY = (ankle.y + footIndex.y) / 2;

        // Convert normalized coordinates to 3D world position
        // Adjust scale based on distance from camera (Z depth simulation)
        const screenX = (footCenterX - 0.5) * 6; // Reduced scale for better positioning
        const screenY = -(footCenterY - 0.5) * 6; // Flip Y and reduce scale

        // Position shoe slightly forward from the foot center
        const footForwardOffset = 0.2; // Move shoe slightly towards toes
        const offsetX = (footIndex.x - ankle.x) * footForwardOffset;
        const offsetY = -(footIndex.y - ankle.y) * footForwardOffset;

        // Final position with offset
        const finalX = screenX + offsetX;
        const finalY = screenY + offsetY;
        const finalZ = -2; // Place slightly in front of camera

        // Position the shoe
        arShoeModel.position.set(finalX, finalY, finalZ);

        // Calculate foot orientation
        const footDirection = {
            x: footIndex.x - ankle.x,
            y: footIndex.y - ankle.y
        };

        // Calculate rotation angles
        const footAngle = Math.atan2(footDirection.y, footDirection.x);

        // Apply rotation (adjust for foot orientation)
        arShoeModel.rotation.set(0, 0, -footAngle); // Negative for correct orientation

        // Mirror shoe for left foot
        if (isLeftFoot) {
            arShoeModel.rotation.y = Math.PI; // Flip for left foot
        } else {
            arShoeModel.rotation.y = 0; // Normal for right foot
        }

        // Adjust scale based on foot size (distance between ankle and foot)
        const footLength = Math.sqrt(
            Math.pow(footIndex.x - ankle.x, 2) +
            Math.pow(footIndex.y - ankle.y, 2)
        );

        // Dynamic scale based on foot size (with reasonable limits)
        const dynamicScale = Math.max(0.05, Math.min(0.15, footLength * 2));
        arShoeModel.scale.set(dynamicScale, dynamicScale, dynamicScale);

        // Make shoe visible
        arShoeModel.visible = true;

        console.log(`Shoe positioned at: (${finalX.toFixed(2)}, ${finalY.toFixed(2)}, ${finalZ}) 
                     Scale: ${dynamicScale.toFixed(3)} 
                     Foot: ${isLeftFoot ? 'Left' : 'Right'}
                     Angle: ${(footAngle * 180 / Math.PI).toFixed(1)}°`);
    } else {
        // Hide shoe if foot landmarks are not available
        if (arShoeModel) arShoeModel.visible = false;
    }
}

// Resize AR Canvases
function resizeARCanvases() {
    if (!arVideo || !arOverlayCanvas || !ar3DCanvas) return;

    const videoWidth = arVideo.videoWidth;
    const videoHeight = arVideo.videoHeight;

    if (videoWidth && videoHeight) {
        // Resize both canvases
        arOverlayCanvas.width = videoWidth;
        arOverlayCanvas.height = videoHeight;
        ar3DCanvas.width = videoWidth;
        ar3DCanvas.height = videoHeight;

        // Update AR camera aspect ratio
        if (arCamera) {
            arCamera.aspect = videoWidth / videoHeight;
            arCamera.updateProjectionMatrix();
        }

        // Update AR renderer size
        if (arRenderer) {
            arRenderer.setSize(videoWidth, videoHeight);
        }
    }
}

// Update AR Status
function updateARStatus(message, type = '') {
    const statusElement = document.getElementById('ar-status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `ar-status ${type}`;
    }
}

// Capture AR Photo
function captureARPhoto() {
    if (!arOverlayCanvas || !ar3DCanvas || !arVideo) return;

    try {
        // Create a temporary canvas for the combined image
        const tempCanvas = document.createElement('canvas');
        const tempContext = tempCanvas.getContext('2d');

        tempCanvas.width = arVideo.videoWidth;
        tempCanvas.height = arVideo.videoHeight;

        // Draw video frame
        tempContext.drawImage(arVideo, 0, 0);

        // Draw 3D AR content
        tempContext.drawImage(ar3DCanvas, 0, 0);

        // Draw overlay indicators
        tempContext.drawImage(arOverlayCanvas, 0, 0);

        // Convert to blob and download
        tempCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sneaker-ar-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/png');

        updateARStatus('📸 Photo captured!', 'success');
        setTimeout(() => updateARStatus('Feet detected! 👟', 'success'), 2000);

    } catch (error) {
        console.error('Error capturing AR photo:', error);
        updateARStatus('Error capturing photo', 'error');
    }
}

// Debug function to check AR status
function debugARStatus() {
    console.log('=== AR Debug Status ===');
    console.log('isARMode:', isARMode);
    console.log('arVideo element:', arVideo);
    console.log('arVideo dimensions:', arVideo ? `${arVideo.videoWidth}x${arVideo.videoHeight}` : 'N/A');
    console.log('arVideo playing:', arVideo ? !arVideo.paused : 'N/A');
    console.log('arVideo readyState:', arVideo ? arVideo.readyState : 'N/A');
    console.log('arVideo srcObject:', arVideo ? !!arVideo.srcObject : 'N/A');
    console.log('MediaPipe pose:', pose);
    console.log('arOverlayCanvas:', arOverlayCanvas);
    console.log('ar3DCanvas:', ar3DCanvas);
    console.log('arRenderer:', arRenderer);
    console.log('arShoeModel visible:', arShoeModel ? arShoeModel.visible : 'N/A');
    console.log('arContainer hidden:', document.getElementById('ar-container')?.classList.contains('hidden'));
    console.log('isMobile:', isMobile);
    console.log('========================');
}

// Test MediaPipe pose detection
function testPoseDetection() {
    if (!pose) {
        console.log('MediaPipe pose not initialized');
        return;
    }

    console.log('Testing pose detection...');
    console.log('Pose model ready:', pose);

    // Check if video is ready for processing
    if (arVideo && arVideo.readyState >= 2) {
        console.log('Video ready for pose detection');
        pose.send({ image: arVideo }).then(() => {
            console.log('Pose detection test successful');
        }).catch(error => {
            console.error('Pose detection test failed:', error);
        });
    } else {
        console.log('Video not ready for pose detection');
    }
}

// Initialize AR when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Three.js to initialize first
    setTimeout(() => {
        initAR();

        // Add debug functions to window for testing
        window.debugAR = debugARStatus;
        window.testPose = testPoseDetection;
    }, 1000);
});

// Handle window resize for AR
window.addEventListener('resize', () => {
    if (isARMode) {
        resizeARCanvases();
    }
});
