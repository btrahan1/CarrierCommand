
window.CruiseMissile = {
    launchMissile: function (scene, carrierRoot, targetNode, onImpact) {
        console.log("CRUISE MISSILE INBOUND!");

        // 1. Create Missile Mesh
        const missile = BABYLON.MeshBuilder.CreateCylinder("missile", { diameter: 1, height: 4 }, scene);
        missile.position = carrierRoot.position.clone();
        missile.position.y += 10;
        missile.rotation.x = Math.PI / 2;
        const mat = new BABYLON.StandardMaterial("missileMat", scene);
        mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
        missile.material = mat;

        // 2. Setup Tracking Camera
        const missileCam = new BABYLON.FollowCamera("missileCam", missile.position, scene);
        missileCam.radius = 20;
        missileCam.heightOffset = 5;
        missileCam.rotationOffset = 180;
        missileCam.cameraAcceleration = 0.05;
        missileCam.maxCameraSpeed = 10;
        missileCam.lockedTarget = missile;

        const prevCam = scene.activeCamera;
        scene.activeCamera = missileCam;

        // 3. Animate towards target
        const targetPos = targetNode.position.clone();
        const dist = BABYLON.Vector3.Distance(missile.position, targetPos);
        const duration = dist / 20; // 20 units per second

        BABYLON.Animation.CreateAndStartAnimation("missile_strike", missile, "position", 30, 30 * duration, missile.position, targetPos, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, null, () => {
            // 4. Impact!
            this.createExplosion(scene, targetPos);
            missile.dispose();

            // Actually destroy the target in the game logic
            if (targetNode) {
                targetNode.dispose();
                if (window.RadarSystem) {
                    window.RadarSystem.clearEnemies(); // Final wipe for victory
                }
            }

            // Shake camera
            this.shakeCamera(missileCam);

            setTimeout(() => {
                scene.activeCamera = prevCam;
                if (onImpact) onImpact();
            }, 3000);
        });
    },

    createExplosion: function (scene, pos) {
        const explosion = BABYLON.MeshBuilder.CreateSphere("explosion", { diameter: 40 }, scene);
        explosion.position = pos;
        const mat = new BABYLON.StandardMaterial("expMat", scene);
        mat.emissiveColor = new BABYLON.Color3(1, 0.5, 0);
        mat.alpha = 0.8;
        explosion.material = mat;

        // Particle System (Simplified)
        const ps = new BABYLON.ParticleSystem("particles", 2000, scene);
        ps.particleTexture = new BABYLON.Texture("https://www.babylonjs-around-the-world.com/assets/flare.png", scene);
        ps.emitter = pos;
        ps.minSize = 1;
        ps.maxSize = 5;
        ps.minLifeTime = 1;
        ps.maxLifeTime = 2;
        ps.emitRate = 500;
        ps.gravity = new BABYLON.Vector3(0, -9.81, 0);
        ps.direction1 = new BABYLON.Vector3(-1, 2, -1);
        ps.direction2 = new BABYLON.Vector3(1, 4, 1);
        ps.start();

        setTimeout(() => {
            ps.stop();
            BABYLON.Animation.CreateAndStartAnimation("exp_fade", explosion, "scaling", 30, 60, explosion.scaling, new BABYLON.Vector3(0, 0, 0), BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, null, () => {
                explosion.dispose();
            });
        }, 1000);
    },

    shakeCamera: function (camera) {
        const originalPos = camera.position.clone();
        let count = 0;
        const interval = setInterval(() => {
            camera.position.x += Math.random() * 2 - 1;
            camera.position.y += Math.random() * 2 - 1;
            count++;
            if (count > 20) {
                clearInterval(interval);
            }
        }, 50);
    }
};
