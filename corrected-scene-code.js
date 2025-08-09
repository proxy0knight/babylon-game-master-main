var createScene = function () {
    var scene = new BABYLON.Scene(engine);

    var light = new BABYLON.PointLight("Omni", new BABYLON.Vector3(0, 100, 100), scene);
    var camera = new BABYLON.ArcRotateCamera("Camera", 0, 0.8, 100, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);

    //Boxes
    var box1 = BABYLON.Mesh.CreateBox("Box1", 10.0, scene);
    box1.position.x = -20;
    var box2 = BABYLON.Mesh.CreateBox("Box2", 10.0, scene);

    var materialBox = new BABYLON.StandardMaterial("texture1", scene);
    materialBox.diffuseColor = new BABYLON.Color3(0, 1, 0);//Green
    var materialBox2 = new BABYLON.StandardMaterial("texture2", scene);

    //Applying materials
    box1.material = materialBox;
    box2.material = materialBox2;

    //Positioning box
    box2.position.x = 20;


    //Create a scaling animation
    var animation1 = new BABYLON.Animation("tutoAnimation", "scaling.z", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    // Animation keys
    var keys = [];
    //At the animation key 0, the value of scaling is "1"
    keys.push({
        frame: 0,
        value: 1
    });

    //At the animation key 20, the value of scaling is "0.2"
    keys.push({
        frame: 20,
        value: 0.2
    });

    //At the animation key 100, the value of scaling is "1"
    keys.push({
        frame: 100,
        value: 1
    });

    //Adding keys to the animation object
    animation1.setKeys(keys);

    //Create a second rotation animation with different timeline
    var animation2 = new BABYLON.Animation("tutoAnimation", "rotation.y", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    // Animation keys
    keys = [];
    keys.push({
        frame: 0,
        value: 0
    });

    keys.push({
        frame: 40,
        value: Math.PI
    });

    keys.push({
        frame: 80,
        value: 0
    });

    //Adding keys to the animation object
    animation2.setKeys(keys);

    // Create the animation group
    var animationGroup = new BABYLON.AnimationGroup("my group");
    animationGroup.addTargetedAnimation(animation1, box1);
    animationGroup.addTargetedAnimation(animation2, box2);

    // Make sure to normalize animations to the same timeline
    animationGroup.normalize(0, 100);

    // UI
    var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    var panel = new BABYLON.GUI.StackPanel();
    panel.isVertical = false;
    panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    advancedTexture.addControl(panel);

    var addButton = function (text, callback) {
        var button = BABYLON.GUI.Button.CreateSimpleButton("button", text);
        button.width = "140px";
        button.height = "40px";
        button.color = "white";
        button.background = "green";
        button.paddingLeft = "10px";
        button.paddingRight = "10px";
        button.onPointerUpObservable.add(function () {
            callback();
        });
        panel.addControl(button);
    }

    addButton("Play", function () {
        animationGroup.play(true);
    });

    addButton("Pause", function () {
        animationGroup.pause();
    });

    // Flow trigger block
    // FLOW_TRIGGER: id=myTrigger1
    // When the runtime sees this block executed (e.g., via a button click),
    // it will trigger the outgoing link defined in the flow graph for 'myTrigger1'.
    if (typeof BABYLON !== 'undefined' && scene) {
        const flowTrigger = (id) => {
            if (window && window.__triggerFlowNode) {
                console.log('Triggering flow:', id);  // Debug log
                window.__triggerFlowNode(id);
            } else {
                console.warn('Flow trigger not available');  // Debug log
            }
        };
        
        // FIXED: Now the Stop button actually calls the flow trigger
        addButton("Stop", function () {
            animationGroup.reset();
            animationGroup.stop();
            flowTrigger('myTrigger1');  // This will trigger the scene change!
        });
    }

    return scene;
}
