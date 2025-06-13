// src/graphics/SceneManager.js (완전한 버전 - PlayerGroupManager 포함)
import * as THREE from "three";
import { PlayerGroupManager } from "./PlayerGroupManager.js";

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // 텍스처 캐시
    this.tileTextures = {};

    // 플레이어 그룹 관리자
    this.playerGroupManager = null;

    // 성능 관련
    this.frameCount = 0;
    this.lastFPSUpdate = 0;

    this.setupRenderer();
    this.setupCamera();
    this.setupLighting();
    this.setupEnvironment();
  }

  async init() {
    console.log("🎨 SceneManager 초기화 시작...");

    // 텍스처 생성
    await this.createTileTextures();

    // 플레이어 그룹 관리자 초기화
    this.playerGroupManager = new PlayerGroupManager(this);
    console.log("✓ PlayerGroupManager 초기화 완료");

    // 리사이즈 처리
    this.onWindowResize();

    console.log("✓ SceneManager 초기화 완료");
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });

    // 기본 설정
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 그림자 설정
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 배경색
    this.renderer.setClearColor(0x1a4b3a, 1); // 마작 테이블 색상

    console.log("✓ WebGL 렌더러 초기화 완료");
  }

  setupCamera() {
    // 원근 카메라 설정
    this.camera = new THREE.PerspectiveCamera(
      60, // FOV
      window.innerWidth / window.innerHeight, // aspect ratio
      0.1, // near
      1000 // far
    );

    // 카메라 위치 (플레이어 시점 - 약간 위에서 내려다보기)
    this.camera.position.set(0, 8, 10);
    this.camera.lookAt(0, 0, 0);

    console.log("✓ 카메라 설정 완료");
  }

  setupLighting() {
    // 환경광 (전체적으로 밝게)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // 주광원 (위에서 비추는 조명)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;

    // 그림자 품질 설정
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;

    this.scene.add(directionalLight);

    // 보조 조명 (반대편에서 약간)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 10, -5);
    this.scene.add(fillLight);

    // 포인트 라이트 (중앙에서 따뜻한 느낌)
    const pointLight = new THREE.PointLight(0xffdd88, 0.5, 50);
    pointLight.position.set(0, 5, 0);
    this.scene.add(pointLight);

    console.log("✓ 조명 설정 완료");
  }

  setupEnvironment() {
    // 마작 테이블 생성
    this.createMahjongTable();

    // 배경 요소들
    this.createBackground();

    console.log("✓ 환경 설정 완료");
  }

  createMahjongTable() {
    // 테이블 표면
    const tableGeometry = new THREE.PlaneGeometry(20, 20);
    const tableMaterial = new THREE.MeshLambertMaterial({
      color: 0x2d5a3d, // 짙은 초록색
    });

    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.rotation.x = -Math.PI / 2; // 바닥에 평평하게
    table.position.y = -0.1;
    table.receiveShadow = true;
    this.scene.add(table);

    // 테이블 경계선
    const borderGeometry = new THREE.RingGeometry(9.5, 10, 64);
    const borderMaterial = new THREE.MeshLambertMaterial({
      color: 0x8b4513, // 갈색 테두리
    });

    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.rotation.x = -Math.PI / 2;
    border.position.y = -0.05;
    this.scene.add(border);

    // 중앙 표시 (작은 원)
    const centerGeometry = new THREE.CircleGeometry(0.3, 32);
    const centerMaterial = new THREE.MeshLambertMaterial({
      color: 0x8b4513,
    });

    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.rotation.x = -Math.PI / 2;
    center.position.y = -0.04;
    this.scene.add(center);
  }

  createBackground() {
    // 배경 구체 (스카이박스 대신)
    const skyGeometry = new THREE.SphereGeometry(100, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a1a2e,
      side: THREE.BackSide,
    });

    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(sky);
  }

  async createTileTextures() {
    console.log("🎨 마작패 텍스처 생성 중...");

    // 캔버스를 사용해서 텍스처 생성
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 128;
    canvas.height = 192;

    // 기본 텍스처들 생성
    await this.createBasicTextures(canvas, ctx);
    await this.createSuitTextures(canvas, ctx);
    await this.createHonorTextures(canvas, ctx);

    console.log(
      "✓ 텍스처 생성 완료:",
      Object.keys(this.tileTextures).length + "개"
    );
  }

  async createBasicTextures(canvas, ctx) {
    // 뒷면 텍스처
    ctx.fillStyle = "#2d4a2d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#8b4513";
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

    // 중앙에 패턴
    ctx.fillStyle = "#1a3d1a";
    for (let i = 20; i < canvas.width - 20; i += 20) {
      for (let j = 20; j < canvas.height - 20; j += 20) {
        ctx.fillRect(i, j, 8, 8);
      }
    }

    this.tileTextures["back"] = new THREE.CanvasTexture(
      this.copyCanvas(canvas)
    );
  }

  async createSuitTextures(canvas, ctx) {
    const suits = ["man", "pin", "sou"];
    const suitNames = ["万", "筒", "索"];
    const suitColors = ["#cc0000", "#0066cc", "#00aa00"];

    for (let s = 0; s < suits.length; s++) {
      const suit = suits[s];
      const suitName = suitNames[s];
      const color = suitColors[s];

      for (let num = 1; num <= 9; num++) {
        // 배경
        ctx.fillStyle = "#f8f8f8";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 테두리
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

        // 숫자
        ctx.fillStyle = color;
        ctx.font = "bold 48px Arial";
        ctx.textAlign = "center";
        ctx.fillText(num.toString(), canvas.width / 2, 60);

        // 수패 문자
        ctx.font = "bold 32px Arial";
        ctx.fillText(suitName, canvas.width / 2, 120);

        // 장식 점들
        this.drawSuitDecorations(ctx, suit, num, color);

        const key = `${suit}_${num}`;
        this.tileTextures[key] = new THREE.CanvasTexture(
          this.copyCanvas(canvas)
        );
      }
    }
  }

  async createHonorTextures(canvas, ctx) {
    const honors = [
      { key: "east", char: "東", color: "#cc0000" },
      { key: "south", char: "南", color: "#cc0000" },
      { key: "west", char: "西", color: "#cc0000" },
      { key: "north", char: "北", color: "#cc0000" },
      { key: "white", char: "白", color: "#0066cc" },
      { key: "green", char: "發", color: "#00aa00" },
      { key: "red", char: "中", color: "#cc0000" },
    ];

    for (const honor of honors) {
      // 배경
      ctx.fillStyle = "#f8f8f8";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 테두리
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

      // 자패 문자
      ctx.fillStyle = honor.color;
      ctx.font = "bold 64px Arial";
      ctx.textAlign = "center";
      ctx.fillText(honor.char, canvas.width / 2, 120);

      // 장식 테두리
      ctx.strokeStyle = honor.color;
      ctx.lineWidth = 3;
      ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

      const key = `honor_${honor.key}`;
      this.tileTextures[key] = new THREE.CanvasTexture(this.copyCanvas(canvas));
    }
  }

  drawSuitDecorations(ctx, suit, num, color) {
    const centerX = ctx.canvas.width / 2;
    const bottomY = ctx.canvas.height - 40;

    ctx.fillStyle = color;

    // 수패별 장식
    switch (suit) {
      case "man": // 만수패 - 선들
        for (let i = 0; i < Math.min(num, 4); i++) {
          const x = centerX - 20 + i * 10;
          ctx.fillRect(x, bottomY, 8, 20);
        }
        break;

      case "pin": // 통수패 - 원들
        const cols = Math.min(num, 3);
        const rows = Math.ceil(num / 3);
        for (let i = 0; i < num && i < 9; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = centerX - (cols - 1) * 8 + col * 16;
          const y = bottomY + row * 12;

          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case "sou": // 삭수패 - 죽
        for (let i = 0; i < Math.min(num, 4); i++) {
          const x = centerX - 15 + i * 8;
          ctx.fillRect(x, bottomY, 2, 15);
          ctx.fillRect(x - 1, bottomY + 15, 4, 2);
        }
        break;
    }
  }

  copyCanvas(sourceCanvas) {
    const newCanvas = document.createElement("canvas");
    const newCtx = newCanvas.getContext("2d");
    newCanvas.width = sourceCanvas.width;
    newCanvas.height = sourceCanvas.height;
    newCtx.drawImage(sourceCanvas, 0, 0);
    return newCanvas;
  }

  // 텍스처 가져오기
  getTileTexture(key) {
    return this.tileTextures[key] || this.tileTextures["back"];
  }

  // === 업데이트 및 렌더링 ===

  update() {
    const deltaTime = this.clock.getDelta();

    // 성능 모니터링
    this.frameCount++;
    if (this.clock.elapsedTime - this.lastFPSUpdate > 1.0) {
      const fps =
        this.frameCount / (this.clock.elapsedTime - this.lastFPSUpdate);
      this.frameCount = 0;
      this.lastFPSUpdate = this.clock.elapsedTime;

      // 성능이 낮으면 품질 조정
      if (fps < 30) {
        this.adjustPerformance();
      }
    }

    // 플레이어 그룹 관리자 업데이트 (필요시)
    if (this.playerGroupManager && this.playerGroupManager.update) {
      this.playerGroupManager.update(deltaTime);
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  adjustPerformance() {
    // 성능이 낮을 때 품질 조정
    const pixelRatio = this.renderer.getPixelRatio();
    if (pixelRatio > 1) {
      this.renderer.setPixelRatio(1);
      console.log("성능 최적화: 픽셀 비율 조정");
    }

    // 그림자 품질 낮추기
    if (this.renderer.shadowMap.enabled) {
      const lights = this.scene.children.filter(
        (child) => child instanceof THREE.DirectionalLight && child.castShadow
      );
      lights.forEach((light) => {
        if (light.shadow.mapSize.width > 1024) {
          light.shadow.mapSize.setScalar(1024);
        }
      });
      console.log("성능 최적화: 그림자 품질 조정");
    }
  }

  // === 윈도우 리사이즈 ===

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 카메라 비율 업데이트
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // 렌더러 크기 업데이트
    this.renderer.setSize(width, height);

    console.log(`화면 크기 조정: ${width}x${height}`);
  }

  // === 디버그 정보 ===

  getDebugInfo() {
    return {
      renderer: {
        pixelRatio: this.renderer.getPixelRatio(),
        shadowMapEnabled: this.renderer.shadowMap.enabled,
        clearColor: this.renderer.getClearColor().getHexString(),
      },
      scene: {
        children: this.scene.children.length,
        materials: this.countMaterials(),
        geometries: this.countGeometries(),
      },
      camera: {
        position: this.camera.position.toArray(),
        rotation: this.camera.rotation.toArray(),
        fov: this.camera.fov,
      },
      textures: Object.keys(this.tileTextures).length,
      playerGroups: this.playerGroupManager
        ? this.playerGroupManager.getDebugInfo()
        : null,
    };
  }

  countMaterials() {
    const materials = new Set();
    this.scene.traverse((object) => {
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => materials.add(mat));
        } else {
          materials.add(object.material);
        }
      }
    });
    return materials.size;
  }

  countGeometries() {
    const geometries = new Set();
    this.scene.traverse((object) => {
      if (object.geometry) {
        geometries.add(object.geometry);
      }
    });
    return geometries.size;
  }

  // === 카메라 컨트롤 ===

  setCameraPosition(x, y, z) {
    this.camera.position.set(x, y, z);
  }

  setCameraTarget(x, y, z) {
    this.camera.lookAt(x, y, z);
  }

  resetCamera() {
    this.camera.position.set(0, 8, 10);
    this.camera.lookAt(0, 0, 0);
  }

  // 애니메이션으로 카메라 이동
  animateCameraTo(position, target, duration = 1.0) {
    if (window.gsap) {
      const tl = window.gsap.timeline();

      tl.to(this.camera.position, {
        duration: duration,
        x: position.x,
        y: position.y,
        z: position.z,
        ease: "power2.inOut",
      });

      if (target) {
        // lookAt 애니메이션은 더 복잡하므로 간단히 처리
        tl.call(
          () => this.camera.lookAt(target.x, target.y, target.z),
          [],
          duration
        );
      }
    } else {
      this.setCameraPosition(position.x, position.y, position.z);
      if (target) {
        this.setCameraTarget(target.x, target.y, target.z);
      }
    }
  }

  // === 정리 ===

  dispose() {
    console.log("SceneManager 정리 중...");

    // 플레이어 그룹 관리자 정리
    if (this.playerGroupManager) {
      this.playerGroupManager.dispose();
      this.playerGroupManager = null;
    }

    // 텍스처 정리
    Object.values(this.tileTextures).forEach((texture) => {
      texture.dispose();
    });
    this.tileTextures = {};

    // 씬의 모든 객체 정리
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      this.scene.remove(child);

      // 메시의 geometry와 material 정리
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    // 렌더러 정리
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    console.log("SceneManager 정리 완료");
  }
}
