
window.CruiseMissile = {
    launchMissile: function (scene, carrierRoot, targetNode, onImpact) {
        console.log("CRUISE MISSILE INBOUND!");

        // 1. Create Missile Mesh (Detailed Voxel/Low-Poly Style)
        const missile = new BABYLON.TransformNode("missile", scene);
        missile.position = carrierRoot.position.clone();
        missile.position.y += 10;

        const bodyMat = new BABYLON.StandardMaterial("missileBodyMat", scene);
        bodyMat.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);

        const accentMat = new BABYLON.StandardMaterial("missileAccentMat", scene);
        accentMat.diffuseColor = new BABYLON.Color3(0.8, 0.1, 0.1); // Red accent

        const engineMat = new BABYLON.StandardMaterial("engineMat", scene);
        engineMat.emissiveColor = new BABYLON.Color3(1, 0.5, 0);

        // Main Body
        const body = BABYLON.MeshBuilder.CreateCylinder("m_body", { diameter: 1.2, height: 6 }, scene);
        body.rotation.x = Math.PI / 2;
        body.parent = missile;
        body.material = bodyMat;

        // Nose Cone
        const nose = BABYLON.MeshBuilder.CreateCylinder("m_nose", { diameterTop: 0, diameterBottom: 1.2, height: 2 }, scene);
        nose.rotation.x = Math.PI / 2;
        nose.position.z = 4;
        nose.parent = missile;
        nose.material = accentMat;

        // Fins
        for (let i = 0; i < 4; i++) {
            const fin = BABYLON.MeshBuilder.CreateBox("m_fin" + i, { width: 0.1, height: 2, depth: 1.5 }, scene);
            fin.rotation.z = (Math.PI / 2) * i;
            fin.position.z = -2;
            fin.position.x = Math.cos(fin.rotation.z) * 0.8;
            fin.position.y = Math.sin(fin.rotation.z) * 0.8;
            fin.parent = missile;
            fin.material = accentMat;
        }

        // Exhaust
        const exhaust = BABYLON.MeshBuilder.CreateCylinder("m_exhaust", { diameterTop: 0.8, diameterBottom: 1.0, height: 0.5 }, scene);
        exhaust.rotation.x = Math.PI / 2;
        exhaust.position.z = -3.25;
        exhaust.parent = missile;
        exhaust.material = engineMat;

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

        // 3. Orient and Animate towards target
        const targetPos = targetNode.position.clone();
        missile.lookAt(targetPos);

        const dist = BABYLON.Vector3.Distance(missile.position, targetPos);
        const duration = dist / 40; // 40 units per second (faster!)

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
