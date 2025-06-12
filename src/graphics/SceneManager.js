// src/graphics/SceneManager.js (업데이트된 버전)
import * as THREE from "three";

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // 텍스처 캐시
    this.tileTextures = {};

    this.setupRenderer();
    this.setupCamera();
    this.setupLighting();
    this.setupEnvironment();
  }

  async init() {
    // 텍스처 생성
    await this.createTileTextures();

    // 리사이즈 처리
    this.onWindowResize();

    console.log("✓ SceneManager 초기화 완료");
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
    this.camera.position.set(0, 12, 8);
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
    const tableGeometry = new THREE.BoxGeometry(14, 0.3, 14);
    const tableMaterial = new THREE.MeshLambertMaterial({
      color: 0x2d5016,
      transparent: false,
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.receiveShadow = true;
    table.position.y = -0.15;
    this.scene.add(table);

    // 테이블 테두리
    const borderGeometry = new THREE.BoxGeometry(14.4, 0.1, 14.4);
    const borderMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.position.y = -0.05;
    this.scene.add(border);

    // 중앙 영역 표시 (버린패 영역)
    const centerGeometry = new THREE.BoxGeometry(8, 0.02, 8);
    const centerMaterial = new THREE.MeshLambertMaterial({
      color: 0x3d6b26,
      transparent: true,
      opacity: 0.3,
    });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.position.y = 0.01;
    this.scene.add(center);

    // 플레이어 영역 표시선들
    this.createPlayerAreas();
  }

  createPlayerAreas() {
    const areaSize = 0.02;
    const positions = [
      { x: 0, z: 5.5, color: 0x4caf50, width: 8, height: 1.5 }, // 플레이어 (하단, 초록)
      { x: 5.5, z: 0, color: 0x2196f3, width: 1.5, height: 8 }, // AI 남 (우측, 파랑)
      { x: 0, z: -5.5, color: 0xff9800, width: 8, height: 1.5 }, // AI 서 (상단, 주황)
      { x: -5.5, z: 0, color: 0x9c27b0, width: 1.5, height: 8 }, // AI 북 (좌측, 보라)
    ];

    positions.forEach((pos, index) => {
      const areaGeometry = new THREE.BoxGeometry(
        pos.width,
        areaSize,
        pos.height
      );
      const areaMaterial = new THREE.MeshLambertMaterial({
        color: pos.color,
        transparent: true,
        opacity: 0.15,
      });
      const area = new THREE.Mesh(areaGeometry, areaMaterial);

      area.position.set(pos.x, 0.01, pos.z);
      this.scene.add(area);
    });
  }

  createFloor() {
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshLambertMaterial({
      color: 0x2a2a2a,
      transparent: true,
      opacity: 0.8,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  async createTileTextures() {
    this.tileTextures = {};

    // 만수 (1-9만)
    for (let i = 1; i <= 9; i++) {
      this.tileTextures[`man_${i}`] = this.createTileTexture(
        i + "万",
        "#d32f2f"
      );
    }

    // 통수 (1-9통)
    for (let i = 1; i <= 9; i++) {
      this.tileTextures[`pin_${i}`] = this.createTileTexture(
        i + "筒",
        "#1976d2"
      );
    }

    // 삭수 (1-9삭)
    for (let i = 1; i <= 9; i++) {
      this.tileTextures[`sou_${i}`] = this.createTileTexture(
        i + "索",
        "#388e3c"
      );
    }

    // 자패
    this.tileTextures["honor_east"] = this.createTileTexture("東", "#ff6f00");
    this.tileTextures["honor_south"] = this.createTileTexture("南", "#ff6f00");
    this.tileTextures["honor_west"] = this.createTileTexture("西", "#ff6f00");
    this.tileTextures["honor_north"] = this.createTileTexture("北", "#ff6f00");
    this.tileTextures["honor_white"] = this.createTileTexture("白", "#9c27b0");
    this.tileTextures["honor_green"] = this.createTileTexture("發", "#4caf50");
    this.tileTextures["honor_red"] = this.createTileTexture("中", "#f44336");

    // 뒷면 텍스처
    this.tileTextures["back"] = this.createBackTexture();

    console.log("✓ 마작패 텍스처 생성 완료");
  }

  createTileTexture(text, color = "#000000") {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    // 배경 (흰색)
    ctx.fillStyle = "#f8f8f8";
    ctx.fillRect(0, 0, 128, 128);

    // 외부 테두리
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 124, 124);

    // 내부 테두리
    ctx.strokeStyle = "#888888";
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, 112, 112);

    // 텍스트
    ctx.fillStyle = color;
    ctx.font = 'bold 48px Arial, "Noto Sans CJK", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 텍스트 그림자
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillText(text, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipMapLinearFilter;

    return texture;
  }

  createBackTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    // 배경 (진한 녹색)
    ctx.fillStyle = "#1b5e20";
    ctx.fillRect(0, 0, 128, 128);

    // 테두리
    ctx.strokeStyle = "#f9a825";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 124, 124);

    // 격자 패턴
    ctx.strokeStyle = "#2e7d32";
    ctx.lineWidth = 1;
    for (let i = 12; i < 128; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 12);
      ctx.lineTo(i, 116);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(12, i);
      ctx.lineTo(116, i);
      ctx.stroke();
    }

    // 중앙 로고
    ctx.fillStyle = "#f9a825";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("麻雀", 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipMapLinearFilter;

    return texture;
  }

  // 텍스처 제공 메서드 (MahjongTile에서 사용)
  getTileTexture(key) {
    return this.tileTextures[key] || this.createDefaultTexture();
  }

  createDefaultTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#cccccc";
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "#000000";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", 32, 32);

    return new THREE.CanvasTexture(canvas);
  }

  update() {
    const deltaTime = this.clock.getDelta();
    // 씬 업데이트 로직 (필요시 확장)
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

  dispose() {
    // 텍스처 정리
    Object.values(this.tileTextures).forEach((texture) => {
      if (texture.dispose) texture.dispose();
    });

    // 씬 정리
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      this.scene.remove(child);

      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    // 렌더러 정리
    if (this.renderer) {
      this.renderer.dispose();
    }

    console.log("SceneManager 정리 완료");
  }
}
