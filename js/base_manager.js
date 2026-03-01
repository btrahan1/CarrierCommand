
window.BaseManager = {
    spawnBase: async function (scene, pos, onEnemyAdded) {
        console.log(`BaseManager: Generating Strategic Outpost at ${pos.x}, ${pos.z}...`);

        // 1. Create Island Mesh (A bit more jagged/natural)
        const island = BABYLON.MeshBuilder.CreateCylinder("island", {
            diameter: 120,
            height: 3,
            tessellation: 32,
            subdivisions: 4
        }, scene);

        island.position = pos.clone();
        island.position.y = -1.0;

        const islandMat = new BABYLON.StandardMaterial("islandMat", scene);
        islandMat.diffuseColor = new BABYLON.Color3(0.25, 0.45, 0.25);
        islandMat.specularColor = new BABYLON.Color3(0, 0, 0);
        island.material = islandMat;
        island.isPickable = false;

        // Add to water reflections
        if (window.CarrierCommand && window.CarrierCommand._addToWater) {
            window.CarrierCommand._addToWater(island);
        }

        // 2. Main Command Center (More detailed)
        const cc = this._createCommandCenter(scene, pos.clone().add(new BABYLON.Vector3(0, 5, 0)), onEnemyAdded);

        // 3. Defensive Towers (Perimeter)
        const towerPositions = [
            new BABYLON.Vector3(35, 0, 35),
            new BABYLON.Vector3(-35, 0, 35),
            new BABYLON.Vector3(35, 0, -35),
            new BABYLON.Vector3(-35, 0, -35)
        ];

        towerPositions.forEach((offset, i) => {
            const towerPos = pos.clone().add(offset);
            this._createTower(scene, `tower_${i}`, towerPos, onEnemyAdded);
        });

        // 4. Secondary Buildings (Visual Flavor)
        this._createHangar(scene, pos.clone().add(new BABYLON.Vector3(-15, 2, -15)));
        this._createHangar(scene, pos.clone().add(new BABYLON.Vector3(15, 2, -15)));
        this._createFuelTanks(scene, pos.clone().add(new BABYLON.Vector3(0, 2, 25)));

        // 5. Enemy Troops
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 15 + Math.random() * 30;
            const gx = pos.x + Math.cos(angle) * dist;
            const gz = pos.z + Math.sin(angle) * dist;
            this._createTroop(scene, `troop_${i}`, new BABYLON.Vector3(gx, 1, gz), onEnemyAdded);
        }

        return island;
    },

    _createCommandCenter: function (scene, pos, onEnemyAdded) {
        const group = new BABYLON.TransformNode("cc_group", scene);
        group.position = pos;

        const base = BABYLON.MeshBuilder.CreateBox("cc_base", { width: 12, height: 8, depth: 12 }, scene);
        base.parent = group;
        base.material = this._getBuildingMat(scene, new BABYLON.Color3(0.4, 0.4, 0.45));

        const roof = BABYLON.MeshBuilder.CreateBox("cc_roof", { width: 14, height: 1, depth: 14 }, scene);
        roof.position.y = 4.5;
        roof.parent = group;
        roof.material = this._getBuildingMat(scene, new BABYLON.Color3(0.3, 0.3, 0.3));

        const dish = BABYLON.MeshBuilder.CreateCylinder("cc_dish", { diameter: 6, height: 0.5 }, scene);
        dish.position.y = 6;
        dish.rotation.x = Math.PI / 4;
        dish.parent = group;
        dish.material = this._getBuildingMat(scene, new BABYLON.Color3(0.7, 0.7, 0.7));

        base.metadata = { enemyId: 'base_center' };
        onEnemyAdded(base, 'base_center', 100, 'building', true);

        return group;
    },

    _createTower: function (scene, id, pos, onEnemyAdded) {
        const group = new BABYLON.TransformNode(id + "_group", scene);
        group.position = pos;
        group.position.y = 5.5; // Offset from island surface

        const body = BABYLON.MeshBuilder.CreateCylinder(id + "_body", { diameter: 4, height: 12 }, scene);
        body.parent = group;
        body.material = this._getBuildingMat(scene, new BABYLON.Color3(0.5, 0.5, 0.55));

        const top = BABYLON.MeshBuilder.CreateBox(id + "_top", { size: 5 }, scene);
        top.position.y = 6;
        top.parent = group;
        top.material = this._getBuildingMat(scene, new BABYLON.Color3(0.2, 0.2, 0.2));

        body.metadata = { enemyId: id };
        onEnemyAdded(body, id, 50, 'tower', true);

        return group;
    },

    _createHangar: function (scene, pos) {
        const hangar = BABYLON.MeshBuilder.CreateBox("hangar", { width: 10, height: 4, depth: 15 }, scene);
        hangar.position = pos;
        hangar.material = this._getBuildingMat(scene, new BABYLON.Color3(0.35, 0.35, 0.4));
        if (window.CarrierCommand?._addToWater) window.CarrierCommand._addToWater(hangar);
    },

    _createFuelTanks: function (scene, pos) {
        for (let i = 0; i < 3; i++) {
            const tank = BABYLON.MeshBuilder.CreateCylinder("tank_" + i, { diameter: 4, height: 6 }, scene);
            tank.position = pos.clone().add(new BABYLON.Vector3((i - 1) * 6, 1, 0));
            tank.material = this._getBuildingMat(scene, new BABYLON.Color3(0.4, 0.1, 0.1));
            if (window.CarrierCommand?._addToWater) window.CarrierCommand._addToWater(tank);
        }
    },

    _createTroop: function (scene, id, pos, onEnemyAdded) {
        const group = new BABYLON.TransformNode(id + "_group", scene);
        group.position = pos;

        // Voxel/Minecraft Style Body (2x2x3 small units)
        const body = BABYLON.MeshBuilder.CreateBox(id + "_body", { width: 0.8, height: 1.2, depth: 0.4 }, scene);
        body.position.y = 0.6;
        body.parent = group;

        const head = BABYLON.MeshBuilder.CreateBox(id + "_head", { size: 0.5 }, scene);
        head.position.y = 1.5;
        head.parent = group;

        const troopMat = new BABYLON.StandardMaterial(id + "_mat", scene);
        troopMat.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.1); // Red/Orange enemy
        troopMat.specularColor = new BABYLON.Color3(0, 0, 0);
        body.material = troopMat;
        head.material = troopMat;

        body.metadata = { enemyId: id };
        onEnemyAdded(body, id, 10, 'troop', false, true);
    },

    _getBuildingMat: function (scene, color) {
        const mat = new BABYLON.StandardMaterial("bldgMat_" + color.toHexString(), scene);
        mat.diffuseColor = color;
        mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        // Add subtle emissive glow
        mat.emissiveColor = color.scale(0.2);
        return mat;
    }
};
