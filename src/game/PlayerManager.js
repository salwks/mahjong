// src/game/PlayerManager.js - 4개의 PlayerTemplate 관리
import * as THREE from "three";
import PlayerTemplate from "./PlayerTemplate.js";
import { MahjongTile } from "./MahjongTile.js";

export class PlayerManager {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;

    // 4명의 플레이어 템플릿
    this.players = [];

    // 공통 패산
    this.wallTiles = [];

    // 게임 상태
    this.currentPlayerIndex = 0;
    this.isReady = false;
  }

  // === 초기화 ===
  async init() {
    console.log("🎮 PlayerManager 초기화 시작");

    // 4명의 플레이어 생성
    this.createPlayers();

    // 패산 생성
    this.createWallTiles();

    this.isReady = true;
    console.log("✅ PlayerManager 초기화 완료");
  }

  // === 4명의 플레이어 생성 ===
  createPlayers() {
    // 4명의 위치와 회전 설정
    const playerConfigs = [
      { position: new THREE.Vector3(0, 0.35, 5.0), rotation: 0 }, // 아래 (0도)
      { position: new THREE.Vector3(-5.0, 0.35, 0), rotation: Math.PI / 2 }, // 왼쪽 (90도)
      { position: new THREE.Vector3(0, 0.35, -5.0), rotation: Math.PI }, // 위 (180도)
      { position: new THREE.Vector3(5.0, 0.35, 0), rotation: -Math.PI / 2 }, // 오른쪽 (270도)
    ];

    for (let i = 0; i < 4; i++) {
      const config = playerConfigs[i];
      const player = new PlayerTemplate(
        this.sceneManager,
        i,
        config.position,
        config.rotation
      );

      this.players.push(player);
      console.log(
        `플레이어 ${i} 생성: 위치(${config.position.x}, ${
          config.position.z
        }), 회전 ${((config.rotation * 180) / Math.PI).toFixed(0)}도`
      );
    }

    console.log("✅ 4명의 플레이어 생성 완료");
  }

  // === 패산 생성 ===
  createWallTiles() {
    this.wallTiles = [];

    // 만수패 (1-9, 각 4장)
    for (let num = 1; num <= 9; num++) {
      for (let i = 0; i < 4; i++) {
        this.wallTiles.push(this.createTile("man", num));
      }
    }

    // 통수패 (1-9, 각 4장)
    for (let num = 1; num <= 9; num++) {
      for (let i = 0; i < 4; i++) {
        this.wallTiles.push(this.createTile("pin", num));
      }
    }

    // 삭수패 (1-9, 각 4장)
    for (let num = 1; num <= 9; num++) {
      for (let i = 0; i < 4; i++) {
        this.wallTiles.push(this.createTile("sou", num));
      }
    }

    // 자패 (동남서북백발중, 각 4장)
    const honors = ["east", "south", "west", "north", "white", "green", "red"];
    honors.forEach((honor) => {
      for (let i = 0; i < 4; i++) {
        this.wallTiles.push(this.createTile("honor", honor));
      }
    });

    // 패 섞기
    this.shuffleArray(this.wallTiles);

    console.log(`✅ 패산 생성 완료: ${this.wallTiles.length}장`);
  }

  createTile(type, number) {
    return new MahjongTile(
      type,
      number,
      this.sceneManager,
      new THREE.Vector3(-50, 0, 0) // 화면 밖 임시 위치
    );
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // === 게임 시작 ===
  async startGame() {
    console.log("🎮 게임 시작");

    // 각 플레이어에게 14장씩 배분
    this.distributeInitialHands();

    // 모든 플레이어 배치
    this.arrangeAllPlayers();

    console.log("✅ 게임 시작 완료");
  }

  // === 초기 손패 배분 ===
  distributeInitialHands() {
    console.log("패 배분 시작...");

    for (let i = 0; i < 14; i++) {
      for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
        if (this.wallTiles.length > 0) {
          const tile = this.wallTiles.pop();
          this.players[playerIndex].addTile(tile);
        }
      }
    }

    console.log(`✅ 패 배분 완료. 남은 패: ${this.wallTiles.length}장`);
  }

  // === 모든 플레이어 배치 ===
  arrangeAllPlayers() {
    this.players.forEach((player, index) => {
      player.arrangeHand();
      player.arrangeDiscards();
      console.log(`플레이어 ${index} 배치 완료`);
    });
  }

  // === 특정 플레이어 가져오기 ===
  getPlayer(playerIndex) {
    return this.players[playerIndex];
  }

  // === 현재 플레이어 ===
  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  // === 다음 턴 ===
  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 4;
    console.log(`턴 변경: 플레이어 ${this.currentPlayerIndex}`);
    return this.currentPlayerIndex;
  }

  // === 패 뽑기 ===
  drawTile(playerIndex) {
    if (this.wallTiles.length === 0) {
      console.log("패산이 고갈되었습니다!");
      return null;
    }

    const tile = this.wallTiles.pop();
    this.players[playerIndex].addTile(tile);
    this.players[playerIndex].arrangeHand();

    console.log(
      `플레이어 ${playerIndex} 패 뽑기: ${tile.toString()}, 남은 패: ${
        this.wallTiles.length
      }장`
    );
    return tile;
  }

  // === 패 버리기 ===
  discardTile(playerIndex, tile) {
    const player = this.players[playerIndex];
    const success = player.discardTile(tile);

    if (success) {
      console.log(`플레이어 ${playerIndex} 패 버리기 성공: ${tile.toString()}`);
    }

    return success;
  }

  // === 패 선택 ===
  selectTile(playerIndex, tile) {
    return this.players[playerIndex].selectTile(tile);
  }

  // === 전체 상태 ===
  getGameState() {
    return {
      currentPlayerIndex: this.currentPlayerIndex,
      wallCount: this.wallTiles.length,
      players: this.players.map((player) => player.getState()),
      isReady: this.isReady,
    };
  }

  // === 특정 플레이어 손패 정보 ===
  getPlayerHandInfo(playerIndex) {
    return this.players[playerIndex].getHandInfo();
  }

  // === 디버그 ===
  debugInfo() {
    console.log("=== PlayerManager 디버그 정보 ===");
    console.log(`현재 턴: 플레이어 ${this.currentPlayerIndex}`);
    console.log(`남은 패: ${this.wallTiles.length}장`);
    console.log("플레이어별 상태:");

    this.players.forEach((player, index) => {
      const state = player.getState();
      console.log(
        `  플레이어 ${index}: 손패 ${state.handCount}장, 버린패 ${state.discardCount}장, 회전 ${state.rotationDegrees}도`
      );
    });
  }

  // === 모든 플레이어 재배치 ===
  rearrangeAll() {
    this.players.forEach((player) => player.rearrange());
    console.log("✅ 모든 플레이어 재배치 완료");
  }

  // === 테스트용 메서드들 ===

  // 테스트 손패 생성 (플레이어 0만)
  generateTestHand() {
    const player0 = this.players[0];

    // 기존 손패 정리
    player0.handTiles.forEach((tile) => {
      if (tile.dispose) tile.dispose();
    });
    player0.handTiles = [];

    // 테스트 패 데이터
    const testData = [
      { type: "man", number: 1 },
      { type: "man", number: 2 },
      { type: "man", number: 3 },
      { type: "pin", number: 4 },
      { type: "pin", number: 5 },
      { type: "pin", number: 6 },
      { type: "sou", number: 7 },
      { type: "sou", number: 8 },
      { type: "sou", number: 9 },
      { type: "honor", number: "east" },
      { type: "honor", number: "south" },
      { type: "honor", number: "white" },
      { type: "honor", number: "red" },
      { type: "honor", number: "green" },
    ];

    // 테스트 패 생성
    testData.forEach((data) => {
      const tile = this.createTile(data.type, data.number);
      player0.addTile(tile);
    });

    player0.arrangeHand();
    console.log("✅ 플레이어 0 테스트 손패 생성 완료");
  }

  // 위치 테스트
  testPlayerPositions() {
    console.log("=== 플레이어 위치 테스트 ===");
    this.players.forEach((player, index) => {
      const state = player.getState();
      console.log(
        `플레이어 ${index}: 위치 (${state.position[0].toFixed(
          2
        )}, ${state.position[2].toFixed(2)}), 회전 ${state.rotationDegrees}도`
      );
    });
  }

  // === 정리 ===
  dispose() {
    console.log("PlayerManager 정리 중...");

    // 모든 플레이어 정리
    this.players.forEach((player) => player.dispose());
    this.players = [];

    // 패산 정리
    this.wallTiles.forEach((tile) => {
      if (tile.dispose) tile.dispose();
    });
    this.wallTiles = [];

    this.currentPlayerIndex = 0;
    this.isReady = false;

    console.log("✅ PlayerManager 정리 완료");
  }
}
