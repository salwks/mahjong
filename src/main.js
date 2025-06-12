// src/main.js (올바른 게임 플로우)
import * as THREE from "three";
import { gsap } from "gsap";
import { MahjongTile } from "./game/MahjongTile.js";

class MahjongApp {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.loadingScreen = document.getElementById("loadingScreen");
    this.loadingText = document.getElementById("loading-text");
    this.errorMessage = document.getElementById("error-message");

    // 게임 상태
    this.gameState = "menu"; // 'menu', 'shuffling', 'dealing', 'playing', 'paused'
    this.currentPlayerIndex = 0; // 0=플레이어, 1=동, 2=남, 3=서
    this.dealerIndex = 0; // 동가
    this.turnCount = 0;

    // 3D 관련
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // 텍스처 캐시
    this.tileTextures = {};

    // 마작패 관련 (4명 플레이어)
    this.playerHands = [[], [], [], []]; // 각 플레이어 손패
    this.wallTiles = []; // 패산
    this.discardPiles = [[], [], [], []]; // 각 플레이어 버린패
    this.selectedTile = null;

    // 애니메이션 관리
    this.masterTimeline = null;
    this.activeTweens = new Set();

    // UI 요소들
    this.buttons = {
      discard: document.getElementById("btn-discard"),
      riichi: document.getElementById("btn-riichi"),
      tsumo: document.getElementById("btn-tsumo"),
      ron: document.getElementById("btn-ron"),
      chi: document.getElementById("btn-chi"),
      pon: document.getElementById("btn-pon"),
      kan: document.getElementById("btn-kan"),
    };

    // AI 플레이어 정보
    this.playerNames = ["플레이어", "AI 동", "AI 남", "AI 서"];
    this.playerWinds = ["동", "남", "서", "북"];

    this.setupErrorHandling();
    this.init();
  }

  setupErrorHandling() {
    window.addEventListener("error", (e) => {
      console.error("전역 에러:", e.error);
      this.handleError(e.error.message || "알 수 없는 오류가 발생했습니다.");
    });
  }

  async init() {
    try {
      console.log("🀄 마작 게임 초기화 시작...");

      // GSAP 설정
      gsap.defaults({
        ease: "power2.out",
        duration: 0.5,
      });

      // 1단계: 3D 씬 초기화
      this.updateLoadingText("3D 씬 초기화 중...");
      await this.initScene();

      // 2단계: 텍스처 생성
      this.updateLoadingText("마작패 텍스처 생성 중...");
      await this.createTileTextures();

      // 3단계: 패산 생성 (136장)
      this.updateLoadingText("패산 생성 중...");
      this.createWallTiles();

      // 4단계: UI 초기화
      this.updateLoadingText("UI 초기화 중...");
      this.initUI();

      // 5단계: 이벤트 리스너 설정
      this.updateLoadingText("이벤트 설정 중...");
      this.setupEventListeners();

      // 로딩 완료 - 메뉴 상태로
      this.hideLoadingScreen();
      this.showStartMenu();
    } catch (error) {
      console.error("초기화 실패:", error);
      this.handleError(error.message);
    }
  }

  showStartMenu() {
    this.gameState = "menu";
    this.animate(); // 3D 렌더링 시작

    // 시작 버튼 표시
    const startButton = document.createElement("button");
    startButton.id = "start-game-btn";
    startButton.textContent = "게임 시작";
    startButton.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 20px 40px;
            font-size: 24px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            z-index: 2000;
            box-shadow: 0 8px 16px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;

    startButton.onmouseover = () => {
      startButton.style.transform = "translate(-50%, -50%) scale(1.05)";
      startButton.style.background = "#45a049";
    };

    startButton.onmouseout = () => {
      startButton.style.transform = "translate(-50%, -50%) scale(1)";
      startButton.style.background = "#4CAF50";
    };

    startButton.onclick = () => {
      startButton.remove();
      this.startGame();
    };

    document.body.appendChild(startButton);

    // 페이드 인 애니메이션
    gsap.fromTo(
      startButton,
      { opacity: 0, scale: 0.5 },
      { duration: 0.5, opacity: 1, scale: 1, ease: "back.out(1.7)" }
    );

    this.showNotification(
      "🀄 Three.js 마작 게임에 오신 것을 환영합니다! 🀄",
      "success",
      4000
    );
  }

  async initScene() {
    // 씬 생성
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a4d3a);

    // 카메라 생성
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 12, 8);
    this.camera.lookAt(0, 0, 0);

    // 렌더러 생성
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 조명 설정
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 15, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // 테이블 생성
    this.createTable();

    console.log("✓ 3D 씬 초기화 완료");
  }

  createTable() {
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
    const areaSize = 0.1;
    const positions = [
      { x: 0, z: 5.5, color: 0x4caf50 }, // 플레이어 (하단, 초록)
      { x: 5.5, z: 0, color: 0x2196f3 }, // AI 동 (우측, 파랑)
      { x: 0, z: -5.5, color: 0xff9800 }, // AI 남 (상단, 주황)
      { x: -5.5, z: 0, color: 0x9c27b0 }, // AI 서 (좌측, 보라)
    ];

    positions.forEach((pos, index) => {
      const areaGeometry = new THREE.BoxGeometry(8, areaSize, 1.5);
      const areaMaterial = new THREE.MeshLambertMaterial({
        color: pos.color,
        transparent: true,
        opacity: 0.2,
      });
      const area = new THREE.Mesh(areaGeometry, areaMaterial);

      if (index === 1 || index === 3) {
        // 동/서는 90도 회전
        area.rotation.y = Math.PI / 2;
      }

      area.position.set(pos.x, 0.01, pos.z);
      this.scene.add(area);
    });
  }

  async createTileTextures() {
    // 텍스처 생성 코드 (이전과 동일)
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

  // SceneManager처럼 텍스처를 제공하는 메서드
  getTileTexture(key) {
    return this.tileTextures[key] || this.tileTextures["man_1"];
  }

  createWallTiles() {
    this.wallTiles = [];

    // 136장의 패 생성 (마작 표준)
    const tileTypes = [
      // 만수 (각 4장씩)
      ...Array(4)
        .fill()
        .flatMap(() =>
          Array.from({ length: 9 }, (_, i) => ({ type: "man", number: i + 1 }))
        ),
      // 통수 (각 4장씩)
      ...Array(4)
        .fill()
        .flatMap(() =>
          Array.from({ length: 9 }, (_, i) => ({ type: "pin", number: i + 1 }))
        ),
      // 삭수 (각 4장씩)
      ...Array(4)
        .fill()
        .flatMap(() =>
          Array.from({ length: 9 }, (_, i) => ({ type: "sou", number: i + 1 }))
        ),
      // 자패 (각 4장씩)
      ...Array(4)
        .fill()
        .flatMap(() => [
          { type: "honor", number: "east" },
          { type: "honor", number: "south" },
          { type: "honor", number: "west" },
          { type: "honor", number: "north" },
          { type: "honor", number: "white" },
          { type: "honor", number: "green" },
          { type: "honor", number: "red" },
        ]),
    ];

    // 초기에는 중앙에 모든 패를 스택으로 배치
    tileTypes.forEach((tileData, index) => {
      const layer = Math.floor(index / 34); // 34장씩 레이어
      const posInLayer = index % 34;
      const row = Math.floor(posInLayer / 17);
      const col = posInLayer % 17;

      const x = (col - 8) * 0.1; // 조밀하게 배치
      const z = (row - 0.5) * 0.1;
      const y = 0.2 + layer * 0.05; // 레이어별로 쌓기

      const tile = new MahjongTile(
        tileData.type,
        tileData.number,
        this, // sceneManager 역할
        new THREE.Vector3(x, y, z)
      );

      tile.owner = "wall";
      tile.flip(false, false); // 뒷면으로 시작

      this.wallTiles.push(tile);
    });

    console.log(`✓ 패산 생성 완료: ${this.wallTiles.length}장`);
  }

  initUI() {
    this.disableAllButtons();
    this.updateUI();
    console.log("✓ UI 초기화 완료");
  }

  setupEventListeners() {
    // 윈도우 리사이즈
    window.addEventListener("resize", () => this.onWindowResize());

    // 마우스/터치 이벤트
    this.canvas.addEventListener("click", (e) => this.onCanvasClick(e));
    this.canvas.addEventListener("touchstart", (e) => this.onCanvasTouch(e), {
      passive: false,
    });

    // 버튼 이벤트
    Object.entries(this.buttons).forEach(([name, button]) => {
      if (button) {
        button.addEventListener("click", () => this.onButtonClick(name));
      }
    });

    // 키보드 이벤트
    document.addEventListener("keydown", (e) => this.onKeyDown(e));

    console.log("✓ 이벤트 리스너 설정 완료");
  }

  async startGame() {
    console.log("🎮 게임 시작!");
    this.gameState = "shuffling";
    this.currentPlayerIndex = this.dealerIndex; // 동가부터 시작
    this.turnCount = 0;

    // 1단계: 패 섞기 애니메이션
    await this.shuffleTiles();

    // 2단계: 초기 패 배분
    await this.dealInitialHands();

    // 3단계: 게임 플레이 시작
    this.gameState = "playing";
    this.startPlayerTurn();

    console.log("✓ 게임 시작 완료");
  }

  async shuffleTiles() {
    this.showNotification("패를 섞는 중...", "info", -1);

    // GSAP v3 방식: 마스터 타임라인 생성
    this.masterTimeline = gsap.timeline();

    // 모든 패산 타일들을 순차적으로 섞기 애니메이션
    this.wallTiles.forEach((tile, index) => {
      this.masterTimeline.call(
        () => {
          tile.shuffle(3); // 더 큰 강도로 섞기
        },
        [],
        index * 0.005
      ); // 더 빠르게
    });

    // 타임라인이 완료될 때까지 대기
    await new Promise((resolve) => {
      this.masterTimeline.eventCallback("onComplete", resolve);
    });

    // 추가 대기
    await this.delay(1500);

    // 패 배열 셔플 (Fisher-Yates)
    for (let i = this.wallTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.wallTiles[i], this.wallTiles[j]] = [
        this.wallTiles[j],
        this.wallTiles[i],
      ];
    }

    this.hideNotification();
    console.log("✓ 패 섞기 완료");
  }

  async dealInitialHands() {
    this.showNotification("패를 배분하는 중...", "info", -1);
    this.gameState = "dealing";

    // 모든 플레이어 손패 초기화
    this.playerHands = [[], [], [], []];

    // 각 플레이어에게 13장씩 배분
    for (let round = 0; round < 13; round++) {
      for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
        if (this.wallTiles.length === 0) break;

        const tile = this.wallTiles.shift();
        tile.owner = `player${playerIndex}`;
        this.playerHands[playerIndex].push(tile);

        // 플레이어별 위치 계산
        const targetPosition = this.getPlayerHandPosition(
          playerIndex,
          this.playerHands[playerIndex].length - 1
        );

        // 배분 애니메이션
        await new Promise((resolve) => {
          tile.drawFromWall(targetPosition, resolve);
        });

        // 플레이어 패만 앞면으로
        if (playerIndex === 0) {
          tile.flip(true, true, 0.2);
        }

        await this.delay(30); // 빠른 배분
      }
    }

    // 동가에게 추가 1장 (총 14장)
    if (this.wallTiles.length > 0) {
      const tile = this.wallTiles.shift();
      tile.owner = `player${this.dealerIndex}`;
      this.playerHands[this.dealerIndex].push(tile);

      const targetPosition = this.getPlayerHandPosition(
        this.dealerIndex,
        this.playerHands[this.dealerIndex].length - 1
      );
      await new Promise((resolve) => {
        tile.drawFromWall(targetPosition, resolve);
      });

      if (this.dealerIndex === 0) {
        tile.flip(true, true, 0.2);
      }
    }

    // 플레이어 손패 정렬
    await this.sortPlayerHand(0);

    this.hideNotification();
    console.log("✓ 패 배분 완료");
  }

  getPlayerHandPosition(playerIndex, tileIndex) {
    const tileWidth = 0.55;
    const handLength = this.playerHands[playerIndex].length;
    const startOffset = (-(handLength - 1) * tileWidth) / 2;

    switch (playerIndex) {
      case 0: // 플레이어 (하단)
        return new THREE.Vector3(
          startOffset + tileIndex * tileWidth,
          0.35,
          4.8
        );
      case 1: // AI 동 (우측)
        return new THREE.Vector3(
          4.8,
          0.35,
          startOffset + tileIndex * tileWidth
        );
      case 2: // AI 남 (상단)
        return new THREE.Vector3(
          -startOffset - tileIndex * tileWidth,
          0.35,
          -4.8
        );
      case 3: // AI 서 (좌측)
        return new THREE.Vector3(
          -4.8,
          0.35,
          -startOffset - tileIndex * tileWidth
        );
    }
  }

  getPlayerHandRotation(playerIndex) {
    switch (playerIndex) {
      case 0:
        return { x: 0, y: 0, z: 0 }; // 플레이어
      case 1:
        return { x: 0, y: Math.PI / 2, z: 0 }; // 동
      case 2:
        return { x: 0, y: Math.PI, z: 0 }; // 남
      case 3:
        return { x: 0, y: -Math.PI / 2, z: 0 }; // 서
    }
  }

  async sortPlayerHand(playerIndex) {
    // 패 정렬 (타입별, 숫자별)
    this.playerHands[playerIndex].sort((a, b) => a.compare(b));

    // 정렬된 위치로 애니메이션
    const arrangePromises = this.playerHands[playerIndex].map((tile, index) => {
      const targetPosition = this.getPlayerHandPosition(playerIndex, index);
      const targetRotation = this.getPlayerHandRotation(playerIndex);

      return new Promise((resolve) => {
        tile.setPosition(
          targetPosition.x,
          targetPosition.y,
          targetPosition.z,
          true,
          0.3
        );
        tile.setRotation(
          targetRotation.x,
          targetRotation.y,
          targetRotation.z,
          true,
          0.3
        );
        setTimeout(resolve, 350);
      });
    });

    await Promise.all(arrangePromises);
    console.log(`✓ ${this.playerNames[playerIndex]} 손패 정렬 완료`);
  }

  startPlayerTurn() {
    console.log(`🎮 ${this.playerNames[this.currentPlayerIndex]}의 턴`);
    this.turnCount++;

    if (this.currentPlayerIndex === 0) {
      // 플레이어 턴
      this.enablePlayerControls();
      this.showNotification(
        "당신의 차례입니다. 버릴 패를 선택하세요.",
        "info",
        3000
      );
    } else {
      // AI 턴
      this.disableAllButtons();
      this.showNotification(
        `${this.playerNames[this.currentPlayerIndex]}의 차례`,
        "info",
        2000
      );

      // AI 행동 시뮬레이션
      setTimeout(() => {
        this.handleAITurn();
      }, 1000 + Math.random() * 1500); // 1-2.5초 사고시간
    }

    this.animate();
  }

  async handleAITurn() {
    const playerIndex = this.currentPlayerIndex;
    const hand = this.playerHands[playerIndex];

    if (hand.length === 0) return;

    // AI가 랜덤하게 패 선택하여 버리기
    const randomTileIndex = Math.floor(Math.random() * hand.length);
    const tileToDiscard = hand[randomTileIndex];

    console.log(
      `${
        this.playerNames[playerIndex]
      }이 ${tileToDiscard.toString()}을 버립니다`
    );

    // 손패에서 제거
    hand.splice(randomTileIndex, 1);

    // 버린패 더미에 추가
    this.discardPiles[playerIndex].push(tileToDiscard);

    // 버린패 위치로 이동
    const discardPosition = this.getDiscardPosition(
      playerIndex,
      this.discardPiles[playerIndex].length - 1
    );

    await new Promise((resolve) => {
      tileToDiscard.discard(discardPosition, resolve);
    });

    // 손패 재정렬
    await this.sortPlayerHand(playerIndex);

    // 다음 턴으로
    setTimeout(() => {
      this.nextTurn();
    }, 500);
  }

  getDiscardPosition(playerIndex, discardIndex) {
    const tileWidth = 0.5;
    const tilesPerRow = 6;
    const row = Math.floor(discardIndex / tilesPerRow);
    const col = discardIndex % tilesPerRow;

    switch (playerIndex) {
      case 0: // 플레이어 (하단 중앙)
        return new THREE.Vector3(
          (col - (tilesPerRow - 1) / 2) * tileWidth,
          0.05,
          1.5 + row * 0.4
        );
      case 1: // AI 동 (우측 중앙)
        return new THREE.Vector3(
          1.5 + row * 0.4,
          0.05,
          (col - (tilesPerRow - 1) / 2) * tileWidth
        );
      case 2: // AI 남 (상단 중앙)
        return new THREE.Vector3(
          -(col - (tilesPerRow - 1) / 2) * tileWidth,
          0.05,
          -1.5 - row * 0.4
        );
      case 3: // AI 서 (좌측 중앙)
        return new THREE.Vector3(
          -1.5 - row * 0.4,
          0.05,
          -(col - (tilesPerRow - 1) / 2) * tileWidth
        );
    }
  }

  nextTurn() {
    // 다음 플레이어로 턴 넘기기
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 4;

    // 새 패 뽑기 (패산에서)
    if (this.wallTiles.length > 0) {
      const newTile = this.wallTiles.shift();
      newTile.owner = `player${this.currentPlayerIndex}`;
      this.playerHands[this.currentPlayerIndex].push(newTile);

      // 새 패를 손패 끝으로 이동
      const handLength = this.playerHands[this.currentPlayerIndex].length;
      const targetPosition = this.getPlayerHandPosition(
        this.currentPlayerIndex,
        handLength - 1
      );
      const targetRotation = this.getPlayerHandRotation(
        this.currentPlayerIndex
      );

      newTile.drawFromWall(() => {
        // 플레이어 패만 앞면으로
        if (this.currentPlayerIndex === 0) {
          newTile.flip(true, true, 0.3);
        }

        // 턴 시작
        setTimeout(() => {
          this.startPlayerTurn();
        }, 200);
      });

      newTile.setRotation(
        targetRotation.x,
        targetRotation.y,
        targetRotation.z,
        true,
        0.6
      );
    } else {
      // 패산이 다 떨어지면 유국
      this.handleGameDraw();
    }
  }

  handleGameDraw() {
    this.gameState = "finished";
    this.showNotification("🀄 유국 (패산 소진) 🀄", "warning", 5000);

    // 새 게임 버튼 표시
    setTimeout(() => {
      this.showNewGameButton();
    }, 3000);
  }

  showNewGameButton() {
    const newGameBtn = document.createElement("button");
    newGameBtn.textContent = "새 게임";
    newGameBtn.style.cssText = `
            position: fixed;
            top: 60%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 15px 30px;
            font-size: 18px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            z-index: 2000;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        `;

    newGameBtn.onclick = () => {
      newGameBtn.remove();
      this.resetGame();
    };

    document.body.appendChild(newGameBtn);

    gsap.fromTo(
      newGameBtn,
      { opacity: 0, scale: 0.5 },
      { duration: 0.5, opacity: 1, scale: 1, ease: "back.out(1.7)" }
    );
  }

  async resetGame() {
    // 모든 타일 정리
    this.killAllTweens();

    // 기존 타일들 제거
    [
      ...this.wallTiles,
      ...this.playerHands.flat(),
      ...this.discardPiles.flat(),
    ].forEach((tile) => {
      if (tile.dispose) tile.dispose();
    });

    // 배열 초기화
    this.playerHands = [[], [], [], []];
    this.discardPiles = [[], [], [], []];
    this.wallTiles = [];
    this.selectedTile = null;

    // 새로운 패산 생성
    this.createWallTiles();

    // 메뉴로 돌아가기
    this.showStartMenu();
  }

  animate() {
    if (this.gameState === "loading") return;

    requestAnimationFrame(() => this.animate());

    try {
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    } catch (error) {
      console.error("애니메이션 루프 오류:", error);
    }
  }

  // === 플레이어 이벤트 처리 ===

  onCanvasClick(event) {
    if (this.currentPlayerIndex !== 0 || this.gameState !== "playing") return;

    try {
      const tile = this.getTileFromClick(event);
      if (tile && this.playerHands[0].includes(tile)) {
        this.selectTile(tile);
      } else {
        this.deselectAllTiles();
      }
    } catch (error) {
      console.error("클릭 처리 오류:", error);
    }
  }

  onCanvasTouch(event) {
    event.preventDefault();
    if (this.currentPlayerIndex !== 0 || this.gameState !== "playing") return;

    try {
      const touch = event.touches[0];
      const tile = this.getTileFromTouch(touch);
      if (tile && this.playerHands[0].includes(tile)) {
        this.selectTile(tile);
      }
    } catch (error) {
      console.error("터치 처리 오류:", error);
    }
  }

  getTileFromClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    return this.getTileFromScreenPosition(mouse);
  }

  getTileFromTouch(touch) {
    const rect = this.canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2();
  }

  getTileFromScreenPosition(screenPos) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(screenPos, this.camera);

    // 플레이어 손패만 검사
    const playerMeshes = this.playerHands[0]
      .map((tile) => tile.mesh)
      .filter((mesh) => mesh);
    const intersects = raycaster.intersectObjects(playerMeshes);

    if (intersects.length > 0) {
      return intersects[0].object.userData.tile;
    }

    return null;
  }

  selectTile(tile) {
    try {
      // 기존 선택 해제
      this.deselectAllTiles();

      // 새 타일 선택
      tile.select();
      this.selectedTile = tile;

      // UI 업데이트
      this.updateUI();

      // 피드백
      this.showNotification(`${tile.toString()} 선택됨`, "info", 1500);

      console.log("타일 선택됨:", tile.toString());
    } catch (error) {
      console.error("타일 선택 오류:", error);
    }
  }

  deselectAllTiles() {
    this.playerHands[0].forEach((tile) => {
      tile.deselect();
    });
    this.selectedTile = null;
    this.updateUI();
  }

  onButtonClick(buttonName) {
    if (this.currentPlayerIndex !== 0 || this.gameState !== "playing") {
      this.showNotification("당신의 차례가 아닙니다.", "warning");
      return;
    }

    try {
      console.log(`버튼 클릭: ${buttonName}`);

      switch (buttonName) {
        case "discard":
          this.handlePlayerDiscard();
          break;
        default:
          this.showNotification(`${buttonName} 기능은 개발 중입니다.`, "info");
      }
    } catch (error) {
      console.error(`${buttonName} 버튼 처리 오류:`, error);
      this.showNotification("처리 중 오류가 발생했습니다.", "error");
    }
  }

  async handlePlayerDiscard() {
    if (!this.selectedTile) {
      this.showNotification("버릴 패를 먼저 선택하세요.", "warning");
      return;
    }

    try {
      const tileToDiscard = this.selectedTile;

      // 플레이어 손패에서 제거
      const tileIndex = this.playerHands[0].indexOf(tileToDiscard);
      if (tileIndex !== -1) {
        this.playerHands[0].splice(tileIndex, 1);

        // 버린패 더미에 추가
        this.discardPiles[0].push(tileToDiscard);

        // 중앙 영역으로 버리기 애니메이션
        const discardPosition = this.getDiscardPosition(
          0,
          this.discardPiles[0].length - 1
        );

        // 버리기 애니메이션 실행
        await new Promise((resolve) => {
          tileToDiscard.discard(discardPosition, resolve);
        });

        // 손패 재정렬
        await this.sortPlayerHand(0);

        this.showNotification(
          `${tileToDiscard.toString()}을(를) 버렸습니다.`,
          "success",
          1500
        );

        // 다음 턴으로
        setTimeout(() => {
          this.nextTurn();
        }, 1000);
      }
    } catch (error) {
      console.error("버리기 처리 오류:", error);
      this.showNotification("패를 버릴 수 없습니다.", "error");
    }
  }

  onKeyDown(event) {
    if (this.currentPlayerIndex !== 0 || this.gameState !== "playing") return;

    switch (event.code) {
      case "Space":
        event.preventDefault();
        this.handlePlayerDiscard();
        break;
      case "Escape":
        event.preventDefault();
        this.deselectAllTiles();
        break;
    }
  }

  onWindowResize() {
    try {
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    } catch (error) {
      console.error("리사이즈 오류:", error);
    }
  }

  // === UI 관리 ===

  updateUI() {
    try {
      // 게임 상태에 따른 UI 업데이트
      const isPlayerTurn =
        this.currentPlayerIndex === 0 && this.gameState === "playing";

      if (this.buttons.discard) {
        this.buttons.discard.disabled = !this.selectedTile || !isPlayerTurn;
      }

      ["riichi", "tsumo", "ron", "chi", "pon", "kan"].forEach((name) => {
        if (this.buttons[name]) {
          this.buttons[name].disabled = !isPlayerTurn;
        }
      });

      // 남은 패 수 업데이트
      const remainingElement = document.getElementById("remaining-tiles");
      if (remainingElement) {
        remainingElement.textContent = this.wallTiles.length;
      }

      // 라운드 정보 업데이트
      const roundElement = document.getElementById("round-number");
      if (roundElement) {
        roundElement.textContent = Math.floor(this.turnCount / 4) + 1;
      }
    } catch (error) {
      console.error("UI 업데이트 오류:", error);
    }
  }

  enablePlayerControls() {
    this.updateUI();
  }

  disableAllButtons() {
    Object.values(this.buttons).forEach((button) => {
      if (button) button.disabled = true;
    });
  }

  // === GSAP 애니메이션 유틸리티 ===

  killAllTweens() {
    if (this.masterTimeline) {
      this.masterTimeline.kill();
      this.masterTimeline = null;
    }

    this.activeTweens.forEach((tween) => {
      if (tween && tween.kill) {
        tween.kill();
      }
    });
    this.activeTweens.clear();

    // 모든 타일의 애니메이션도 정리
    [
      ...this.playerHands.flat(),
      ...this.wallTiles,
      ...this.discardPiles.flat(),
    ].forEach((tile) => {
      if (tile && tile.killTweens) {
        tile.killTweens();
      }
    });
  }

  registerTween(tween) {
    this.activeTweens.add(tween);

    if (tween.eventCallback) {
      const originalCallback = tween.vars.onComplete;
      tween.eventCallback("onComplete", () => {
        this.activeTweens.delete(tween);
        if (originalCallback) originalCallback();
      });
    }

    return tween;
  }

  // === 유틸리티 ===

  updateLoadingText(text) {
    if (this.loadingText) {
      this.loadingText.textContent = text;
    }
    console.log(text);
  }

  hideLoadingScreen() {
    if (this.loadingScreen) {
      const hideAnimation = gsap.timeline();
      hideAnimation
        .to(this.loadingScreen, {
          duration: 0.5,
          opacity: 0,
          ease: "power2.out",
        })
        .set(this.loadingScreen, {
          display: "none",
        });

      this.registerTween(hideAnimation);
    }
  }

  showNotification(message, type = "info", duration = 3000) {
    try {
      const existing = document.querySelector(".game-notification");
      if (existing) existing.remove();

      const notification = document.createElement("div");
      notification.className = "game-notification";
      notification.innerHTML = `
                <div class="notification-content">
                    ${message}
                    ${
                      duration > 0
                        ? '<button class="notification-close">&times;</button>'
                        : ""
                    }
                </div>
            `;

      const colors = {
        info: "#2196F3",
        success: "#4CAF50",
        warning: "#FF9800",
        error: "#F44336",
      };

      notification.style.cssText = `
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: ${colors[type] || colors.info};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 1000;
                font-size: 14px;
                max-width: 90vw;
                text-align: center;
                opacity: 0;
            `;

      if (!document.getElementById("notification-styles")) {
        const styles = document.createElement("style");
        styles.id = "notification-styles";
        styles.textContent = `
                    .notification-close {
                        background: none;
                        border: none;
                        color: white;
                        font-size: 16px;
                        cursor: pointer;
                        margin-left: 10px;
                        padding: 0;
                    }
                    .notification-content {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }
                `;
        document.head.appendChild(styles);
      }

      const closeBtn = notification.querySelector(".notification-close");
      if (closeBtn) {
        closeBtn.onclick = () => {
          gsap.to(notification, {
            duration: 0.3,
            opacity: 0,
            y: -20,
            ease: "power2.out",
            onComplete: () => notification.remove(),
          });
        };
      }

      document.body.appendChild(notification);

      const notificationTween = gsap.timeline();
      notificationTween.to(notification, {
        duration: 0.3,
        opacity: 1,
        y: 0,
        ease: "power2.out",
      });

      if (duration > 0) {
        notificationTween.to(notification, {
          duration: 0.3,
          opacity: 0,
          y: -20,
          ease: "power2.out",
          delay: duration / 1000,
          onComplete: () => {
            if (notification.parentNode) {
              notification.remove();
            }
          },
        });
      }

      this.registerTween(notificationTween);
    } catch (error) {
      console.error("알림 표시 오류:", error);
    }
  }

  hideNotification() {
    const existing = document.querySelector(".game-notification");
    if (existing) {
      gsap.to(existing, {
        duration: 0.3,
        opacity: 0,
        y: -20,
        ease: "power2.out",
        onComplete: () => existing.remove(),
      });
    }
  }

  handleError(message) {
    console.error("게임 에러:", message);

    this.killAllTweens();

    if (this.loadingText) {
      this.loadingText.textContent = "오류 발생";
    }

    if (this.errorMessage) {
      this.errorMessage.textContent = message;
      this.errorMessage.style.display = "block";
    }

    if (!document.querySelector(".restart-button")) {
      const button = document.createElement("button");
      button.textContent = "새로고침";
      button.className = "restart-button";
      button.onclick = () => window.location.reload();
      button.style.cssText = `
                margin-top: 20px;
                padding: 12px 24px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 16px;
                cursor: pointer;
                opacity: 0;
            `;

      if (this.loadingScreen) {
        this.loadingScreen.appendChild(button);

        gsap.to(button, {
          duration: 0.3,
          opacity: 1,
          ease: "power2.out",
        });
      }
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  dispose() {
    this.killAllTweens();

    [
      ...this.playerHands.flat(),
      ...this.wallTiles,
      ...this.discardPiles.flat(),
    ].forEach((tile) => {
      if (tile.dispose) tile.dispose();
    });

    if (this.scene) {
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
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    Object.values(this.tileTextures).forEach((texture) => {
      if (texture.dispose) texture.dispose();
    });

    console.log("게임 정리 완료");
  }
}

// 앱 시작
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM 로드 완료, 완전한 마작 게임 시작...");

  try {
    const app = new MahjongApp();

    window.mahjongApp = app;

    window.debugGame = () => {
      console.log("=== 게임 상태 ===");
      console.log("현재 턴:", app.playerNames[app.currentPlayerIndex]);
      console.log("게임 상태:", app.gameState);
      console.log("턴 수:", app.turnCount);
      console.log("남은 패:", app.wallTiles.length);

      app.playerHands.forEach((hand, index) => {
        console.log(
          `${app.playerNames[index]} 손패:`,
          hand.map((t) => t.toString())
        );
        console.log(
          `${app.playerNames[index]} 버린패:`,
          app.discardPiles[index].map((t) => t.toString())
        );
      });
    };

    window.addEventListener("beforeunload", () => {
      app.dispose();
    });

    console.log("🎮 디버깅 명령어:");
    console.log("- window.debugGame() : 전체 게임 상태 확인");
    console.log("- window.mahjongApp : 게임 인스턴스 접근");
  } catch (error) {
    console.error("앱 시작 실패:", error);

    const loadingText = document.getElementById("loading-text");
    const errorMessage = document.getElementById("error-message");

    if (loadingText) loadingText.textContent = "게임 시작 실패";
    if (errorMessage) {
      errorMessage.textContent = `오류: ${error.message}`;
      errorMessage.style.display = "block";
    }
  }
});
