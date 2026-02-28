
let selectedEnemyId = null;
let targetReticle = null;

window.RadarSystem = {
    radarEnemies: [],
    radarSweepAngle: 0,
    radarRange: 500,

    init: async function (scene, uiId, handleRadarClick, loadModel) {
        const radarUI = document.getElementById(uiId);
        if (radarUI) {
            radarUI.addEventListener("mousedown", (e) => {
                const rect = radarUI.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                handleRadarClick(x, y, rect.width, rect.height);
            });
        }

        // Generate mock enemies
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 300 + Math.random() * 200;
            const posX = Math.cos(angle) * dist;
            const posZ = Math.sin(angle) * dist;

            const enemy = await loadModel("data/combat_vessel.json", [posX, 0, posZ], [0, Math.random() * 360, 0], [1, 1, 1]);

            enemy.getChildMeshes().forEach(m => {
                m.isPickable = true;
                m.metadata = { enemyId: i };
                if (m.material) {
                    m.material = m.material.clone("enemyMat");
                    m.material.albedoColor = new BABYLON.Color3(0.8, 0.1, 0.1);
                }
            });

            const hb = BABYLON.MeshBuilder.CreatePlane("hb", { width: 4, height: 0.5 }, scene);
            hb.parent = enemy;
            hb.position = new BABYLON.Vector3(0, 8, 0);
            hb.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
            const hbMat = new BABYLON.StandardMaterial("hbMat", scene);
            hbMat.emissiveColor = new BABYLON.Color3(0, 1, 0);
            hb.material = hbMat;

            this.radarEnemies.push({
                x: posX,
                z: posZ,
                node: enemy,
                hp: 25,
                maxHp: 25,
                healthBar: hb,
                lastSeen: 0,
                id: i
            });
        }

        targetReticle = BABYLON.MeshBuilder.CreateTorus("reticle", { thickness: 0.1, diameter: 4 }, scene);
        targetReticle.material = new BABYLON.StandardMaterial("reticleMat", scene);
        targetReticle.material.emissiveColor = new BABYLON.Color3(1, 0, 0);
        targetReticle.setEnabled(false);
    },

    selectEnemy: function (id) {
        selectedEnemyId = id;
        const enemy = this.radarEnemies.find(e => e.id === id);
        if (enemy && targetReticle) {
            targetReticle.parent = enemy.node;
            targetReticle.position = new BABYLON.Vector3(0, 5, 0);
            targetReticle.setEnabled(true);
            console.log("Target locked on enemy:", id);
        } else if (targetReticle) {
            targetReticle.setEnabled(false);
        }
        return selectedEnemyId;
    },

    getSelectedEnemyId: function () { return selectedEnemyId; },

    updateVisibility: function (carrierRoot) {
        this.radarEnemies.forEach(e => {
            const dist = BABYLON.Vector3.Distance(carrierRoot.position, e.node.position);
            e.node.setEnabled(dist < this.radarRange);
            if (dist > 1000) e.node.setEnabled(false);
        });
    },

    getRadarData: function (carrierRoot) {
        if (!carrierRoot) return { sweepAngle: 0, enemies: [], heading: 0 };

        this.radarSweepAngle = (this.radarSweepAngle + 0.05) % (Math.PI * 2);
        const cp = carrierRoot.position;

        this.radarEnemies.forEach(e => {
            const relX = e.x - cp.x;
            const relZ = e.z - cp.z;
            const blipAngle = (Math.atan2(relX, relZ) + Math.PI * 2) % (Math.PI * 2);
            const diff = Math.abs(blipAngle - this.radarSweepAngle);
            if (diff < 0.1) {
                e.lastSeen = 1.0;
            } else {
                e.lastSeen -= 0.01;
            }
        });

        return {
            sweepAngle: this.radarSweepAngle,
            heading: carrierRoot.rotation.y,
            selectedId: selectedEnemyId,
            enemies: this.radarEnemies.filter(e => e.lastSeen > 0).map(e => ({
                id: e.id,
                x: (e.x - cp.x) / this.radarRange,
                y: -(e.z - cp.z) / this.radarRange,
                opacity: e.lastSeen,
                isSelected: e.id === selectedEnemyId
            }))
        };
    }
};
