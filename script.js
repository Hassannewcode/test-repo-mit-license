document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const tabs = document.querySelectorAll('.tab');
    const contentPanels = document.querySelectorAll('.content-panel');
    const canvas = document.getElementById('map-canvas');
    const ctx = canvas.getContext('2d');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = {
                '2D Map': 'map-container',
                '3D Map': '3d-map-container',
                'AI Chat': 'chat-container'
            }[tab.textContent];

            contentPanels.forEach(panel => {
                if (panel.id === target) {
                    panel.style.display = 'flex';
                } else {
                    panel.style.display = 'none';
                }
            });
        });
    });

    chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const message = chatInput.value;
            if (message.trim() !== '') {
                displayMessage('user', message);
                handleCommand(message);
                chatInput.value = '';
            }
        }
    });

    function displayMessage(sender, message, thinking = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);
        if (thinking) {
            messageElement.innerHTML = `<span class="thinking-indicator"></span> ${message}`;
        } else {
            messageElement.textContent = `[${sender}] ${message}`;
        }
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageElement;
    }

    const saveChatBtn = document.getElementById('save-chat-btn');
    const loadChatBtn = document.getElementById('load-chat-btn');
    const newChatBtn = document.getElementById('new-chat-btn');

    saveChatBtn.addEventListener('click', () => {
        const chatHistory = chatMessages.innerHTML;
        localStorage.setItem('chatHistory', chatHistory);
        displayMessage('ai', 'Chat history saved.');
    });

    loadChatBtn.addEventListener('click', () => {
        const chatHistory = localStorage.getItem('chatHistory');
        if (chatHistory) {
            chatMessages.innerHTML = chatHistory;
            displayMessage('ai', 'Chat history loaded.');
        } else {
            displayMessage('ai', 'No chat history found.');
        }
    });

    newChatBtn.addEventListener('click', () => {
        chatMessages.innerHTML = '';
        displayMessage('ai', 'New chat started.');
    });

    function handleCommand(command) {
        const thinkingMessage = displayMessage('ai', 'Thinking...', true);
        setTimeout(() => {
            const parts = command.split(' ');
            if (parts[0] === 'seed' && parts[1]) {
                const seed = parseInt(parts[1], 10);
                if (!isNaN(seed)) {
                    generateMap(seed);
                    thinkingMessage.remove();
                } else {
                    thinkingMessage.remove();
                    displayMessage('ai', 'Invalid seed. Please provide a number.');
                }
            } else if (command.toLowerCase().includes('hello') || command.toLowerCase().includes('hi')) {
                thinkingMessage.remove();
                displayMessage('ai', 'Hello! I am a Minecraft seed generation AI. How can I help you today?');
            } else if (command.toLowerCase().includes('find')) {
                const ai = new AI();
                const requestedFeatures = ai.parse(command);
                findSeedWithFeatures(requestedFeatures, thinkingMessage);
            } else {
                thinkingMessage.remove();
                displayMessage('ai', "I'm sorry, I don't understand that command. You can ask me to 'find a <feature> seed' or say 'hello'.");
            }
        }, 1000); // Simulate AI thinking time
    }

    function generateMap(seed) {
        const version = document.getElementById('version-select').value;
        const mapSize = 513;
        canvas.width = mapSize;
        canvas.height = mapSize;

        const heightMap = diamondSquare(mapSize, seed, 0.8);
        const temperatureMap = diamondSquare(mapSize, seed + 1, 0.8);
        const humidityMap = diamondSquare(mapSize, seed + 2, 0.8);

        let biomeColors = {};

        fetch(`https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/${version}/biomes.json`)
            .then(response => response.json())
            .then(biomes => {
                for (const biome of biomes) {
                    biomeColors[biome.id] = `#${Math.floor(Math.random()*16777215).toString(16)}`;
                }
                draw2DMap();
                draw3DMap();
            });

        function getBiome(height, temperature, humidity) {
            if (height < 0.3) return 'ocean';
            if (height > 0.9) return 'mountains';

            if (temperature < 0.3) {
                if (humidity < 0.3) return 'plains';
                else return 'plains';
            } else if (temperature < 0.7) {
                if (humidity < 0.3) return 'plains';
                else if (humidity < 0.7) return 'forest';
                else return 'forest';
            } else {
                if (humidity < 0.3) return 'desert';
                else return 'plains';
            }
        }

        function draw2DMap() {
            for (let x = 0; x < mapSize; x++) {
                for (let z = 0; z < mapSize; z++) {
                    const height = heightMap[x][z];
                    const temperature = temperatureMap[x][z];
                    const humidity = humidityMap[x][z];
                    const biome = getBiome(height, temperature, humidity);
                    ctx.fillStyle = biomeColors[biome] || '#000000';
                    ctx.fillRect(x, z, 1, 1);
                }
            }
        }

        function draw3DMap() {
            const container = document.getElementById('3d-map-container');
            container.innerHTML = '';
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer();
            renderer.setSize(container.clientWidth, container.clientHeight);
            container.appendChild(renderer.domElement);

            const geometry = new THREE.PlaneGeometry(mapSize, mapSize, mapSize - 1, mapSize - 1);
            const vertices = geometry.attributes.position.array;
            for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
                vertices[j + 1] = heightMap[Math.floor(i / mapSize)][i % mapSize] * 100;
            }
            geometry.attributes.position.needsUpdate = true;
            geometry.computeVertexNormals();

            const material = new THREE.MeshStandardMaterial({ color: 0xcccccc, wireframe: true });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2;
            scene.add(mesh);

            const light = new THREE.PointLight(0xffffff, 1, 1000);
            light.position.set(0, 200, 0);
            scene.add(light);

            camera.position.z = mapSize / 2;
            camera.position.y = mapSize / 2;

            function animate() {
                requestAnimationFrame(animate);
                mesh.rotation.z += 0.001;
                renderer.render(scene, camera);
            }
            animate();
        }
        displayMessage('ai', `Generated map for seed: ${seed}`);
    }

    function findSeedWithFeatures(features, thinkingMessage) {
        let seed = 0;
        let found = false;
        let bestSeed = 0;
        let bestFeaturePercentage = 0;

        const searchDuration = 5000; // Search for 5 seconds
        const startTime = Date.now();

        const searchInterval = setInterval(() => {
            const mapSize = 257; // Larger map for better quality
            const heightMap = diamondSquare(mapSize, seed, 0.8);
            const temperatureMap = diamondSquare(mapSize, seed + 1, 0.8);
            const humidityMap = diamondSquare(mapSize, seed + 2, 0.8);

            let featureCount = 0;
            for (let x = 0; x < mapSize; x++) {
                for (let z = 0; z < mapSize; z++) {
                    const height = heightMap[x][z];
                    const temperature = temperatureMap[x][z];
                    const humidity = humidityMap[x][z];
                    const biome = getBiome(height, temperature, humidity);
                    if (features.includes(biome)) {
                        featureCount++;
                    }
                }
            }
            const featurePercentage = featureCount / (mapSize * mapSize);
            if (featurePercentage > bestFeaturePercentage) {
                bestFeaturePercentage = featurePercentage;
                bestSeed = seed;
            }

            if (Date.now() - startTime > searchDuration) {
                found = true;
                clearInterval(searchInterval);
                thinkingMessage.remove();
                displayMessage('ai', `I found a seed with a large amount of ${features.join(', ')} (${(bestFeaturePercentage * 100).toFixed(2)}%): ${bestSeed}`);
                generateMap(bestSeed);
            } else {
                seed++;
            }
        }, 10); // Faster search interval
    }
});
