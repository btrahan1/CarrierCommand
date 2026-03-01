
window.UnitManager = {
    units: {},
    seals: [],

    registerUnit: function (carrierRoot, id, node) {
        if (carrierRoot) {
            node.parent = carrierRoot;
        }
        node.getChildMeshes().forEach(m => {
            m.isPickable = true;
            m.metadata = { unitId: id };
        });

        this.units[id] = {
            node: node,
            startPos: node.position.clone(),
            startRot: node.rotation.clone(),
            state: 'OnDeck',
            targetId: null,
            lastFireTime: 0,
            hp: 25,
            maxHp: 25,
            lastRepairTime: 0
        };
    },

    assignUnitToTarget: function (unitId, enemyId) {
        const unit = this.units[unitId];
        if (!unit) return;

        unit.node.parent = null;
        unit.targetId = enemyId;
        unit.state = 'Attacking';
        console.log(`Unit ${unitId} scrambling for strike on target ${enemyId}`);
    },

    launchUnit: function (carrierRoot, targetId, unitId) {
        const unit = this.units[unitId];
        if (!unit || unit.state !== 'OnDeck') return;

        if (unit.hp < unit.maxHp) {
            console.warn(`Unit ${unitId} is undergoing repairs (${unit.hp}/${unit.maxHp}) and cannot launch.`);
            return;
        }

        unit.state = 'Launching';
        const node = unit.node;

        const worldPos = node.absolutePosition.clone();
        node.parent = null;
        node.position = worldPos;

        const isVessel = unitId.includes('vessel');
        const altitude = isVessel ? 0 : 7;

        let takeoffTarget = node.position.clone();
        if (!isVessel) takeoffTarget.y += altitude;
        takeoffTarget.addInPlace(carrierRoot.forward.scale(10));

        BABYLON.Animation.CreateAndStartAnimation("takeoff", node, "position", 30, 60, node.position, takeoffTarget, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, null, () => {
            if (unit.state === 'Launching') {
                if (targetId !== null) {
                    this.assignUnitToTarget(unitId, targetId);
                } else {
                    unit.state = 'Circling';
                    unit.orbitAngle = Math.atan2(node.position.z - carrierRoot.position.z, node.position.x - carrierRoot.position.x);
                }
            }
        });
    },

    returnUnitToBase: function (id) {
        const unit = this.units[id];
        if (unit && unit.state !== 'OnDeck') {
            unit.state = 'Returning';
            unit.targetId = null;
        }
    },

    updateUnits: function (scene, carrierRoot, radarEnemies, selectedEnemyId, onEnemyDestroyed) {
        const now = Date.now();
        Object.keys(this.units).forEach(id => {
            const unit = this.units[id];
            const node = unit.node;

            if (unit.state === 'OnDeck') {
                // Auto-Repair Logic: 1 HP per 3 seconds (3000ms)
                if (unit.hp < unit.maxHp) {
                    if (now - unit.lastRepairTime > 3000) {
                        unit.hp = Math.min(unit.maxHp, unit.hp + 1);
                        unit.lastRepairTime = now;
                        console.log(`Unit ${id} repaired: ${unit.hp}/${unit.maxHp}`);
                    }
                }
                return; // Skip further updates for units on deck
            }

            const isVessel = id.includes('vessel');
            const time = now * 0.001;
            // Boosted base height to 0.5 for high-swell clearance
            const bobbing = isVessel ? Math.sin(time * 0.7 + (id.charCodeAt(0) * 0.1)) * 0.15 + 0.5 : 0;

            if (unit.state === 'Circling') {
                const radius = isVessel ? 45 : 25;
                const speed = isVessel ? 0.005 : 0.01;
                unit.orbitAngle = (unit.orbitAngle || 0) + speed;

                const targetPos = carrierRoot.position;
                node.position.x = targetPos.x + Math.cos(unit.orbitAngle) * radius;
                node.position.z = targetPos.z + Math.sin(unit.orbitAngle) * radius;
                node.position.y = isVessel ? bobbing : 10;
                node.rotation.y = -unit.orbitAngle;
                if (isVessel) node.rotation.x = Math.sin(time * 0.5) * 0.05; // Vessel pitch
            }
            else if (unit.state === 'Attacking' && unit.targetId !== null) {
                const enemy = radarEnemies.find(e => e.id === unit.targetId);

                // Simplified Death/Missing Check
                if (!enemy || enemy.hp <= 0 || enemy.isDead) {
                    unit.targetId = null;
                    if (SectorManager.currentPhase === 'Naval') {
                        unit.state = 'Returning';
                    } else if (SectorManager.currentPhase === 'Assault') {
                        unit.state = 'Assault'; // Let auto-targeting pick a new one
                    }
                    return;
                }

                const radius = isVessel ? 40 : 20;
                const speed = isVessel ? 0.008 : 0.02;
                unit.orbitAngle = (unit.orbitAngle || 0) + speed;

                const targetPos = enemy.node.absolutePosition || enemy.node.position;
                node.position.x = targetPos.x + Math.cos(unit.orbitAngle) * radius;
                node.position.z = targetPos.z + Math.sin(unit.orbitAngle) * radius;
                node.position.y = isVessel ? bobbing : 12;
                node.rotation.y = -unit.orbitAngle;
                if (isVessel) node.rotation.x = Math.sin(time * 0.6) * 0.05;

                if (now - unit.lastFireTime > 2000) {
                    unit.lastFireTime = now;
                    enemy.hp -= 1;

                    const ray = BABYLON.MeshBuilder.CreateLines("tracer", {
                        points: [node.position.clone(), targetPos.clone()],
                        instance: null
                    }, scene);
                    ray.color = new BABYLON.Color3(1, 0.8, 0.2);
                    setTimeout(() => ray.dispose(), 80);

                    if (enemy.hp <= 0 && !enemy.isDead) {
                        enemy.isDead = true;
                        this.crumble(scene, enemy);

                        // Splice mobile enemies immediately to clear radar and trigger phase buttons
                        if (enemy.type === 'vessel' || enemy.type === 'troop' || enemy.type === 'ship') {
                            const idx = radarEnemies.indexOf(enemy);
                            if (idx > -1) radarEnemies.splice(idx, 1);
                        }

                        if (selectedEnemyId === enemy.id) onEnemyDestroyed(null);
                    } else {
                        const hpPct = enemy.hp / enemy.maxHp;
                        enemy.healthBar.scaling.x = hpPct;
                        enemy.healthBar.material.emissiveColor = new BABYLON.Color3(1 - hpPct, hpPct, 0);
                    }
                }
            }
            else if (unit.state === 'Returning') {
                const targetPos = BABYLON.Vector3.TransformCoordinates(unit.startPos, carrierRoot.getWorldMatrix());
                const dir = targetPos.subtract(node.position);
                const dist = dir.length();

                // If close, use a stronger capture factor to handle carrier movement
                const lerpFactor = dist < 5.0 ? 0.15 : 0.05;

                if (dist > 1.2) {
                    node.position.addInPlace(dir.scale(lerpFactor));
                    if (isVessel) node.position.y = bobbing;
                    const targetRot = Math.atan2(dir.x, dir.z);
                    node.rotation.y = targetRot;
                } else {
                    node.parent = carrierRoot;
                    node.position = unit.startPos.clone();
                    node.rotation = unit.startRot.clone();
                    unit.state = 'OnDeck';
                    unit.targetId = null;
                }
            }
            else if (unit.state === 'Assault') {
                // Determine true island position from radar data
                const base = radarEnemies.find(e => e.id === 'base_center');
                const islandPos = base ? (base.node.absolutePosition || base.node.position) : new BABYLON.Vector3(0, 0, 0);
                const distToIsland = BABYLON.Vector3.Distance(node.position, islandPos);

                if (isVessel) {
                    if (distToIsland > 65) { // Slightly further out for larger island
                        const dir = islandPos.subtract(node.position);
                        dir.y = 0;
                        node.position.addInPlace(dir.normalize().scale(0.1)); // Slightly faster boat
                        node.rotation.y = Math.atan2(dir.x, dir.z);
                        node.position.y = bobbing;
                    } else if (!unit.hasDisembarked) {
                        this.spawnSeals(scene, node.position.clone(), 10);
                        unit.hasDisembarked = true;
                        console.log(`Unit ${id} disembarked Navy Seals.`);
                        unit.state = 'Circling';
                    }
                } else {
                    // Air Power: Priority target Towers -> Buildings -> Troops
                    const targets = radarEnemies.filter(e => (e.type === 'tower' || e.type === 'building' || e.type === 'troop') && !e.isDead);
                    if (targets.length > 0) {
                        // Sort by priority (Towers first)
                        targets.sort((a, b) => {
                            const p = { 'tower': 0, 'building': 1, 'troop': 2 };
                            return p[a.type] - p[b.type];
                        });
                        this.assignUnitToTarget(id, targets[0].id);
                    } else {
                        unit.state = 'Circling';
                    }
                }
            }
        });

        // Update Navy Seals
        this.seals.forEach((s, idx) => {
            if (s.hp <= 0) return;

            // Target nearest enemy troop or building
            let target = null;
            let minDist = 1000;
            radarEnemies.forEach(e => {
                if (e.hp <= 0 || e.isDead) return;
                const d = BABYLON.Vector3.Distance(s.node.position, e.node.position);
                if (d < minDist) {
                    minDist = d;
                    target = e;
                }
            });

            if (target) {
                const targetPos = target.node.absolutePosition || target.node.position;
                const dir = targetPos.subtract(s.node.position);
                dir.y = 0;
                if (dir.length() > 5) {
                    s.node.position.addInPlace(dir.normalize().scale(0.05));
                }

                // Fire
                if (now - s.lastFireTime > 1000) {
                    s.lastFireTime = now;
                    target.hp -= 0.5; // Small damage

                    if (target.hp <= 0 && !target.isDead) {
                        target.isDead = true;
                        this.crumble(scene, target);

                        // Splice mobile enemies but keep stationary for status pane
                        if (target.type === 'vessel' || target.type === 'ship' || target.type === 'troop') {
                            const idx = radarEnemies.indexOf(target);
                            if (idx > -1) radarEnemies.splice(idx, 1);
                        }
                    }

                    const ray = BABYLON.MeshBuilder.CreateLines("seal_tracer", {
                        points: [s.node.position.clone(), target.node.position.clone()],
                        instance: null
                    }, scene);
                    ray.color = new BABYLON.Color3(0, 1, 1);
                    setTimeout(() => ray.dispose(), 50);
                }
            }
        });
    },

    spawnSeals: function (scene, pos, count) {
        for (let i = 0; i < count; i++) {
            const group = new BABYLON.TransformNode("seal_group", scene);
            const offset = new BABYLON.Vector3(Math.random() * 8 - 4, 1, Math.random() * 8 - 4);
            group.position = pos.add(offset);

            // Voxel Seal (Head + Body)
            const body = BABYLON.MeshBuilder.CreateBox("seal_body", { width: 0.6, height: 1.0, depth: 0.3 }, scene);
            body.position.y = 0.5;
            body.parent = group;

            const head = BABYLON.MeshBuilder.CreateBox("seal_head", { size: 0.4 }, scene);
            head.position.y = 1.2;
            head.parent = group;

            const mat = new BABYLON.StandardMaterial("sealMat", scene);
            mat.diffuseColor = new BABYLON.Color3(0.1, 0.4, 0.9); // Brighter blue for visibility
            mat.specularColor = new BABYLON.Color3(0, 0, 0);
            body.material = mat;
            head.material = mat;

            this.seals.push({
                node: group,
                hp: 15, // Buffed Seals
                lastFireTime: 0
            });
        }
    },

    clearSeals: function () {
        this.seals.forEach(s => {
            if (s.node && !s.node.isDisposed()) {
                s.node.dispose();
            }
        });
        this.seals = [];
    },

    crumble: function (scene, enemy) {
        const node = enemy.node;
        if (!node) return;

        // Safety: Unparent target reticle if it's currently on this node
        if (window.RadarSystem && window.RadarSystem.targetReticle && window.RadarSystem.targetReticle.parent === node) {
            window.RadarSystem.targetReticle.parent = null;
            window.RadarSystem.targetReticle.setEnabled(false);
        }

        // Hide health bar immediately
        if (enemy.healthBar) enemy.healthBar.setEnabled(false);

        // Spawn a dense debris burst to mask the disappearance
        const pos = (node.absolutePosition || node.position).clone();
        for (let i = 0; i < 20; i++) {
            const p = BABYLON.MeshBuilder.CreateBox("debris", { size: 0.2 + Math.random() * 0.8 }, scene);
            p.position = pos.clone();
            p.position.y += Math.random() * 2;

            const mat = new BABYLON.StandardMaterial("debrisMat", scene);
            mat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Dark grey/metal
            p.material = mat;

            scene.onBeforeRenderObservable.addOnce(() => {
                const velocity = new BABYLON.Vector3(Math.random() - 0.5, 0.5 + Math.random(), Math.random() - 0.5).scale(0.3);
                const gravity = new BABYLON.Vector3(0, -0.015, 0);
                const observer = scene.onBeforeRenderObservable.add(() => {
                    p.position.addInPlace(velocity);
                    velocity.addInPlace(gravity);
                });
                setTimeout(() => {
                    scene.onBeforeRenderObservable.remove(observer);
                    if (!p.isDisposed()) p.dispose();
                }, 3000);
            });
        }

        // Kill the mesh immediately to prevent visual "stretching" or "spotlight" glitches
        node.dispose();
    }
};
