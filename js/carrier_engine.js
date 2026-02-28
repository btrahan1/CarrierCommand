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

        console.log("Carrier Command Orchestrator Initialized");
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

        // 2. Update Units
        UnitManager.updateUnits(scene, carrierRoot, RadarSystem.radarEnemies, RadarSystem.getSelectedEnemyId(), (id) => this.selectEnemy(id));

        // 2.5 Update Defense System
        DefenseSystem.update(scene, carrierRoot, RadarSystem.radarEnemies);

        // 3. Update Visibility
        RadarSystem.updateVisibility(carrierRoot);
    },

    getRadarData: function () {
        const radarData = RadarSystem.getRadarData(carrierRoot);
        radarData.units = Object.keys(UnitManager.units).map(id => ({
            id: id,
            state: UnitManager.units[id].state
        }));
        radarData.isGunsEngaged = DefenseSystem.isEngaged;
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
