/**
 * المشهد الافتراضي - أرضية بسيطة مع كرة
 * يتم استخدامه كمشهد افتراضي في اللعبة والـ playground
 */

export interface SceneComponents {
    Scene: any;
    FreeCamera?: any;
    ArcRotateCamera?: any;
    HemisphericLight: any;
    Vector3: any;
    Color3: any;
    MeshBuilder: any;
    StandardMaterial?: any;
}

/**
 * إنشاء المشهد الافتراضي
 */
export function createDefaultScene(engine: any, canvas: HTMLCanvasElement, components: SceneComponents): any {
    const { Scene, FreeCamera, ArcRotateCamera, HemisphericLight, Vector3, MeshBuilder } = components;
    
    // إنشاء المشهد الأساسي
    const scene = new Scene(engine);

    // إنشاء الكاميرا الحرة
    let camera;
    if (FreeCamera) {
        camera = new FreeCamera("camera1", new Vector3(0, 5, -10), scene);
        camera.setTarget(Vector3.Zero());
        camera.attachControl(canvas, true);
        
        // تفعيل WASD للتحكم بالكاميرا
        camera.keysUp.push(87); // W
        camera.keysDown.push(83); // S
        camera.keysLeft.push(65); // A
        camera.keysRight.push(68); // D
        
        // تحسين سرعة الحركة والدوران
        camera.speed = 0.5;
        camera.angularSensibility = 2000;
    } else if (ArcRotateCamera) {
        // استخدام ArcRotateCamera كبديل إذا لم تكن FreeCamera متاحة
        camera = new ArcRotateCamera("camera1", -Math.PI / 2, Math.PI / 2.5, 10, Vector3.Zero(), scene);
        camera.attachControls(canvas, true);
    }

    // إنشاء الإضاءة
    const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    // إنشاء الكرة
    const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 2, segments: 32 }, scene);
    sphere.position.y = 1;

    // إنشاء الأرضية
    const ground = MeshBuilder.CreateGround("ground", { width: 6, height: 6 }, scene);

    return scene;
}

/**
 * الحصول على كود المشهد الافتراضي مع دعم WebGPU كنص للـ playground
 */
export function getWebGPUSceneCode(): string {
    return `// مثال WebGPU - أرضية بسيطة مع كرة
// يمكن للكود أن يعمل مع WebGL2 أو WebGPU تلقائياً

async function createEngine() {
    // فحص دعم WebGPU
    const webGPUSupported = await BABYLON.WebGPUEngine.IsSupportedAsync;
    if (webGPUSupported) {
        console.log("Using WebGPU Engine");
        const webgpuEngine = new BABYLON.WebGPUEngine(canvas);
        await webgpuEngine.initAsync();
        return webgpuEngine;
    }
    
    console.log("Using WebGL2 Engine");
    return new BABYLON.Engine(canvas, true);
}

var createScene = async function () {
    // استخدام المحرك المُمرر أو إنشاء محرك جديد
    var sceneEngine = engine;
    
    // إنشاء المشهد
    var scene = new BABYLON.Scene(sceneEngine);
    
    // إنشاء الكاميرا
    var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10), scene);
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.attachControl(canvas, true);
    
    // تفعيل WASD للتحكم بالكاميرا
    camera.keysUp.push(87); // W
    camera.keysDown.push(83); // S
    camera.keysLeft.push(65); // A
    camera.keysRight.push(68); // D
    
    // تحسين سرعة الحركة والدوران
    camera.speed = 0.5;
    camera.angularSensibility = 2000;
    
    // إنشاء الإضاءة
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;
    
    // إنشاء كرة مع مواد متقدمة
    var sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 2, segments: 32}, scene);
    sphere.position.y = 1;
    
    // مادة PBR للكرة
    var sphereMaterial = new BABYLON.PBRMaterial("sphereMaterial", scene);
    sphereMaterial.baseColor = new BABYLON.Color3(0.2, 0.6, 1.0);
    sphereMaterial.metallicFactor = 0.8;
    sphereMaterial.roughnessFactor = 0.2;
    sphere.material = sphereMaterial;
    
    // إنشاء الأرضية
    var ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 6, height: 6}, scene);
    var groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
    ground.material = groundMaterial;
    
    return scene;
};

// إنشاء المشهد
var scene = createScene();`;
}

/**
 * الحصول على كود المشهد الافتراضي كنص للـ playground
 */
export function getDefaultSceneCode(): string {
    return `// المشهد الافتراضي - أرضية بسيطة مع كرة
var createScene = function () {
    // إنشاء المشهد الأساسي (غير شبكي)
    var scene = new BABYLON.Scene(engine);

    // إنشاء وتموضع الكاميرا الحرة (غير شبكية)
    var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10), scene);

    // توجيه الكاميرا نحو مركز المشهد
    camera.setTarget(BABYLON.Vector3.Zero());

    // ربط الكاميرا بالـ canvas مع تفعيل التحكم الكامل
    camera.attachControl(canvas, true);
    
    // تفعيل WASD للتحكم بالكاميرا - إضافة مفاتيح إضافية
    camera.keysUp.push(87);    // W key
    camera.keysDown.push(83);  // S key
    camera.keysLeft.push(65);  // A key
    camera.keysRight.push(68); // D key
    
    // التأكد من أن المفاتيح تعمل بشكل صحيح
    camera.keysUpward.push(81);   // Q key for up
    camera.keysDownward.push(69); // E key for down
    
    // تحسين سرعة الحركة والدوران
    camera.speed = 0.5;
    camera.angularSensibility = 2000;

    // إنشاء الإضاءة، موجهة نحو 0,1,0 - نحو السماء (غير شبكية)
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

    // الشدة الافتراضية هي 1. دعنا نخفف الإضاءة قليلاً
    light.intensity = 0.7;

    // الشكل المدمج 'كرة'
    var sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 2, segments: 32}, scene);

    // رفع الكرة لأعلى بنصف ارتفاعها
    sphere.position.y = 1;

    // الشكل المدمج 'أرضية'
    var ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 6, height: 6}, scene);

    return scene;
};

// إنشاء المشهد
var scene = createScene();`;
}

