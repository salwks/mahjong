// src/game/MahjongGame.js - 완전한 버전 (단순한 연결만)
import { PlayerManager } from "./PlayerManager.js";

export class MahjongGame {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;

    // PlayerManager가 모든 걸 담당
    this.playerManager = null;

    // 게임 상태
    this.gameState = "waiting";
    this.isInitialized = false;

    // 콜백들 (UI 연결용)
    this._onGameStateChanged = null;
    this._onPlayerTurn = null;
    this._onRoundEnd = null;
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

  // === 초기화 ===
  async init() {
    console.log("🀄 MahjongGame 초기화 시작...");

    try {
      // PlayerManager 생성 및 초기화
      this.playerManager = new PlayerManager(this.sceneManager);
      await this.playerManager.init();

      this.isInitialized = true;
      console.log("✅ MahjongGame 초기화 완료");
    } catch (error) {
      console.error("❌ MahjongGame 초기화 실패:", error);
      throw error;
    }
  }

  // === 게임 시작 ===
  async startNewGame() {
    if (!this.isInitialized || !this.playerManager) {
      console.error("게임이 초기화되지 않았습니다.");
      return;
    }

    console.log("🎮 새 게임 시작");
    this.gameState = "playing";

    try {
      // PlayerManager에게 게임 시작 위임
      await this.playerManager.startGame();

      // UI 업데이트
      this.updateGameState();

      console.log("✅ 게임 시작 완료");
    } catch (error) {
      console.error("게임 시작 실패:", error);
      this.gameState = "error";
    }
  }

  // === 패 버리기 (PlayerManager에 위임) ===
  handleTileDiscard(tile) {
    if (!this.playerManager) {
      console.error("PlayerManager가 없습니다.");
      return false;
    }

    console.log("게임: 패 버리기 요청 받음:", tile.toString());

    // 현재 플레이어(0번)의 패 버리기
    const success = this.playerManager.discardTile(0, tile);

    if (success) {
      // 새 패 뽑기
      this.playerManager.drawTile(0);

      // UI 업데이트
      this.updateGameState();
    }

    return success;
  }

  // === 패 선택 (PlayerManager에 위임) ===
  handleTileSelect(tile) {
    if (!this.playerManager) {
      return false;
    }

    // 플레이어 0의 패 선택
    return this.playerManager.selectTile(0, tile);
  }

  // === UI 업데이트 ===
  updateGameState() {
    if (this._onGameStateChanged && this.playerManager) {
      const managerState = this.playerManager.getGameState();

      const gameState = {
        gameState: this.gameState,
        currentPlayerIndex: managerState.currentPlayerIndex,
        remainingTiles: managerState.wallCount,
        players: managerState.players.map((playerState, index) => ({
          name: index === 0 ? "플레이어" : `AI ${index}`,
          score: 25000,
          handCount: playerState.handCount,
          discardCount: playerState.discardCount,
          isCurrentPlayer: managerState.currentPlayerIndex === index,
        })),
      };

      this._onGameStateChanged(gameState);
    }
  }

  // === 게임 상태 정보 ===
  getGameState() {
    if (!this.playerManager) {
      return {
        gameState: this.gameState,
        isReady: false,
        error: "PlayerManager가 없습니다.",
      };
    }

    const managerState = this.playerManager.getGameState();

    return {
      gameState: this.gameState,
      currentPlayerIndex: managerState.currentPlayerIndex,
      remainingTiles: managerState.wallCount,
      players: managerState.players.map((playerState, index) => ({
        name: index === 0 ? "플레이어" : `AI ${index}`,
        score: 25000,
        handCount: playerState.handCount,
        discardCount: playerState.discardCount,
        isCurrentPlayer: managerState.currentPlayerIndex === index,
      })),
      isReady: managerState.isReady,
    };
  }

  // === 디버그 정보 ===
  getDebugInfo() {
    if (!this.playerManager) {
      return { error: "PlayerManager가 없습니다." };
    }

    const managerState = this.playerManager.getGameState();
    const player0Hand = this.playerManager.getPlayerHandInfo(0);

    return {
      gameState: this.gameState,
      isInitialized: this.isInitialized,
      playerManager: "활성",
      currentPlayerIndex: managerState.currentPlayerIndex,
      wallCount: managerState.wallCount,
      player0Hand: player0Hand.tiles,
      players: managerState.players.map((state, index) => ({
        playerIndex: index,
        handCount: state.handCount,
        discardCount: state.discardCount,
        position: state.position,
        rotationDegrees: state.rotationDegrees,
        isHuman: state.isHuman,
      })),
      isReady: managerState.isReady,
    };
  }

  // === 테스트/디버그 메서드들 ===

  // PlayerManager 디버그 호출
  debugPlayerManager() {
    if (this.playerManager) {
      this.playerManager.debugInfo();
    }
  }

  // 테스트 손패 생성
  generateTestHand() {
    if (this.playerManager) {
      this.playerManager.generateTestHand();
      this.updateGameState();
    }
  }

  // 플레이어 위치 테스트
  testPlayerPositions() {
    if (this.playerManager) {
      this.playerManager.testPlayerPositions();
    }
  }

  // 모든 플레이어 재배치
  rearrangeAll() {
    if (this.playerManager) {
      this.playerManager.rearrangeAll();
    }
  }

  // === 호환성 메서드들 (기존 코드와의 연결용) ===

  // 기존 이벤트 시스템과 연결
  get humanPlayer() {
    if (!this.playerManager) return null;

    const player0 = this.playerManager.getPlayer(0);
    return {
      hand: player0.handTiles || [],
      name: "플레이어",
      score: 25000,
      index: 0,
    };
  }

  get players() {
    if (!this.playerManager) return [];

    return [0, 1, 2, 3].map((index) => {
      const player = this.playerManager.getPlayer(index);
      return {
        hand: player.handTiles || [],
        name: index === 0 ? "플레이어" : `AI ${index}`,
        score: 25000,
        index: index,
        isHuman: index === 0,
      };
    });
  }

  get currentPlayerIndex() {
    return this.playerManager ? this.playerManager.currentPlayerIndex : 0;
  }

  get wallTiles() {
    return this.playerManager ? this.playerManager.wallTiles : [];
  }

  // 구버전 호환용
  handleDiscard(playerIndex, tile) {
    if (playerIndex === 0) {
      return this.handleTileDiscard(tile);
    } else {
      console.warn("현재는 플레이어 0만 지원합니다.");
      return false;
    }
  }

  arrangeAllPlayerHands() {
    this.rearrangeAll();
  }

  instantArrangeAll() {
    this.rearrangeAll();
  }

  // === 디버그 모드 (호환성) ===
  setDebugMode(enabled) {
    console.log(`게임 디버그 모드: ${enabled ? "활성화" : "비활성화"}`);
    // PlayerManager에 전달할 수 있음 (필요시)
  }

  // === 매 프레임 업데이트 ===
  update() {
    // 현재는 특별한 업데이트 로직 없음
    // 필요시 PlayerManager의 애니메이션 등을 여기서 호출
  }

  // === 정리 ===
  dispose() {
    console.log("MahjongGame 정리 중...");

    if (this.playerManager) {
      this.playerManager.dispose();
      this.playerManager = null;
    }

    this.gameState = "disposed";
    this.isInitialized = false;

    // 콜백 제거
    this._onGameStateChanged = null;
    this._onPlayerTurn = null;
    this._onRoundEnd = null;

    console.log("✅ MahjongGame 정리 완료");
  }
}
