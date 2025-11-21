// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    
    // Global CSV data storage
    let parsedCsvData = null;

    // Define the class FIRST
    class CSV3DViewer {
        constructor(containerId) {
            this.container = document.getElementById(containerId);
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.controls = null;
            this.objects = [];
            this.animationId = null;
        }

        initScene() {
            // Clear previous content
            this.container.innerHTML = '';
            
            // Create scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x222222);
            
            // Create camera
            this.camera = new THREE.PerspectiveCamera(
                75,
                this.container.offsetWidth / this.container.offsetHeight,
                0.1,
                1000
            );
            this.camera.position.set(0, 0, 10);
            
            // Create renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.container.appendChild(this.renderer.domElement);
            
            // Add lighting
            const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
            this.scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(10, 10, 5);
            directionalLight.castShadow = true;
            this.scene.add(directionalLight);
            
            // Create orbit controls
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            
            // Handle window resize
            window.addEventListener('resize', this.onWindowResize.bind(this));
            
            // Start animation
            this.animate();
        }

        animate() {
            this.animationId = requestAnimationFrame(this.animate.bind(this));
            
            if (this.controls) {
                this.controls.update();
            }
            
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        }

        onWindowResize() {
            if (!this.camera || !this.renderer) return;
            
            this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
        }

        clearScene() {
            // Remove all objects
            this.objects.forEach(obj => {
                this.scene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            });
            this.objects = [];
        }

        addTestCubes(count = 4) {
            this.clearScene();
            
            const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57];
            
            for (let i = 0; i < count; i++) {
                const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
                const material = new THREE.MeshLambertMaterial({ 
                    color: colors[i % colors.length] 
                });
                const cube = new THREE.Mesh(geometry, material);
                
                cube.position.set(i * 1.5 - (count - 1) * 0.75, 0, 0);
                cube.castShadow = true;
                cube.receiveShadow = true;
                
                this.scene.add(cube);
                this.objects.push(cube);
            }
            
            console.log('Added', count, 'test cubes');
        }

        addPointsFromCSV(data) {
            this.clearScene();
            
            if (!data || data.length === 0) {
                console.warn('No data to visualize');
                return;
            }

            // Check for x, y, z columns (case insensitive)
            const row = data[0];
            let xCol = null, yCol = null, zCol = null;
            
            for (let key in row) {
                const lowerKey = key.toLowerCase();
                if (!xCol && (lowerKey.includes('x') || lowerKey.includes('long'))) {
                    xCol = key;
                } else if (!yCol && (lowerKey.includes('y') || lowerKey.includes('lat'))) {
                    yCol = key;
                } else if (!zCol && lowerKey.includes('z')) {
                    zCol = key;
                }
                if (xCol && yCol && zCol) break;
            }
            
            // Fallback: use first three numeric columns
            if (!xCol || !yCol || !zCol) {
                const numericKeys = Object.keys(row).filter(key => 
                    typeof row[key] === 'number' && !isNaN(row[key])
                ).slice(0, 3);
                
                if (numericKeys.length >= 3) {
                    [xCol, yCol, zCol] = numericKeys;
                }
            }
            
            if (!xCol || !yCol || !zCol) {
                console.error('Could not find suitable X, Y, Z columns');
                this.addTestCubes(); // Fallback to test cubes
                return;
            }
            
            console.log('Using columns:', xCol, yCol, zCol);
            
            // Normalize data for visualization
            const xValues = data.map(d => d[xCol]).filter(v => v != null);
            const yValues = data.map(d => d[yCol]).filter(v => v != null);
            const zValues = data.map(d => d[zCol]).filter(v => v != null);
            
            const xMin = Math.min(...xValues), xMax = Math.max(...xValues);
            const yMin = Math.min(...yValues), yMax = Math.max(...yValues);
            const zMin = Math.min(...zValues), zMax = Math.max(...zValues);
            
            const xRange = xMax - xMin || 1;
            const yRange = yMax - yMin || 1;
            const zRange = zMax - zMin || 1;
            
            const scale = 8 / Math.max(xRange, yRange, zRange);
            
            // Create spheres for data points
            data.forEach((row, index) => {
                const x = (row[xCol] - xMin) / xRange * scale - scale / 2;
                const y = (row[yCol] - yMin) / yRange * scale - scale / 2;
                const z = (row[zCol] - zMin) / zRange * scale - scale / 2;
                
                const baseRadius = 0.001; // base size for a few points
                const minRadius = 0.001; // minimum radius to keep visibility
                const radius = Math.max(minRadius, baseRadius / Math.sqrt(data.length));
                const geometry = new THREE.SphereGeometry(radius, 12, 12);

                const hue = index / data.length;
                const color = new THREE.Color().setHSL(hue, 0.7, 0.5);
                const material = new THREE.MeshLambertMaterial({ 
                    color: color,
                    transparent: true,
                    opacity: 0.8
                });
                
                const sphere = new THREE.Mesh(geometry, material);
                sphere.position.set(x, y, z);
                
                this.scene.add(sphere);
                this.objects.push(sphere);
            });
            
            // Adjust camera
            this.camera.position.set(0, 0, scale * 2);
            
            console.log('Added', data.length, 'data points using columns:', xCol, yCol, zCol);
        }

        destroy() {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
            
            this.clearScene();
            
            if (this.renderer) {
                this.renderer.dispose();
                this.container.removeChild(this.renderer.domElement);
            }
            
            if (this.controls) {
                this.controls.dispose();
            }
            
            window.removeEventListener('resize', this.onWindowResize);
        }
    }

    // Now create the viewer instance (class is defined above)
    const viewer = new CSV3DViewer('view3d');

    // CSV Upload functionality
    const uploadBtn = document.getElementById('uploadBtn');
    const csvInput = document.getElementById('csvInput');

    uploadBtn.addEventListener('click', () => {
        console.log('Upload CSV button clicked');
        csvInput.click();
    });

    csvInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            console.log('No file selected');
            return;
        }

        console.log('File selected:', file.name);

        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            complete: function (results) {
                console.log('Parsing complete');
                console.log('Raw results:', results);

                parsedCsvData = results.data;
                console.log('Parsed rows:', parsedCsvData);
                console.log('First row:', parsedCsvData[0]);
                
                document.getElementById('visualizeBtn').disabled = false;
                document.getElementById('visualizeBtn').textContent = 'Visualize Data Points';
            },
            error: function (err) {
                console.error('Error while parsing CSV:', err);
            }
        });
    });

    // Visualize button functionality
    const visualizeBtn = document.getElementById('visualizeBtn');
    visualizeBtn.disabled = true; // Initially disabled

    visualizeBtn.addEventListener('click', () => {
        console.log('Visualize button clicked');
        viewer.initScene();
        
        if (parsedCsvData && parsedCsvData.length > 0) {
            viewer.addPointsFromCSV(parsedCsvData);
        } else {
            viewer.addTestCubes();
        }
    });

    // Hand controls button (placeholder)
    const handBtn = document.getElementById('handBtn');
    handBtn.addEventListener('click', () => {
        console.log('Hand controls clicked - feature coming soon');
        alert('Hand tracking controls will be implemented in Step 4!');
    });

    console.log('HIDV3D application initialized successfully!');
});


// Make sure visualize button is enabled after page loads
document.addEventListener('DOMContentLoaded', function() {
    // Your existing code here...
    
    // At the end, after all your event listeners:
    document.getElementById('visualizeBtn').addEventListener('click', () => {
        console.log('Visualize clicked - initializing 3D scene');
        viewer.initScene();
        
        if (parsedCsvData && parsedCsvData.length > 0) {
            console.log('Rendering CSV data points...');
            viewer.addPointsFromCSV(parsedCsvData);
        } else {
            console.log('No CSV data, showing test cubes');
            viewer.addTestCubes();
        }
    });
    
    console.log('All event listeners set up');
});
