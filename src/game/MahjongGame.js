// src/game/MahjongGame.js (간소화된 버전 - 게임 흐름만)
import { MahjongTile } from "./MahjongTile.js";
import { MahjongPlayer } from "./MahjongPlayer.js";
import { HandEvaluator } from "./HandEvaluator.js";
import { YakuChecker } from "./YakuChecker.js";
import { MahjongAI } from "./MahjongAI.js";
import * as THREE from "three";

export class MahjongGame {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;

    // 게임 상태
    this.gameState = "waiting";
    this.roundState = "ready";

    // 게임 설정
    this.settings = {
      playerCount: 4,
      targetScore: 25000,
      startingScore: 25000,
    };

    // 플레이어들
    this.players = [];
    this.humanPlayer = null;
    this.currentPlayerIndex = 0;
    this.dealerIndex = 0;

    // 게임 진행 정보
    this.currentWind = "east";
    this.roundNumber = 1;
    this.turnCount = 0;

    // 패 관련
    this.wallTiles = [];
    this.discardPiles = [[], [], [], []];
    this.remainingTiles = 70;

    // 시스템들
    this.handEvaluator = new HandEvaluator();
    this.yakuChecker = new YakuChecker();
    this.aiPlayers = [];

    // 콜백들
    this.onGameStateChanged = null;
    this.onPlayerTurn = null;
    this.onTileDiscarded = null;

    this.setupPositions();
  }

  async init() {
    console.log("마작 게임 초기화 중...");

    this.createPlayers();
    this.initializeAI();
    this.createInitialWall();

    console.log("마작 게임 초기화 완료");
  }

  setupPositions() {
    // 올바른 마작 플레이어 위치 (반시계방향: East → South → West → North)
    this.playerPositions = [
      // 0: East (하단, 인간 플레이어)
      { hand: { x: 0, y: 0.35, z: 4.8 }, discard: { x: 0, y: 0.05, z: 1.5 } },
      // 1: South (우측)
      { hand: { x: 4.8, y: 0.35, z: 0 }, discard: { x: 1.5, y: 0.05, z: 0 } },
      // 2: West (상단)
      { hand: { x: 0, y: 0.35, z: -4.8 }, discard: { x: 0, y: 0.05, z: -1.5 } },
      // 3: North (좌측)
      { hand: { x: -4.8, y: 0.35, z: 0 }, discard: { x: -1.5, y: 0.05, z: 0 } },
    ];
  }

  createPlayers() {
    const winds = ["east", "south", "west", "north"];
    const aiNames = ["AI 남", "AI 서", "AI 북"];

    for (let i = 0; i < this.settings.playerCount; i++) {
      const isHuman = i === 0;
      const name = isHuman ? "플레이어" : aiNames[i - 1];
      const wind = winds[i];

      const player = new MahjongPlayer(i, isHuman, name, wind);
      player.score = this.settings.startingScore;
      player.position = this.playerPositions[i];

      this.players.push(player);

      if (isHuman) {
        this.humanPlayer = player;
      }
    }
  }

  initializeAI() {
    const difficulties = ["normal", "hard", "normal"];
    for (let i = 1; i < this.settings.playerCount; i++) {
      const ai = new MahjongAI(difficulties[i - 1], this);
      this.aiPlayers.push(ai);
    }
  }

  createInitialWall() {
    this.wallTiles = [];

    // 136장의 패 생성
    const tileTypes = [
      ...Array(4)
        .fill()
        .flatMap(() =>
          Array.from({ length: 9 }, (_, i) => ({ type: "man", number: i + 1 }))
        ),
      ...Array(4)
        .fill()
        .flatMap(() =>
          Array.from({ length: 9 }, (_, i) => ({ type: "pin", number: i + 1 }))
        ),
      ...Array(4)
        .fill()
        .flatMap(() =>
          Array.from({ length: 9 }, (_, i) => ({ type: "sou", number: i + 1 }))
        ),
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

    // 화면 밖에 패들을 생성
    tileTypes.forEach((tileData) => {
      const tile = new MahjongTile(
        tileData.type,
        tileData.number,
        this.sceneManager,
        new THREE.Vector3(-20, 0.2, 0)
      );
      tile.owner = "wall";
      this.wallTiles.push(tile);
    });

    // 배열 섞기
    this.shuffleArray(this.wallTiles);
    console.log(`패산 생성 완료: ${this.wallTiles.length}장`);
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  async startNewGame() {
    console.log("새 게임 시작");

    this.gameState = "playing";
    this.currentPlayerIndex = this.dealerIndex;
    this.turnCount = 0;

    // 플레이어 초기화
    this.players.forEach((player) => {
      player.score = this.settings.startingScore;
      player.resetForNewGame();
    });

    await this.startNewRound();
  }

  async startNewRound() {
    console.log(`${this.currentWind} ${this.roundNumber}국 시작`);

    this.roundState = "playing";
    this.players.forEach((player) => player.resetForNewRound());

    // 각 플레이어에게 14장씩 즉시 배분
    await this.distributeInitialHands();

    this.startPlayerTurn();
    this.updateGameState();
  }

  async distributeInitialHands() {
    // 각 플레이어에게 14장씩 할당하고 MahjongPlayer가 배치 처리
    for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
      const player = this.players[playerIndex];

      // 14장 할당
      for (let i = 0; i < 14; i++) {
        if (this.wallTiles.length === 0) break;
        const tile = this.wallTiles.shift();
        tile.owner = `player${playerIndex}`;
        player.addTile(tile);
      }

      // MahjongPlayer의 arrangeHand 메서드 사용
      await player.arrangeHand(this.sceneManager);
    }

    this.remainingTiles = this.wallTiles.length;
    console.log(`손패 배분 완료. 남은 패: ${this.remainingTiles}장`);
  }

  startPlayerTurn() {
    console.log(`${this.players[this.currentPlayerIndex].name}의 턴`);
    this.turnCount++;

    if (this.onPlayerTurn) {
      this.onPlayerTurn(this.currentPlayerIndex);
    }

    if (this.currentPlayerIndex === 0) {
      this.startHumanPlayerTurn();
    } else {
      this.startAIPlayerTurn();
    }
  }

  startHumanPlayerTurn() {
    console.log("인간 플레이어 턴: 패를 선택하여 버리세요");
  }

  async startAIPlayerTurn() {
    const playerIndex = this.currentPlayerIndex;
    const player = this.players[playerIndex];

    // AI 사고 시간
    await this.delay(1000 + Math.random() * 1500);

    // AI가 패 선택하여 버리기
    if (player.hand.length > 0) {
      const randomIndex = Math.floor(Math.random() * player.hand.length);
      const tileToDiscard = player.hand[randomIndex];
      await this.handleDiscard(playerIndex, tileToDiscard);
    }
  }

  async handleDiscard(playerIndex, tile) {
    const player = this.players[playerIndex];

    // 손패에서 제거
    const tileIndex = player.hand.indexOf(tile);
    if (tileIndex === -1) return;

    player.removeTile(tile);
    this.discardPiles[playerIndex].push(tile);

    // MahjongTile의 discardWithRule 메서드 사용 (마작룰 적용)
    const discardPosition = this.getDiscardPosition(
      playerIndex,
      this.discardPiles[playerIndex].length - 1
    );
    await tile.discardWithRule(discardPosition, playerIndex);

    // 전체 버린패 재정렬
    await this.reorganizeDiscardPile(playerIndex);

    // MahjongPlayer의 arrangeHand로 손패 재정렬
    await player.arrangeHand(this.sceneManager);

    // 다음 턴
    await this.delay(500);
    this.nextTurn();
  }

  getDiscardPosition(playerIndex, discardIndex) {
    const tileWidth = 0.5;
    const tilesPerRow = 6;
    const row = Math.floor(discardIndex / tilesPerRow);
    const col = discardIndex % tilesPerRow;

    switch (playerIndex) {
      case 0: // East (플레이어) - 하단 중앙에서 위로
        return new THREE.Vector3(
          (col - (tilesPerRow - 1) / 2) * tileWidth,
          0.05,
          1.5 + row * 0.4
        );
      case 1: // South (우측) - 우측 중앙에서 왼쪽으로
        return new THREE.Vector3(
          1.5 - row * 0.4,
          0.05,
          (col - (tilesPerRow - 1) / 2) * tileWidth
        );
      case 2: // West (상단) - 상단 중앙에서 아래로
        return new THREE.Vector3(
          -(col - (tilesPerRow - 1) / 2) * tileWidth,
          0.05,
          -1.5 - row * 0.4
        );
      case 3: // North (좌측) - 좌측 중앙에서 오른쪽으로
        return new THREE.Vector3(
          -1.5 + row * 0.4,
          0.05,
          -(col - (tilesPerRow - 1) / 2) * tileWidth
        );
    }
  }

  async reorganizeDiscardPile(playerIndex) {
    const discardPile = this.discardPiles[playerIndex];

    // 각 타일의 reorganize 메서드 사용
    const reorganizePromises = discardPile.map((tile, index) => {
      const correctPosition = this.getDiscardPosition(playerIndex, index);
      return tile.reorganize(correctPosition);
    });

    await Promise.all(reorganizePromises);
  }

  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 4;

    if (this.wallTiles.length > 0) {
      const newTile = this.wallTiles.shift();
      newTile.owner = `player${this.currentPlayerIndex}`;
      this.players[this.currentPlayerIndex].addTile(newTile);
      this.remainingTiles = this.wallTiles.length;

      // 새 패 배치 후 턴 시작
      this.players[this.currentPlayerIndex]
        .arrangeHand(this.sceneManager)
        .then(() => {
          this.startPlayerTurn();
        });

      this.updateGameState();
    } else {
      this.handleGameDraw();
    }
  }

  async handleGameDraw() {
    console.log("유국 (패산 고갈)");
    this.gameState = "roundEnd";
  }

  // === 이벤트 핸들러 ===

  onTileDiscarded = (tile) => {
    if (this.currentPlayerIndex !== 0 || this.gameState !== "playing") {
      console.log("플레이어 턴이 아닙니다");
      return;
    }

    if (!this.humanPlayer.hand.includes(tile)) {
      console.log("손패에 없는 타일입니다");
      return;
    }

    this.handleDiscard(0, tile);
  };

  // === 유틸리티 ===

  updateGameState() {
    if (this.onGameStateChanged) {
      this.onGameStateChanged(this.getGameState());
    }
  }

  getGameState() {
    return {
      gameState: this.gameState,
      currentPlayerIndex: this.currentPlayerIndex,
      remainingTiles: this.remainingTiles,
      turnCount: this.turnCount,
      players: this.players.map((player) => ({
        name: player.name,
        score: player.score,
        handCount: player.hand.length,
        discardCount: this.discardPiles[player.index].length,
      })),
    };
  }

  getDebugInfo() {
    return {
      gameState: this.getGameState(),
      humanPlayerHand: this.humanPlayer
        ? this.humanPlayer.hand.map((tile) => tile.toString())
        : [],
      wallTilesCount: this.wallTiles.length,
      currentPlayer: this.players[this.currentPlayerIndex].name,
    };
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  update() {
    // 매 프레임 업데이트 (필요시 확장)
  }

  dispose() {
    // 정리 작업
    this.aiPlayers.forEach((ai) => {
      if (ai.dispose) ai.dispose();
    });

    this.players.forEach((player) => {
      player.hand.forEach((tile) => {
        if (tile.dispose) tile.dispose();
      });
    });

    this.discardPiles.forEach((pile) => {
      pile.forEach((tile) => {
        if (tile.dispose) tile.dispose();
      });
    });

    this.wallTiles.forEach((tile) => {
      if (tile.dispose) tile.dispose();
    });

    console.log("마작 게임 정리 완료");
  }
}
