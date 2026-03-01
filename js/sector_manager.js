
window.SectorManager = {
    sectors: [
        { id: 'S1', name: 'Alpha Reach', x: 200, y: 150, difficulty: 3, isCleared: false },
        { id: 'S2', name: 'Beta Basin', x: 400, y: 350, difficulty: 5, isCleared: false },
        { id: 'S3', name: 'Gamma Gulf', x: 150, y: 450, difficulty: 7, isCleared: false },
        { id: 'S4', name: 'Delta Deep', x: 700, y: 200, difficulty: 10, isCleared: false },
        { id: 'S5', name: 'Epsilon Edge', x: 600, y: 550, difficulty: 12, isCleared: false }
    ],
    currentSectorId: 'S1',
    justNeutralized: false,
    isWarping: false,
    warpStartTime: 0,
    targetSectorName: "",
    currentPhase: 'Naval', // Phases: 'Naval', 'Assault', 'Missile', 'Cleared'

    init: function () {
        console.log("Sector Manager Initialized");
    },

    getSectorStatus: function () {
        return {
            currentId: this.currentSectorId,
            sectors: this.sectors
        };
    },

    jumpToSector: function (id, onTransitionStart) {
        const sector = this.sectors.find(s => s.id === id);
        if (!sector || id === this.currentSectorId) return;

        console.log(`Commanding Warp to Sector: ${sector.name}`);
        this.currentSectorId = id;
        this.justNeutralized = false; // Reset flag on sector jump
        this.isWarping = true; // Pause victory checks during transit
        this.warpStartTime = Date.now();
        this.targetSectorName = sector.name;
        this.currentPhase = 'Naval'; // Reset phase on jump

        if (onTransitionStart) onTransitionStart(sector);
    },

    setWarpComplete: function () {
        this.isWarping = false;
        this.warpStartTime = 0;
        this.targetSectorName = "";
        console.log("Warp System Disengaged.");
    },

    checkVictory: function (enemyCount) {
        if (this.isWarping) return false;

        if (enemyCount === 0 && this.currentSectorId) {
            const sector = this.sectors.find(s => s.id === this.currentSectorId);
            if (sector && !sector.isCleared) {
                // We only auto-clear if the phase is explicitly 'Cleared'
                if (this.currentPhase === 'Cleared') {
                    sector.isCleared = true;
                    this.justNeutralized = true;
                    return true;
                }
            }
        }
        return false;
    }
};
