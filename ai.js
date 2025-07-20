class AI {
    constructor() {
        this.keywords = ['ocean', 'desert', 'mountains', 'forest', 'stronghold', 'village', 'temple', 'jungle', 'savanna', 'badlands', 'mushroom'];
    }

    parse(command) {
        const requestedFeatures = this.keywords.filter(feature => command.toLowerCase().includes(feature));
        return requestedFeatures;
    }
}
