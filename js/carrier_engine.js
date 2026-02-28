let carrierRoot, escortRoot;
let carrierTarget = null;

window.CarrierCommand = {
    init: function (canvasId) {
        // The global variables engine, scene, camera, sun, shadowGenerator are declared above
        // and will be assigned here from the return value of EngineCore.init
        const core = EngineCore.init(canvasId, () => this.updateMovement());
        engine = core.engine;
        scene = core.scene;
        camera = core.camera;
        sun = core.sun;
        shadowGenerator = core.shadowGenerator;

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

    loadModel: async function (url, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
        return ModelLoader.loadModel(scene, shadowGenerator, url, position, rotation, scale);
    },

    setCarrierRoot: function (node) {
        carrierRoot = node;
        if (camera) {
            camera.lockedTarget = carrierRoot;
        }
    },

    setEscortRoot: function (node) {
        escortRoot = node;
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

        // 3. Update Visibility
        RadarSystem.updateVisibility(carrierRoot);
    },

    getRadarData: function () {
        const radarData = RadarSystem.getRadarData(carrierRoot);
        radarData.units = Object.keys(UnitManager.units).map(id => ({
            id: id,
            state: UnitManager.units[id].state
        }));
        return radarData;
    },

    registerUnit: function (id, node) {
        UnitManager.registerUnit(carrierRoot, id, node);
    },

    assignUnitToTarget: function (unitId, enemyId) {
        UnitManager.assignUnitToTarget(unitId, enemyId);
    },

    launchUnit: function (id) {
        UnitManager.launchUnit(carrierRoot, RadarSystem.getSelectedEnemyId(), id);
    },

    returnUnitToBase: function (id) {
        UnitManager.returnUnitToBase(id);
    }
};
