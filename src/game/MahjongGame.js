// src/game/MahjongGame.js (패 관리 부분만 - 간단한 버전)
import { MahjongTile } from "./MahjongTile.js";
import { MahjongPlayer } from "./MahjongPlayer.js";
import { HandEvaluator } from "./HandEvaluator.js";
import { YakuChecker } from "./YakuChecker.js";
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

    // 패 관리 (TileManager는 init에서 생성)
    this.tileManager = null;
    this.wallTiles = [];
    this.discardPiles = [[], [], [], []]; // 각 플레이어별 버린패

    // 시스템들
    this.handEvaluator = new HandEvaluator();
    this.yakuChecker = new YakuChecker();

    // 콜백들
    this._onGameStateChanged = null;
    this._onPlayerTurn = null;
    this._onRoundEnd = null;

    // 디버그 모드
    this.debugMode = true;
  }

  // 콜백 setter/getter
  set onGameStateChanged(callback) {
    this._onGameStateChanged = callback;
  }
  get onGameStateChanged() {
    return this._onGameStateChanged;
  }
  set onPlayerTurn(callback) {
    this._onPlayerTurn = callback;
  }
  get onPlayerTurn() {
    return this._onPlayerTurn;
  }
  set onRoundEnd(callback) {
    this._onRoundEnd = callback;
  }
  get onRoundEnd() {
    return this._onRoundEnd;
  }

  async init() {
    console.log("🀄 마작 게임 초기화 중...");

    // TileManager 동적 생성
    try {
      const { TileManager } = await import("./TileManager.js");
      this.tileManager = new TileManager(this.sceneManager);
      console.log("✅ TileManager 생성 완료");
    } catch (error) {
      console.error("❌ TileManager 생성 실패:", error);
      // fallback: TileManager 없이 진행
      this.tileManager = {
        arrangePlayerHand: () => console.log("TileManager 없음 - 패 배치 스킵"),
        arrangeDiscardedTiles: () =>
          console.log("TileManager 없음 - 버린패 배치 스킵"),
        setDebugMode: () => {},
        validateTilePositions: () => ({ issues: [] }),
        addTileToPlayerHand: (playerIndex, tile, handTiles) =>
          handTiles.push(tile),
        addTileToDiscardPile: (playerIndex, tile, discardTiles) =>
          discardTiles.push(tile),
        removeTileFromHand: (tile, handTiles) => {
          const index = handTiles.indexOf(tile);
          return index !== -1 ? handTiles.splice(index, 1)[0] : null;
        },
      };
    }

    this.createPlayers();
    this.createInitialWall();

    // 테스트 모드로 패 배치 확인
    if (this.debugMode && this.tileManager.testAllLayouts) {
      console.log("=== 패 배치 테스트 모드 ===");
      this.tileManager.testAllLayouts();
    }

    console.log("✅ 마작 게임 초기화 완료");
  }

  createPlayers() {
    const winds = ["east", "south", "west", "north"];
    const names = ["플레이어", "AI 남", "AI 서", "AI 북"];

    for (let i = 0; i < this.settings.playerCount; i++) {
      const isHuman = i === 0;
      const player = new MahjongPlayer(i, isHuman, names[i], winds[i]);
      player.score = this.settings.startingScore;

      this.players.push(player);

      if (isHuman) {
        this.humanPlayer = player;
      }
    }

    console.log(
      "✅ 플레이어 생성 완료:",
      this.players.map((p) => p.name)
    );
  }

  createInitialWall() {
    this.wallTiles = [];

    // 136장의 패 생성
    const tileTypes = [
      // 만수패 (1-9, 각 4장)
      ...Array(4)
        .fill()
        .flatMap(() =>
          Array.from({ length: 9 }, (_, i) => ({ type: "man", number: i + 1 }))
        ),
      // 통수패 (1-9, 각 4장)
      ...Array(4)
        .fill()
        .flatMap(() =>
          Array.from({ length: 9 }, (_, i) => ({ type: "pin", number: i + 1 }))
        ),
      // 삭수패 (1-9, 각 4장)
      ...Array(4)
        .fill()
        .flatMap(() =>
          Array.from({ length: 9 }, (_, i) => ({ type: "sou", number: i + 1 }))
        ),
      // 자패 (동남서북백발중, 각 4장)
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

    // 화면 밖에 패들을 생성 (나중에 배치)
    tileTypes.forEach((tileData, index) => {
      const tile = new MahjongTile(
        tileData.type,
        tileData.number,
        this.sceneManager,
        new THREE.Vector3(-20 - (index % 10), 0.2, Math.floor(index / 10)) // 임시 위치
      );
      tile.owner = "wall";
      this.wallTiles.push(tile);
    });

    // 배열 섞기
    this.shuffleArray(this.wallTiles);
    console.log(`✅ 패산 생성 완료: ${this.wallTiles.length}장`);
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  async startNewGame() {
    console.log("🎮 새 게임 시작");

    this.gameState = "playing";
    this.currentPlayerIndex = this.dealerIndex;

    // 플레이어 초기화
    this.players.forEach((player) => {
      player.score = this.settings.startingScore;
      player.resetForNewGame();
    });

    await this.startNewRound();
  }

  async startNewRound() {
    console.log(`🀄 라운드 시작`);

    this.roundState = "playing";
    this.players.forEach((player) => player.resetForNewRound());

    // 각 플레이어에게 패 배분
    await this.distributeInitialHands();

    // 패 배치 (TileManager 사용)
    this.arrangeAllPlayerHands();

    this.updateGameState();
  }

  async distributeInitialHands() {
    // 각 플레이어에게 13장씩 할당 (동가는 14장)
    for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
      const player = this.players[playerIndex];
      const isDealer = playerIndex === this.dealerIndex;
      const handSize = isDealer ? 14 : 13;

      // 패 할당
      for (let i = 0; i < handSize; i++) {
        if (this.wallTiles.length === 0) break;
        const tile = this.wallTiles.shift();
        tile.owner = `player${playerIndex}`;
        player.addTile(tile);
      }

      console.log(`${player.name}: ${player.hand.length}장 할당`);
    }

    console.log(`✅ 손패 배분 완료. 남은 패: ${this.wallTiles.length}장`);
  }

  arrangeAllPlayerHands() {
    console.log("=== 모든 플레이어 손패 배치 (TileManager 사용) ===");

    this.players.forEach((player, index) => {
      // 패 정렬
      player.sortHand();

      // TileManager로 배치 (기존 player.arrangeHand 대신)
      this.tileManager.arrangePlayerHand(index, player.hand);

      // 검증
      const validation = this.tileManager.validateTilePositions(
        index,
        player.hand,
        "hand"
      );
      if (validation.issues.length > 0) {
        console.warn(`플레이어 ${index} 손패 배치 문제:`, validation.issues);
      } else {
        console.log(`✅ 플레이어 ${index} (${player.name}) 손패 배치 성공`);
      }
    });

    console.log("✅ 모든 플레이어 손패 배치 완료");
  }

  // === 패 버리기 처리 ===

  async handleDiscard(playerIndex, tile) {
    const player = this.players[playerIndex];

    console.log(`${player.name}이 ${tile.toString()}을(를) 버립니다.`);

    // 손패에서 제거
    const removedTile = this.tileManager.removeTileFromHand(tile, player.hand);
    if (!removedTile) {
      console.error("손패에서 타일을 찾을 수 없습니다:", tile.toString());
      return;
    }

    // 버린패 더미에 추가
    this.tileManager.addTileToDiscardPile(
      playerIndex,
      tile,
      this.discardPiles[playerIndex]
    );

    // 손패 재배치
    this.tileManager.arrangePlayerHand(playerIndex, player.hand);

    // 다음 턴
    this.nextTurn();
  }

  nextTurn() {
    // 정순 플레이 (0 → 1 → 2 → 3 → 0...)
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 4;

    if (this.wallTiles.length > 0) {
      this.startPlayerTurn();
      this.updateGameState();
    } else {
      this.handleGameDraw();
    }
  }

  startPlayerTurn() {
    const currentPlayer = this.players[this.currentPlayerIndex];
    console.log(`${currentPlayer.name}의 턴`);

    if (this._onPlayerTurn) {
      this._onPlayerTurn(this.currentPlayerIndex);
    }

    // 패 뽑기 (13장인 경우)
    if (currentPlayer.hand.length === 13) {
      this.drawTileForPlayer(this.currentPlayerIndex);
    }

    // AI 플레이어 자동 진행
    if (this.currentPlayerIndex !== 0) {
      setTimeout(() => this.handleAITurn(), 1000);
    }
  }

  drawTileForPlayer(playerIndex) {
    if (this.wallTiles.length === 0) {
      this.handleGameDraw();
      return;
    }

    const player = this.players[playerIndex];
    const newTile = this.wallTiles.shift();
    newTile.owner = `player${playerIndex}`;

    // 손패에 추가하고 재배치
    this.tileManager.addTileToPlayerHand(playerIndex, newTile, player.hand);

    console.log(
      `${player.name}이 패를 뽑았습니다. (남은 패: ${this.wallTiles.length}장)`
    );
    this.updateGameState();
  }

  handleAITurn() {
    const playerIndex = this.currentPlayerIndex;
    const player = this.players[playerIndex];

    if (player.hand.length > 13) {
      // 랜덤하게 패 선택해서 버리기
      const randomIndex = Math.floor(Math.random() * player.hand.length);
      const tileToDiscard = player.hand[randomIndex];
      this.handleDiscard(playerIndex, tileToDiscard);
    }
  }

  async handleGameDraw() {
    console.log("🔚 유국 (패산 고갈)");
    this.gameState = "roundEnd";
  }

  // === 디버그 및 테스트 메서드들 ===

  // 특정 플레이어의 패 배치 테스트
  testPlayerTileLayout(playerIndex) {
    console.log(`=== 플레이어 ${playerIndex} 패 배치 테스트 ===`);

    const player = this.players[playerIndex];
    if (!player) {
      console.error("플레이어를 찾을 수 없습니다.");
      return;
    }

    console.log(
      `플레이어 정보: ${player.name} (${player.isHuman ? "인간" : "AI"})`
    );
    console.log(`손패: ${player.hand.length}장`);
    console.log(`버린패: ${this.discardPiles[playerIndex].length}장`);

    // 손패 재배치
    this.tileManager.arrangePlayerHand(playerIndex, player.hand);

    // 버린패 재배치
    if (this.discardPiles[playerIndex].length > 0) {
      this.tileManager.arrangeDiscardedTiles(
        playerIndex,
        this.discardPiles[playerIndex]
      );
    }

    // 검증
    const handValidation = this.tileManager.validateTilePositions(
      playerIndex,
      player.hand,
      "hand"
    );
    const discardValidation = this.tileManager.validateTilePositions(
      playerIndex,
      this.discardPiles[playerIndex],
      "discard"
    );

    console.log(
      "손패 검증:",
      handValidation.issues.length === 0 ? "✅ 통과" : "❌ 실패",
      handValidation.issues
    );
    console.log(
      "버린패 검증:",
      discardValidation.issues.length === 0 ? "✅ 통과" : "❌ 실패",
      discardValidation.issues
    );
  }

  // 모든 플레이어 패 배치 테스트
  testAllTileLayouts() {
    console.log("=== 전체 플레이어 패 배치 테스트 ===");
    for (let i = 0; i < 4; i++) {
      this.testPlayerTileLayout(i);
      console.log("");
    }
  }

  // 버린패 시뮬레이션
  simulateDiscards(count = 6) {
    console.log(`=== 버린패 시뮬레이션 (${count}장) ===`);

    for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
      const player = this.players[playerIndex];

      for (let i = 0; i < Math.min(count, player.hand.length); i++) {
        if (player.hand.length === 0) break;

        // 첫 번째 패를 버리기
        const tileToDiscard = player.hand[0];
        this.tileManager.removeTileFromHand(tileToDiscard, player.hand);
        this.tileManager.addTileToDiscardPile(
          playerIndex,
          tileToDiscard,
          this.discardPiles[playerIndex]
        );
      }

      // 손패 재배치
      this.tileManager.arrangePlayerHand(playerIndex, player.hand);

      console.log(
        `${player.name}: 손패 ${player.hand.length}장, 버린패 ${this.discardPiles[playerIndex].length}장`
      );
    }

    console.log("✅ 버린패 시뮬레이션 완료");
  }

  // 즉시 패 배치 (애니메이션 없이)
  instantArrangeAll() {
    console.log("=== 즉시 패 배치 ===");
    this.arrangeAllPlayerHands();

    // 버린패도 배치
    for (let i = 0; i < 4; i++) {
      if (this.discardPiles[i].length > 0) {
        this.tileManager.arrangeDiscardedTiles(i, this.discardPiles[i]);
      }
    }

    console.log("✅ 즉시 패 배치 완료");
  }

  // === 유틸리티 ===

  updateGameState() {
    if (this._onGameStateChanged) {
      this._onGameStateChanged(this.getGameState());
    }
  }

  getGameState() {
    return {
      gameState: this.gameState,
      currentPlayerIndex: this.currentPlayerIndex,
      remainingTiles: this.wallTiles.length,
      players: this.players.map((player, index) => ({
        name: player.name,
        score: player.score,
        handCount: player.hand.length,
        discardCount: this.discardPiles[index].length,
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
      discardCounts: this.discardPiles.map((pile) => pile.length),
    };
  }

  // 타일 버리기 핸들러 (외부 이벤트용)
  handleTileDiscard(tile) {
    console.log("게임: 타일 버리기 요청 받음:", tile.toString());
    return this.handleDiscard(0, tile);
  }

  get onTileDiscarded() {
    return this.handleTileDiscard.bind(this);
  }

  update() {
    // 매 프레임 업데이트 (필요시 확장)
  }

  dispose() {
    console.log("게임 정리 중...");

    // 모든 타일 정리
    [
      ...this.wallTiles,
      ...this.players.flatMap((p) => p.hand),
      ...this.discardPiles.flat(),
    ].forEach((tile) => {
      if (tile.dispose) tile.dispose();
    });

    // TileManager 정리
    if (this.tileManager) {
      this.tileManager.dispose();
    }

    console.log("✅ 게임 정리 완료");
  }
}
