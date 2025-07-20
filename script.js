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

            const target = tab.textContent === 'Seed Map' ? 'map-container' : 'chat-container';
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
                const featureInput = document.getElementById('feature-input');
                const requestedFeatures = featureInput.value.split(',').map(s => s.trim()).filter(s => s);
                const ai = new AI();
                const validFeatures = requestedFeatures.filter(feature => ai.keywords.includes(feature));

                if (validFeatures.length > 0) {
                    if (validFeatures.includes('stronghold')) {
                        thinkingMessage.remove();
                        displayMessage('ai', "I'm still learning how to find strongholds. Ask me again later!");
                    } else {
                        findSeedWithFeatures(validFeatures, thinkingMessage);
                    }
                } else {
                    thinkingMessage.remove();
                    displayMessage('ai', `I can't find that. I can look for: ${ai.keywords.join(', ')}.`);
                }
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

        // A very simple seed-based random number generator
        let random = (function(seed) {
            let a = seed;
            return function() {
                a = (a * 9301 + 49297) % 233280;
                return a / 233280;
            };
        })(seed);

        const data = Array(mapSize).fill(0).map(() => Array(mapSize).fill(0));
        const roughness = 0.8;

        function diamondSquare(size, seed, roughness) {
            const data = Array(size).fill(0).map(() => Array(size).fill(0));
            let random = (function(seed) {
                let a = seed;
                return function() {
                    a = (a * 9301 + 49297) % 233280;
                    return a / 233280;
                };
            })(seed);

            function d2(x1, y1, x2, y2, level) {
                if (level < 1) return;

                // Diamond step
                for (let i = x1 + level; i < x2; i += level) {
                    for (let j = y1 + level; j < y2; j += level) {
                        let avg = (data[i - level][j - level] + data[i][j - level] + data[i - level][j] + data[i][j]) / 4;
                        data[i - level / 2][j - level / 2] = avg + (random() - 0.5) * roughness * level;
                    }
                }

                // Square step
                for (let i = x1 + 2 * level; i < x2; i += level) {
                    for (let j = y1 + 2 * level; j < y2; j += level) {
                        let d1 = data[i - level][j] + data[i][j] + data[i - level / 2][j + level / 2] + data[i - level / 2][j - level / 2] / 4;
                        let d2 = data[i][j - level] + data[i][j] + data[i + level / 2][j - level / 2] + data[i - level / 2][j - level / 2] / 4;
                        let d3 = data[i - level][j - level] + data[i - level][j] + data[i - level / 2][j - level / 2] + data[i - level / 2][j + level / 2] / 4;
                        let d4 = data[i][j - level] + data[i - level][j - level] + data[i - level / 2][j - level / 2] + data[i + level / 2][j - level / 2] / 4;
                        data[i - level / 2][j] = d1 + (random() - 0.5) * roughness * level;
                        data[i][j - level / 2] = d2 + (random() - 0.5) * roughness * level;
                    }
                }
                d2(x1, y1, x2, y2, level / 2);
            }
            d2(0,0,size-1,size-1,size-1)
            return data;
        }

        const heightMap = diamondSquare(mapSize, seed, 0.8);


        let biomeColors = {};

        fetch(`https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/${version}/biomes.json`)
            .then(response => response.json())
            .then(biomes => {
                for (const biome of biomes) {
                    // This is a simplification. Real biome colors are more complex.
                    // We're just using a random color for each biome for now.
                    biomeColors[biome.id] = `#${Math.floor(Math.random()*16777215).toString(16)}`;
                }
            });

    function getBiome(height, temperature, humidity) {
        if (height < 0.3) return 'ocean';
        if (height > 0.9) return 'mountains';

        if (temperature < 0.3) {
            if (humidity < 0.3) return 'plains'; // Snowy plains
            else return 'plains'; // Taiga
        } else if (temperature < 0.7) {
            if (humidity < 0.3) return 'plains';
            else if (humidity < 0.7) return 'forest';
            else return 'forest'; // Jungle
        } else {
            if (humidity < 0.3) return 'desert';
            else return 'plains'; // Savanna
        }
        }

        const temperatureMap = diamondSquare(mapSize, seed + 1, 0.8);
        const humidityMap = diamondSquare(mapSize, seed + 2, 0.8);

        for (let x = 0; x < mapSize; x++) {
            for (let z = 0; z < mapSize; z++) {
                const height = heightMap[x][z];
                const temperature = temperatureMap[x][z];
                const humidity = humidityMap[x][z];
                const biome = getBiome(height, temperature, humidity);
                ctx.fillStyle = biomeColors[biome];
                ctx.fillRect(x, z, 1, 1);
            }
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
