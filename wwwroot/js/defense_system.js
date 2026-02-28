
window.DefenseSystem = {
    turrets: [],
    defenseRange: 150,
    fireRate: 2000, // 2 seconds

    registerTurret: function (node) {
        let pivot = null;

        // Find the pivot node for vertical aim using recursive search
        node.getDescendants().forEach(desc => {
            if (desc.name.includes("barrel_pivot")) {
                pivot = desc;
            }
        });

        this.turrets.push({
            node: node,
            pivot: pivot,
            lastFireTime: 0
        });
    },

    update: function (scene, carrierRoot, radarEnemies) {
        const now = Date.now();

        this.turrets.forEach(t => {
            let closestEnemy = null;
            let minDist = this.defenseRange;

            radarEnemies.forEach(e => {
                const dist = BABYLON.Vector3.Distance(t.node.absolutePosition, e.node.position);
                if (dist < minDist) {
                    minDist = dist;
                    closestEnemy = e;
                }
            });

            if (closestEnemy) {
                const targetPos = closestEnemy.node.position;
                const localTargetPos = BABYLON.Vector3.TransformCoordinates(targetPos, BABYLON.Matrix.Invert(t.node.getWorldMatrix()));

                // Yaw (Base rotation)
                const yaw = Math.atan2(localTargetPos.x, localTargetPos.z);
                t.node.rotation.y += yaw * 0.1;

                // Pitch (Pivot rotation)
                if (t.pivot) {
                    const dist2D = Math.sqrt(localTargetPos.x * localTargetPos.x + localTargetPos.z * localTargetPos.z);
                    const pitch = -Math.atan2(localTargetPos.y, dist2D);
                    t.pivot.rotation.x = BABYLON.Scalar.Lerp(t.pivot.rotation.x, pitch, 0.1);
                }

                // Fire
                if (now - t.lastFireTime > this.fireRate) {
                    t.lastFireTime = now;
                    this.fire(scene, t, targetPos, closestEnemy);
                }
            } else {
                // Reset to forward
                t.node.rotation.y = BABYLON.Scalar.Lerp(t.node.rotation.y, 0, 0.05);
                if (t.pivot) t.pivot.rotation.x = BABYLON.Scalar.Lerp(t.pivot.rotation.x, 0, 0.05);
            }
        });
    },

    fire: function (scene, turret, targetPos, enemy) {
        const origin = turret.pivot ? turret.pivot.absolutePosition : turret.node.absolutePosition;

        const ray = BABYLON.MeshBuilder.CreateLines("defense_tracer", {
            points: [origin.clone(), targetPos.clone()],
            instance: null
        }, scene);
        ray.color = new BABYLON.Color3(1, 0.2, 0.1);
        setTimeout(() => ray.dispose(), 100);

        // Deal damage
        enemy.hp -= 2; // Heavy guns deal more damage
        if (enemy.hp <= 0) {
            // Destruction logic is handled in UnitManager.updateUnits for now, 
            // but we should probably centralize it or ensure it's checked here too.
            // For now, it will be caught in the next unit update loop.
        } else {
            const hpPct = enemy.hp / enemy.maxHp;
            enemy.healthBar.scaling.x = hpPct;
            enemy.healthBar.material.emissiveColor = new BABYLON.Color3(1 - hpPct, hpPct, 0);
        }
    }
};
