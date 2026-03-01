let water, carrierRoot, escortRoot;
let carrierTarget = null;

window.CarrierCommand = {
    init: function (canvasId) {
        const core = EngineCore.init(canvasId, () => this.updateMovement());
        engine = core.engine;
        scene = core.scene;
        camera = core.camera;
        sun = core.sun;
        shadowGenerator = core.shadowGenerator;
        water = core.water;

        this.carrierHp = 25;
        this.carrierMaxHp = 25;
        this.lastCarrierRepairTime = 0;

        // Picking Listener
        scene.onPointerDown = (evt, pickResult) => {
            if (pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh.metadata) {
                const unitId = pickResult.pickedMesh.metadata.unitId;
                const enemyId = pickResult.pickedMesh.metadata.enemyId;

                if (enemyId !== undefined) {
                    this.selectEnemy(enemyId);
                } else if (unitId && RadarSystem.getSelectedEnemyId() !== null) {
                    this.assignUnitToTarget(unitId, RadarSystem.getSelectedEnemyId());
                }
            }
        };

        SectorManager.init();

        // Initial enemy spawn for starting sector
        const startSector = SectorManager.sectors.find(s => s.id === SectorManager.currentSectorId);
        if (startSector) {
            this.initRadar("radarUI").then(() => {
                RadarSystem.spawnSectorEnemies(startSector.difficulty);
            });
        }

        console.log("Carrier Command Orchestrator Initialized");
    },

    getSectorData: function () {
        return SectorManager.getSectorStatus();
    },

    jumpToSector: function (id) {
        SectorManager.jumpToSector(id, async (sector) => {
            // 1. Warp visual/state reset
            console.log(`Initiating Sailing Sequence to ${sector.name}...`);

            // 2. Recall all units (safety)
            Object.keys(UnitManager.units).forEach(uid => UnitManager.returnUnitToBase(uid));

            // 3. Clear existing hostiles immediately
            RadarSystem.clearEnemies();

            // 4. Reset carrier position to center for immersion
            carrierRoot.position.x = 0;
            carrierRoot.position.z = 0;
            carrierTarget = null;

            // 5. Simulate 10s "Sailing" transition
            await new Promise(resolve => setTimeout(resolve, 10000));

            // 6. Spawn new hostiles
            await RadarSystem.spawnSectorEnemies(sector.difficulty);

            // 7. Signal Warp Complete
            SectorManager.setWarpComplete();

            console.log("Arrival at destination. New contacts detected.");
        });
    },

    // Helper to safely add meshes to the water reflection list
    _addToWater: function (node) {
        if (!water) return;

        // Babylon.js WaterMaterial.renderList only accepts AbstractMesh objects.
        // If we pass a TransformNode directly, it can crash the renderer.
        if (node instanceof BABYLON.AbstractMesh) {
            water.addToRenderList(node);
        }

        // Recursively add all child meshes
        const meshes = node.getChildMeshes();
        meshes.forEach(m => water.addToRenderList(m));
    },

    loadModel: async function (url, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
        const node = await ModelLoader.loadModel(scene, shadowGenerator, url, position, rotation, scale);
        this._addToWater(node);
        return node;
    },

    setCarrierRoot: function (node) {
        carrierRoot = node;
        if (camera) {
            camera.lockedTarget = carrierRoot;
        }
        this._addToWater(node);
    },

    setEscortRoot: function (node) {
        escortRoot = node;
        this._addToWater(node);
    },

    setParent: function (child, parent) {
        child.parent = parent;
    },

    registerTurret: function (node) {
        DefenseSystem.registerTurret(node);
        this._addToWater(node);
    },

    initRadar: async function (uiId) {
        return RadarSystem.init(scene, uiId,
            (x, y, w, h) => this.handleRadarClick(x, y, w, h),
            (url, pos, rot, sc) => this.loadModel(url, pos, rot, sc)
        );
    },

    selectEnemy: function (id) {
        return RadarSystem.selectEnemy(id);
    },

    handleRadarClick: function (offsetX, offsetY, width, height) {
        const nx = (offsetX / width) * 2 - 1;
        const ny = (offsetY / height) * 2 - 1;

        // Delegate enemy check to radar system
        const clickDistTol = 0.1;
        let clickedEnemy = RadarSystem.radarEnemies.find(e => {
            const relX = (e.x - carrierRoot.position.x) / RadarSystem.radarRange;
            const relZ = (e.z - carrierRoot.position.z) / RadarSystem.radarRange;
            const dist = Math.sqrt(Math.pow(relX - nx, 2) + Math.pow(relZ - (-ny), 2));
            return dist < clickDistTol;
        });

        if (clickedEnemy) {
            this.selectEnemy(clickedEnemy.id);
            return;
        }

        if (carrierRoot) {
            const worldX = carrierRoot.position.x + nx * RadarSystem.radarRange;
            const worldZ = carrierRoot.position.z + (-ny * RadarSystem.radarRange);
            carrierTarget = new BABYLON.Vector3(worldX, 0, worldZ);
        }
    },

    updateMovement: function () {
        if (!carrierRoot) return;

        // 1. Move Carrier
        if (carrierTarget) {
            const dir = carrierTarget.subtract(carrierRoot.position);
            dir.y = 0;
            const dist = dir.length();

            if (dist > 2.0) {
                dir.normalize();
                const targetRot = Math.atan2(dir.x, dir.z);
                let diff = targetRot - carrierRoot.rotation.y;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                carrierRoot.rotation.y += diff * 0.01;
                carrierRoot.position.addInPlace(carrierRoot.forward.scale(0.1));
            } else {
                carrierTarget = null;
            }
        }

        // Apply Buoyancy/Bobbing to Carrier
        const time = Date.now() * 0.001;
        // Boosted base height to 0.7 for high-swell clearance
        carrierRoot.position.y = Math.sin(time * 0.5) * 0.2 + 0.7;
        carrierRoot.rotation.x = Math.sin(time * 0.3) * 0.02;     // Slight pitch
        carrierRoot.rotation.z = Math.cos(time * 0.4) * 0.01;     // Slight roll

        // 2. Update Units
        UnitManager.updateUnits(scene, carrierRoot, RadarSystem.radarEnemies, RadarSystem.getSelectedEnemyId(), (id) => this.selectEnemy(id));

        // 2.5 Update Defense System (Player Auto-Turrets)
        DefenseSystem.update(scene, carrierRoot, RadarSystem.radarEnemies);

        // 2.6 Update Enemy Combat (Counter-Attacks)
        RadarSystem.updateEnemyCombat(scene, carrierRoot, escortRoot, UnitManager.units);

        // 2.7 Carrier Auto-Repair (1 HP per 3 seconds)
        if (this.carrierHp < this.carrierMaxHp && this.carrierHp > 0) {
            if (now - this.lastCarrierRepairTime > 3000) {
                this.carrierHp = Math.min(this.carrierMaxHp, this.carrierHp + 1);
                this.lastCarrierRepairTime = now;
                console.log(`Carrier repaired: ${this.carrierHp}/${this.carrierMaxHp}`);
            }
        }

        // 3. Update Visibility
        RadarSystem.updateVisibility(carrierRoot);

        // 4. Check for victory
        SectorManager.checkVictory(RadarSystem.radarEnemies.length);
    },

    getRadarData: function () {
        const radarData = RadarSystem.getRadarData(carrierRoot);
        radarData.units = Object.keys(UnitManager.units).map(id => ({
            id: id,
            state: UnitManager.units[id].state,
            hp: UnitManager.units[id].hp,
            maxHp: UnitManager.units[id].maxHp
        }));
        radarData.isGunsEngaged = DefenseSystem.isEngaged;
        radarData.carrierHp = this.carrierHp;
        radarData.carrierMaxHp = this.carrierMaxHp;

        // Pass the alert flag to UI and clear it
        radarData.isSectorNeutralized = SectorManager.justNeutralized;
        SectorManager.justNeutralized = false;

        // Warp Timing for Progress Bar
        radarData.warpTimeRemaining = 0;
        if (SectorManager.isWarping && SectorManager.warpStartTime > 0) {
            const elapsed = (Date.now() - SectorManager.warpStartTime) / 1000;
            radarData.warpTimeRemaining = Math.max(0, 10 - elapsed);
            radarData.targetSectorName = SectorManager.targetSectorName;
        }

        return radarData;
    },

    registerUnit: function (id, node) {
        UnitManager.registerUnit(carrierRoot, id, node);
        this._addToWater(node);
    },

    assignUnitToTarget: function (unitId, enemyId) {
        UnitManager.assignUnitToTarget(unitId, enemyId);
    },

    launchUnit: function (id) {
        UnitManager.launchUnit(carrierRoot, RadarSystem.getSelectedEnemyId(), id);
    },

    returnUnitToBase: function (id) {
        UnitManager.returnUnitToBase(id);
    },

    setGunsEngaged: function (val) {
        DefenseSystem.isEngaged = val;
    }
};
