
window.UnitManager = {
    units: {},

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
            lastFireTime: 0
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

    launchUnit: function (carrierRoot, selectedEnemyId, id) {
        const unit = this.units[id];
        if (!unit || unit.state !== 'OnDeck') return;

        unit.state = 'Launching';
        const node = unit.node;

        const worldPos = node.absolutePosition.clone();
        node.parent = null;
        node.position = worldPos;

        const isVessel = id.includes('vessel');
        const altitude = isVessel ? 0 : 7;

        let takeoffTarget = node.position.clone();
        if (!isVessel) takeoffTarget.y += altitude;
        takeoffTarget.addInPlace(carrierRoot.forward.scale(10));

        BABYLON.Animation.CreateAndStartAnimation("takeoff", node, "position", 30, 60, node.position, takeoffTarget, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, null, () => {
            if (unit.state === 'Launching') {
                if (selectedEnemyId !== null) {
                    this.assignUnitToTarget(id, selectedEnemyId);
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

    updateUnits: function (scene, carrierRoot, radarEnemies, selectedEnemyId, selectEnemyCallback) {
        const now = Date.now();
        Object.keys(this.units).forEach(id => {
            const unit = this.units[id];
            const node = unit.node;
            const isVessel = id.includes('vessel');

            if (unit.state === 'Circling') {
                const radius = isVessel ? 45 : 25;
                const speed = isVessel ? 0.005 : 0.01;
                unit.orbitAngle = (unit.orbitAngle || 0) + speed;

                const targetPos = carrierRoot.position;
                node.position.x = targetPos.x + Math.cos(unit.orbitAngle) * radius;
                node.position.z = targetPos.z + Math.sin(unit.orbitAngle) * radius;
                node.position.y = isVessel ? 0 : 10;
                node.rotation.y = -unit.orbitAngle;
            }
            else if (unit.state === 'Attacking' && unit.targetId !== null) {
                const enemy = radarEnemies.find(e => e.id === unit.targetId);
                if (!enemy) {
                    unit.state = 'Circling';
                    return;
                }

                const radius = isVessel ? 40 : 20;
                const speed = isVessel ? 0.008 : 0.02;
                unit.orbitAngle = (unit.orbitAngle || 0) + speed;

                const targetPos = enemy.node.position;
                node.position.x = targetPos.x + Math.cos(unit.orbitAngle) * radius;
                node.position.z = targetPos.z + Math.sin(unit.orbitAngle) * radius;
                node.position.y = isVessel ? 0 : 12;
                node.rotation.y = -unit.orbitAngle;

                if (now - unit.lastFireTime > 3000) {
                    enemy.hp -= 1;
                    unit.lastFireTime = now;

                    const ray = BABYLON.MeshBuilder.CreateLines("tracer", {
                        points: [node.position.clone(), targetPos.clone()],
                        instance: null
                    }, scene);
                    ray.color = new BABYLON.Color3(1, 0.8, 0.2);
                    setTimeout(() => ray.dispose(), 80);

                    if (enemy.hp <= 0) {
                        enemy.node.dispose();
                        const idx = radarEnemies.indexOf(enemy);
                        if (idx > -1) radarEnemies.splice(idx, 1);
                        if (selectedEnemyId === enemy.id) selectEnemyCallback(null);

                        Object.values(this.units).forEach(u => {
                            if (u.targetId === enemy.id) {
                                u.targetId = null;
                                u.state = 'Circling';
                            }
                        });
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
                if (dist > 0.5) {
                    node.position.addInPlace(dir.scale(0.05));
                    if (isVessel) node.position.y = 0;
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
        });
    }
};
