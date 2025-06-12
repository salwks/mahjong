import * as THREE from "three";

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    this.setupRenderer();
    this.setupCamera();
    this.setupLighting();
    this.setupEnvironment();
  }

  async init() {
    // 필요한 리소스 로딩
    await this.loadResources();

    // 리사이즈 처리
    this.onWindowResize();
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
  }

  setupCamera() {
    // 마작 테이블을 내려다보는 카메라 각도
    this.camera = new THREE.PerspectiveCamera(
      60, // FOV
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // 카메라 초기 위치 (플레이어 시점)
    this.camera.position.set(0, 8, 6);
    this.camera.lookAt(0, 0, 0);
  }

  setupLighting() {
    // 환경 조명
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    // 주 조명 (위에서 비추는 조명)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 15, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    this.scene.add(directionalLight);

    // 보조 조명 (따뜻한 색감)
    const pointLight = new THREE.PointLight(0xffa500, 0.3, 20);
    pointLight.position.set(-5, 5, 5);
    this.scene.add(pointLight);
  }

  setupEnvironment() {
    // 배경색
    this.scene.background = new THREE.Color(0x1a4d3a);

    // 마작 테이블
    this.createMahjongTable();

    // 바닥
    this.createFloor();
  }

  createMahjongTable() {
    // 테이블 상판
    const tableGeometry = new THREE.BoxGeometry(12, 0.3, 12);
    const tableMaterial = new THREE.MeshLambertMaterial({
      color: 0x2d5016,
      transparent: false,
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.receiveShadow = true;
    table.position.y = -0.15;
    this.scene.add(table);

    // 테이블 테두리
    const borderGeometry = new THREE.BoxGeometry(12.2, 0.1, 12.2);
    const borderMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.position.y = -0.05;
    this.scene.add(border);

    // 중앙 영역 표시 (버린 패가 놓일 곳)
    const centerGeometry = new THREE.BoxGeometry(6, 0.01, 6);
    const centerMaterial = new THREE.MeshLambertMaterial({
      color: 0x3d6b26,
      transparent: true,
      opacity: 0.8,
    });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.position.y = 0.01;
    this.scene.add(center);
  }

  createFloor() {
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3520 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  async loadResources() {
    // 텍스처 로더
    const textureLoader = new THREE.TextureLoader();

    // 필요한 텍스처들을 미리 로드
    const textures = {};

    try {
      // 마작패 텍스처들
      const tileTypes = ["man", "pin", "sou"];
      for (const type of tileTypes) {
        for (let i = 1; i <= 9; i++) {
          textures[`${type}_${i}`] = await this.loadTexture(
            textureLoader,
            `assets/textures/tiles/${type}_${i}.png`
          );
        }
      }

      // 자패 텍스처들
      const honors = [
        "east",
        "south",
        "west",
        "north",
        "white",
        "green",
        "red",
      ];
      for (const honor of honors) {
        textures[`honor_${honor}`] = await this.loadTexture(
          textureLoader,
          `assets/textures/tiles/honor_${honor}.png`
        );
      }

      // 뒷면 텍스처
      textures["back"] = await this.loadTexture(
        textureLoader,
        "assets/textures/tiles/back.png"
      );

      this.textures = textures;
    } catch (error) {
      console.warn("일부 텍스처 로딩 실패, 기본 색상 사용:", error);
      this.textures = {};
    }
  }

  loadTexture(loader, url) {
    return new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, () => {
        // 텍스처 로딩 실패시 기본 텍스처 생성
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = "#000000";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText("?", 32, 36);

        const texture = new THREE.CanvasTexture(canvas);
        resolve(texture);
      });
    });
  }

  update() {
    const deltaTime = this.clock.getDelta();
    // 여기서 애니메이션 업데이트 등을 처리
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  // 유틸리티 메서드들
  getTexture(key) {
    return this.textures[key] || this.createDefaultTexture();
  }

  createDefaultTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#cccccc";
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }
}
