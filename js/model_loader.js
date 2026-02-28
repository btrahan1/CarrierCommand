
window.ModelLoader = {
    loadModel: async function (scene, shadowGenerator, url, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
        const response = await fetch(url);
        const data = await response.json();
        return this.spawnModel(scene, shadowGenerator, data, position, rotation, scale);
    },

    spawnModel: function (scene, shadowGenerator, data, rootPos = [0, 0, 0], rootRot = [0, 0, 0], rootScale = [1, 1, 1]) {
        const modelRoot = new BABYLON.TransformNode("model_" + data.Name + "_" + Date.now(), scene);
        modelRoot.position = new BABYLON.Vector3(rootPos[0], rootPos[1], rootPos[2]);
        modelRoot.rotation = new BABYLON.Vector3(BABYLON.Tools.ToRadians(rootRot[0]), BABYLON.Tools.ToRadians(rootRot[1]), BABYLON.Tools.ToRadians(rootRot[2]));
        modelRoot.scaling = new BABYLON.Vector3(rootScale[0], rootScale[1], rootScale[2]);

        const instanceRegistry = {};

        const parseVec3 = (data, defaultVal = { x: 0, y: 0, z: 0 }) => {
            if (!data) return new BABYLON.Vector3(defaultVal.x, defaultVal.y, defaultVal.z);
            if (Array.isArray(data)) return new BABYLON.Vector3(data[0], data[1], data[2]);
            return new BABYLON.Vector3(data.x || defaultVal.x, data.y || defaultVal.y, data.z || defaultVal.z);
        };

        const createMaterial = (id, config) => {
            const mat = new BABYLON.PBRMaterial("mat_" + id + "_" + Date.now(), scene);
            let color = config.ColorHex ? BABYLON.Color3.FromHexString(config.ColorHex) : new BABYLON.Color3(0.5, 0.5, 0.5);
            mat.albedoColor = color;

            const type = (config.Material || "Metal").toLowerCase();
            if (type.includes("metal")) {
                mat.metallic = 1.0;
                mat.roughness = 0.3;
            } else if (type.includes("glass")) {
                mat.metallic = 0.1;
                mat.roughness = 0.1;
                mat.alpha = 0.4;
                mat.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
            } else if (type.includes("glow")) {
                mat.emissiveColor = color;
                mat.emissiveIntensity = 2.0;
            }
            return mat;
        };

        data.Parts.forEach(p => {
            let mesh;
            const shape = (p.Shape || "Box").toLowerCase();
            const scale = parseVec3(p.Scale, { x: 1, y: 1, z: 1 });

            switch (shape) {
                case "sphere": mesh = BABYLON.MeshBuilder.CreateSphere(p.Id, { diameter: 1 }, scene); break;
                case "cylinder": mesh = BABYLON.MeshBuilder.CreateCylinder(p.Id, { diameter: 1, height: 1 }, scene); break;
                case "cone": mesh = BABYLON.MeshBuilder.CreateCylinder(p.Id, { diameterTop: 0, diameterBottom: 1, height: 1 }, scene); break;
                default: mesh = BABYLON.MeshBuilder.CreateBox(p.Id, { size: 1 }, scene);
            }

            mesh.scaling = scale;
            mesh.position = parseVec3(p.Position);
            const rot = parseVec3(p.Rotation);
            mesh.rotation = new BABYLON.Vector3(BABYLON.Tools.ToRadians(rot.x), BABYLON.Tools.ToRadians(rot.y), BABYLON.Tools.ToRadians(rot.z));

            mesh.material = createMaterial(p.Id, p);
            mesh.parent = modelRoot;
            instanceRegistry[p.Id] = mesh;
            if (shadowGenerator) shadowGenerator.addShadowCaster(mesh);
        });

        data.Parts.forEach(p => {
            if (p.ParentId && instanceRegistry[p.ParentId]) {
                instanceRegistry[p.Id].parent = instanceRegistry[p.ParentId];
            }
        });

        if (data.Timeline) {
            data.Timeline.forEach(event => {
                const target = instanceRegistry[event.TargetId];
                if (!target) return;

                const frameRate = 30;
                const duration = (event.Duration || 1) * frameRate;

                if (event.Action === "Rotate") {
                    const rot = parseVec3(event.Value);
                    const endRot = new BABYLON.Vector3(BABYLON.Tools.ToRadians(rot.x), BABYLON.Tools.ToRadians(rot.y), BABYLON.Tools.ToRadians(rot.z));

                    const anim = new BABYLON.Animation("anim_" + event.TargetId, "rotation", frameRate, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
                    const keys = [
                        { frame: 0, value: target.rotation.clone() },
                        { frame: duration, value: endRot }
                    ];
                    anim.setKeys(keys);
                    target.animations.push(anim);
                    scene.beginAnimation(target, 0, duration, true);
                } else if (event.Action === "Move") {
                    const pos = parseVec3(event.Value);
                    const anim = new BABYLON.Animation("anim_pos_" + event.TargetId, "position", frameRate, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_RELATIVE);
                    const keys = [
                        { frame: 0, value: target.position.clone() },
                        { frame: duration, value: pos }
                    ];
                    anim.setKeys(keys);
                    target.animations.push(anim);
                    scene.beginAnimation(target, 0, duration, true);
                }
            });
        }

        return modelRoot;
    }
};
