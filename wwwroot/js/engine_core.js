
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

        // Lighting
        sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-1, -2, -1), scene);
        sun.position = new BABYLON.Vector3(50, 100, 50);
        sun.intensity = 1.2;

        const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
        hemi.intensity = 0.5;

        shadowGenerator = new BABYLON.ShadowGenerator(2048, sun);
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.blurKernel = 32;

        // Ocean
        const ocean = BABYLON.MeshBuilder.CreateGround("ocean", { width: 1000, height: 1000 }, scene);
        const oceanMat = new BABYLON.StandardMaterial("oceanMat", scene);
        oceanMat.diffuseColor = new BABYLON.Color3(0.0, 0.2, 0.4);
        oceanMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        ocean.material = oceanMat;
        ocean.receiveShadows = true;

        engine.runRenderLoop(() => {
            if (scene) {
                if (onUpdate) onUpdate();
                scene.render();
            }
        });

        window.addEventListener("resize", () => engine.resize());
        return { engine, scene, camera, sun, shadowGenerator };
    }
};
