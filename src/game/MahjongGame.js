// src/game/MahjongGame.js (수정된 버전 - 패 배분 문제 해결)
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

      // 겹침 문제 사전 해결
      this.tileManager.fixOverlappingTiles();

      console.log("✅ TileManager 생성 완료");
    } catch (error) {
      console.error("❌ TileManager 생성 실패:", error);
      this.tileManager = this.createFallbackTileManager();
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

  createFallbackTileManager() {
    return {
      arrangePlayerHand: (playerIndex, handTiles) => {
        console.log(
          `Fallback: 플레이어 ${playerIndex} 손패 ${handTiles.length}장 배치`
        );
        // 기본 위치에 배치
        const baseX = playerIndex * 3;
        handTiles.forEach((tile, index) => {
          tile.setPosition(baseX + index * 0.6, 0.35, 0);
        });
      },
      arrangeDiscardedTiles: (playerIndex, discardTiles) => {
        console.log(
          `Fallback: 플레이어 ${playerIndex} 버린패 ${discardTiles.length}장 배치`
        );
      },
      setDebugMode: () => {},
      validateTilePositions: () => ({ issues: [] }),
      addTileToPlayerHand: (playerIndex, tile, handTiles) => {
        handTiles.push(tile);
        this.arrangePlayerHand(playerIndex, handTiles);
      },
      addTileToDiscardPile: (playerIndex, tile, discardTiles) => {
        discardTiles.push(tile);
        this.arrangeDiscardedTiles(playerIndex, discardTiles);
      },
      removeTileFromHand: (tile, handTiles) => {
        const index = handTiles.indexOf(tile);
        return index !== -1 ? handTiles.splice(index, 1)[0] : null;
      },
      testAllLayouts: () => console.log("Fallback: 레이아웃 테스트 스킵"),
      fixOverlappingTiles: () => console.log("Fallback: 겹침 해결 스킵"),
    };
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

    // 각 플레이어에게 패 배분 (수정된 버전)
    await this.distributeInitialHands();

    // 패 배치 (TileManager 사용)
    this.arrangeAllPlayerHands();

    this.updateGameState();
  }

  async distributeInitialHands() {
    console.log("=== 패 배분 시작 ===");

    // 패산 충분한지 확인
    const requiredTiles = 4 * 13 + 1; // 각자 13장 + 동가 1장 추가
    if (this.wallTiles.length < requiredTiles) {
      console.error(
        `패산이 부족합니다. 필요: ${requiredTiles}, 현재: ${this.wallTiles.length}`
      );
      return;
    }

    // 각 플레이어에게 13장씩 할당
    for (let round = 0; round < 13; round++) {
      for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
        if (this.wallTiles.length === 0) {
          console.error("패산이 고갈되었습니다!");
          return;
        }

        const player = this.players[playerIndex];
        const tile = this.wallTiles.shift();
        tile.owner = `player${playerIndex}`;
        player.addTile(tile);
      }
    }

    // 동가에게 1장 추가 (총 14장)
    if (this.wallTiles.length > 0) {
      const dealerTile = this.wallTiles.shift();
      dealerTile.owner = `player${this.dealerIndex}`;
      this.players[this.dealerIndex].addTile(dealerTile);
    }

    // 배분 결과 확인
    this.players.forEach((player, index) => {
      console.log(`${player.name}: ${player.hand.length}장 할당`);
      if (player.hand.length === 0) {
        console.error(`⚠️ 플레이어 ${index}에게 패가 할당되지 않았습니다!`);
      }
    });

    console.log(`✅ 손패 배분 완료. 남은 패: ${this.wallTiles.length}장`);
  }

  arrangeAllPlayerHands() {
    console.log("=== 모든 플레이어 손패 배치 (TileManager 사용) ===");

    this.players.forEach((player, index) => {
      if (player.hand.length === 0) {
        console.warn(`플레이어 ${index}의 손패가 비어있습니다. 건너뜁니다.`);
        return;
      }

      // 패 정렬
      player.sortHand();

      // TileManager로 배치
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
        console.log(
          `✅ 플레이어 ${index} (${player.name}) 손패 배치 성공 - ${player.hand.length}장`
        );
      }

      // 회전 상태 확인 (디버그)
      if (this.debugMode && player.hand.length > 0) {
        const firstTile = player.hand[0];
        if (firstTile.mesh) {
          const yRotDeg = ((firstTile.mesh.rotation.y * 180) / Math.PI).toFixed(
            0
          );
          console.log(`  → 플레이어 ${index} 패 회전: ${yRotDeg}도`);
        }
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

    // 손패가 비어있으면 더미 데이터 생성
    if (player.hand.length === 0) {
      console.log("⚠️ 손패가 비어있어서 테스트 데이터를 생성합니다.");
      this.generateTestHand(playerIndex);
    }

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

    // 위치 정보 출력
    if (this.debugMode) {
      console.log("손패 위치 정보:");
      handValidation.positions.slice(0, 5).forEach((pos) => {
        console.log(
          `  ${pos.tile}: (${pos.position.x.toFixed(
            2
          )}, ${pos.position.z.toFixed(2)}) ${pos.rotationDegrees}도`
        );
      });
    }
  }

  // 테스트용 손패 생성
  generateTestHand(playerIndex) {
    const player = this.players[playerIndex];
    const testTiles = [];

    // 간단한 테스트 패 생성
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
    ];

    testData.forEach((data, index) => {
      const tile = new MahjongTile(
        data.type,
        data.number,
        this.sceneManager,
        new THREE.Vector3(-30 - index, 0.2, -10) // 임시 위치
      );
      tile.owner = `player${playerIndex}`;
      testTiles.push(tile);
    });

    player.hand = testTiles;
    console.log(
      `✅ 플레이어 ${playerIndex}에게 테스트 손패 ${testTiles.length}장 생성`
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

      // 손패가 없으면 테스트 패 생성
      if (player.hand.length === 0) {
        this.generateTestHand(playerIndex);
      }

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

    // 모든 플레이어가 패를 가지고 있는지 확인
    let emptyPlayers = 0;
    this.players.forEach((player, index) => {
      if (player.hand.length === 0) {
        console.log(`플레이어 ${index} 손패가 비어있어서 테스트 데이터 생성`);
        this.generateTestHand(index);
        emptyPlayers++;
      }
    });

    if (emptyPlayers > 0) {
      console.log(`${emptyPlayers}명의 플레이어에게 테스트 패 생성함`);
    }

    this.arrangeAllPlayerHands();

    // 버린패도 배치
    for (let i = 0; i < 4; i++) {
      if (this.discardPiles[i].length > 0) {
        this.tileManager.arrangeDiscardedTiles(i, this.discardPiles[i]);
      }
    }

    console.log("✅ 즉시 패 배치 완료");
  }

  // 겹침 문제 해결
  fixTileOverlapping() {
    console.log("=== 패 겹침 문제 해결 ===");

    if (this.tileManager.fixOverlappingTiles) {
      this.tileManager.fixOverlappingTiles();
    }

    // 모든 패 재배치
    this.instantArrangeAll();

    console.log("✅ 겹침 문제 해결 완료");
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
      playerHandCounts: this.players.map((player) => player.hand.length),
      tileManagerStatus: this.tileManager ? "활성" : "비활성",
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
