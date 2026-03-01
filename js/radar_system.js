
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

        this.scene = scene;
        this.loadModel = loadModel;

        targetReticle = BABYLON.MeshBuilder.CreateTorus("reticle", { thickness: 0.1, diameter: 4 }, scene);
        targetReticle.material = new BABYLON.StandardMaterial("reticleMat", scene);
        targetReticle.material.emissiveColor = new BABYLON.Color3(1, 0, 0);
        targetReticle.setEnabled(false);
    },

    getSelectedEnemyId: function () {
        return selectedEnemyId;
    },

    clearEnemies: function () {
        if (targetReticle) {
            targetReticle.parent = null;
            targetReticle.setEnabled(false);
        }
        this.radarEnemies.forEach(e => {
            if (e.node) e.node.dispose();
        });
        this.radarEnemies = [];
        selectedEnemyId = null;
    },

    spawnEnemy: async function (scene, count) {
        this.clearEnemies();
        const newEnemies = [];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 300 + Math.random() * 200;
            const posX = Math.cos(angle) * dist;
            const posZ = Math.sin(angle) * dist;
            const pos = new BABYLON.Vector3(posX, 0, posZ);

            const enemyNode = this._createVoxelShip(scene, `enemy_${i}`, pos);
            const id = 'enemy_' + i;

            this._setupEnemyUI(enemyNode, id, 25);

            newEnemies.push({
                x: posX,
                z: posZ,
                node: enemyNode,
                hp: 25,
                maxHp: 25,
                healthBar: enemyNode.getChildMeshes().find(m => m.name === "hb"),
                lastSeen: 0,
                lastFireTime: 0,
                id: id,
                type: 'vessel',
                isStationary: false
            });
        }
        this.radarEnemies = newEnemies;
    },

    _createVoxelShip: function (scene, id, pos) {
        const group = new BABYLON.TransformNode(id + "_group", scene);
        group.position = pos;
        group.rotation.y = Math.random() * Math.PI * 2;

        const mainMat = new BABYLON.StandardMaterial(id + "_mat", scene);
        mainMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.55); // Battleship Grey
        mainMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        const accentMat = new BABYLON.StandardMaterial(id + "_accent", scene);
        accentMat.diffuseColor = new BABYLON.Color3(0.7, 0.1, 0.1); // Enemy Red
        accentMat.emissiveColor = new BABYLON.Color3(0.2, 0, 0);

        // Lower Hull (Waterline)
        const hull = BABYLON.MeshBuilder.CreateBox(id + "_hull", { width: 5, height: 1.2, depth: 12 }, scene);
        hull.position.y = 0.6;
        hull.parent = group;
        hull.material = mainMat;

        // Upper Deck
        const deck = BABYLON.MeshBuilder.CreateBox(id + "_deck", { width: 4.8, height: 0.8, depth: 10 }, scene);
        deck.position.y = 1.6;
        deck.parent = group;
        deck.material = mainMat;

        // Bridge Structure
        const bridge = BABYLON.MeshBuilder.CreateBox(id + "_bridge", { width: 2.5, height: 2.5, depth: 4 }, scene);
        bridge.position.y = 3.2;
        bridge.position.z = -1;
        bridge.parent = group;
        bridge.material = mainMat;

        // Command Windows (Accent)
        const windows = BABYLON.MeshBuilder.CreateBox(id + "_windows", { width: 2.6, height: 0.5, depth: 1 }, scene);
        windows.position.y = 4;
        windows.position.z = 0.5;
        windows.parent = group;
        windows.material = accentMat;

        // Voxel Turrets (Fore & Aft)
        [3, -5].forEach((z, i) => {
            const turretBase = BABYLON.MeshBuilder.CreateBox(id + "_tbase_" + i, { width: 2, height: 0.8, depth: 2 }, scene);
            turretBase.position.y = 2.4;
            turretBase.position.z = z;
            turretBase.parent = group;
            turretBase.material = mainMat;

            const barrel = BABYLON.MeshBuilder.CreateBox(id + "_barrel_" + i, { width: 0.4, height: 0.4, depth: 2.5 }, scene);
            barrel.position.y = 2.6;
            barrel.position.z = z + 1.2;
            barrel.parent = group;
            barrel.material = mainMat;
        });

        // Mast
        const mast = BABYLON.MeshBuilder.CreateBox(id + "_mast", { width: 0.3, height: 6, depth: 0.3 }, scene);
        mast.position.y = 4;
        mast.position.z = -2;
        mast.parent = group;
        mast.material = mainMat;

        return group;
    },

    spawnIslandBase: async function (pos) {
        this.clearEnemies();
        const basePos = pos || new BABYLON.Vector3(0, -0.5, 0);

        await BaseManager.spawnBase(this.scene, basePos, (node, id, hp, type, isStationary, isGround) => {
            if (node.material) {
                node.material = node.material.clone(id + "_mat");
                node.material.albedoColor = new BABYLON.Color3(0.8, 0.1, 0.1);
            }

            this._setupEnemyUI(node, id, hp);

            this.radarEnemies.push({
                x: node.position.x,
                z: node.position.z,
                node: node,
                hp: hp,
                maxHp: hp,
                healthBar: node.getChildMeshes()[0],
                lastSeen: 0,
                lastFireTime: 0,
                id: id,
                type: type,
                isStationary: isStationary,
                isGround: isGround || false
            });
        });
    },

    _setupEnemyUI: function (node, id, hp) {
        node.getChildMeshes().concat([node]).forEach(m => {
            m.isPickable = true;
            m.metadata = { enemyId: id };
        });

        // Dynamic Height Calculation
        const bounds = node.getHierarchyBoundingVectors();
        const height = (bounds.max.y - bounds.min.y);

        const hb = BABYLON.MeshBuilder.CreatePlane("hb", { width: 4, height: 0.5 }, this.scene);
        hb.parent = node;
        hb.position = new BABYLON.Vector3(0, height + 1, 0); // Position 1 unit above top
        hb.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const hbMat = new BABYLON.StandardMaterial("hbMat", this.scene);
        hbMat.emissiveColor = new BABYLON.Color3(0.1, 0.8, 0.1);
        hb.material = hbMat;
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

    updateEnemyCombat: function (scene, carrierRoot, escortRoot, units) {
        const now = Date.now();
        const fireRange = 150;
        const fireRate = 5000; // Slower fire rate (5s) for better balancing

        // Collect all potential friendly targets
        const friendlies = [];
        if (carrierRoot && window.CarrierCommand.carrierHp > 0) {
            friendlies.push({ node: carrierRoot, type: 'carrier' });
        }
        if (escortRoot) {
            friendlies.push({ node: escortRoot, type: 'escort' }); // Assuming escorts share carrier health or are invincible for now
        }
        Object.keys(units).forEach(id => {
            const u = units[id];
            if (u.state !== 'OnDeck' && u.hp > 0) {
                friendlies.push({ node: u.node, type: 'unit', id: id, data: u });
            }
        });

        if (window.UnitManager.seals) {
            window.UnitManager.seals.forEach((s, idx) => {
                if (s.hp > 0) friendlies.push({ node: s.node, type: 'seal', id: 'seal_' + idx, data: s });
            });
        }

        this.radarEnemies.forEach(e => {
            if (!e.node || !e.node.isEnabled() || e.hp <= 0) return;

            let closestTarget = null;
            let minDist = fireRange;

            friendlies.forEach(f => {
                const dist = BABYLON.Vector3.Distance(e.node.position, f.node.absolutePosition || f.node.position);
                if (dist < minDist) {
                    minDist = dist;
                    closestTarget = f;
                }
            });

            if (closestTarget && now - e.lastFireTime > fireRate) {
                e.lastFireTime = now;
                this._enemyFire(scene, e, closestTarget);
            }
        });
    },

    _enemyFire: function (scene, enemy, target) {
        const origin = enemy.node.position.clone();
        origin.y += 5; // Fire from top of enemy
        const targetPos = (target.node.absolutePosition || target.node.position).clone();

        const ray = BABYLON.MeshBuilder.CreateLines("enemy_tracer", {
            points: [origin, targetPos],
            instance: null
        }, scene);
        ray.color = new BABYLON.Color3(1, 0.5, 0); // Orange tracers for enemies
        setTimeout(() => ray.dispose(), 100);

        // Apply Damage
        if (target.type === 'unit') {
            target.data.hp -= 0.5; // Reduced damage
            console.log(`Unit ${target.id} hit! HP: ${target.data.hp}`);
            if (target.data.hp <= 0) {
                console.warn(`Unit ${target.id} destroyed!`);
            }
        } else if (target.type === 'carrier') {
            window.CarrierCommand.carrierHp -= 0.5; // Reduced damage
            console.log(`Carrier hit! HP: ${window.CarrierCommand.carrierHp}`);
        } else if (target.type === 'seal') {
            target.data.hp -= 0.5; // Reduced damage
            console.log(`Navy Seal hit! HP: ${target.data.hp}`);
        }
    },

    updateVisibility: function (carrierRoot) {
        const time = Date.now() * 0.001;
        this.radarEnemies.forEach((e, idx) => {
            if (!e.node) return;

            // 1. Visibility Check
            const dist = BABYLON.Vector3.Distance(carrierRoot.position, e.node.position);
            e.node.setEnabled(dist < this.radarRange);
            if (dist > 1000) e.node.setEnabled(false);

            // 2. Buoyancy & Bobbing (Apply to enabled nodes)
            if (e.node.isEnabled() && !e.isStationary) {
                const seed = idx * 0.5;
                if (e.isGround) {
                    // Slight jitter for troops or nothing
                } else {
                    e.node.position.y = Math.sin(time * 0.7 + seed) * 0.15 + 0.5;
                    e.node.rotation.x = Math.sin(time * 0.5 + seed) * 0.03; // Slight pitch
                    e.node.rotation.z = Math.cos(time * 0.4 + seed) * 0.02; // Slight roll
                }
            }
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

        const activeThreatCount = this.radarEnemies.filter(e => e.hp > 0 && !e.isDead).length;

        return {
            sweepAngle: this.radarSweepAngle,
            heading: carrierRoot.rotation.y,
            selectedId: selectedEnemyId,
            isWarping: window.SectorManager ? window.SectorManager.isWarping : false,
            activeThreatCount: activeThreatCount,
            enemies: this.radarEnemies.filter(e => e.lastSeen > 0 || e.type === 'building' || e.type === 'tower').map(e => {
                const relX = (e.x - cp.x) / this.radarRange;
                const relZ = -(e.z - cp.z) / this.radarRange;
                const dist = Math.sqrt(relX * relX + relZ * relZ);
                const isOffRadar = dist > 1.0;

                // Clamp to edge for off-radar indicators
                let dispX = relX;
                let dispZ = relZ;
                if (isOffRadar) {
                    dispX /= dist;
                    dispZ /= dist;
                }

                // Buildings and towers are always at full opacity once detected
                const isStationary = (e.type === 'building' || e.type === 'tower');
                const opacity = isOffRadar ? 1.0 : (isStationary ? 1.0 : e.lastSeen);

                return {
                    id: e.id,
                    x: dispX,
                    y: dispZ,
                    opacity: opacity,
                    isSelected: e.id === selectedEnemyId,
                    isOffRadar: isOffRadar,
                    isBuilding: isStationary,
                    hp: e.hp,
                    maxHp: e.maxHp,
                    type: e.type
                };
            })
        };
    }
};
