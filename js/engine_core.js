
let engine, scene, camera, sun, shadowGenerator;

window.EngineCore = {
    init: function (canvasId, onUpdate) {
        const canvas = document.getElementById(canvasId);
        engine = new BABYLON.Engine(canvas, true);
        scene = new BABYLON.Scene(engine);

        // Sky and Environment
        scene.clearColor = new BABYLON.Color4(0.1, 0.4, 0.6, 1);

        // Camera
        camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 30, new BABYLON.Vector3(0, 0, 0), scene);
        camera.attachControl(canvas, true);
        camera.lowerRadiusLimit = 5;
        camera.upperRadiusLimit = 200;
        camera.maxZ = 15000;

        // Skybox - Expanded to support approach phase
        const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 10000.0 }, scene);
        const skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.disableLighting = true;
        skyboxMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.3, 0.6); // Deep blue-cyan sky
        skybox.material = skyboxMaterial;
        skybox.infiniteDistance = true;

        // Lighting
        sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-1, -2, -1), scene);
        sun.position = new BABYLON.Vector3(50, 100, 50);
        sun.intensity = 1.2;

        // Stabilize Shadows
        sun.autoUpdateExtends = false;
        sun.shadowOrthoScale = 2.0;
        sun.orthoLeft = -500;
        sun.orthoRight = 500;
        sun.orthoTop = 500;
        sun.orthoBottom = -500;

        const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
        hemi.intensity = 0.6;
        hemi.groundColor = new BABYLON.Color3(0.1, 0.2, 0.5); // Deep blue for water fill

        shadowGenerator = new BABYLON.ShadowGenerator(2048, sun);
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.blurKernel = 32;

        // Ocean with WaterMaterial - Expanded bounds
        const ocean = BABYLON.MeshBuilder.CreateGround("ocean", { width: 10000, height: 10000 }, scene);
        const water = new BABYLON.WaterMaterial("water", scene, new BABYLON.Vector2(512, 512));
        water.bumpTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/waterbump.png", scene); // Standard water bump

        water.windForce = -10;
        water.waveHeight = 0.2; // Lowered for model scale stability
        water.bumpHeight = 0.1;
        water.waveLength = 0.1;
        water.colorBlendFactor = 0.5;
        water.waterColor = new BABYLON.Color3(0.05, 0.2, 0.4);

        water.addToRenderList(skybox);

        ocean.material = water;
        ocean.receiveShadows = true;

        engine.runRenderLoop(() => {
            if (scene) {
                if (onUpdate) onUpdate();
                scene.render();
            }
        });

        window.addEventListener("resize", () => engine.resize());
        return { engine, scene, camera, sun, shadowGenerator, water };
    }
};
