// src/events/EventManager.js - 수정된 버전 (readonly 오류 해결)
export class EventManager {
  constructor(game, ui, touchController) {
    this.game = game;
    this.ui = ui;
    this.touchController = touchController;

    this.selectedTile = null;
    this.isDisposed = false;

    this.setupAllEvents();
  }

  setupAllEvents() {
    if (this.isDisposed) return;

    this.setupTouchEvents();
    this.setupUIEvents();
    this.setupGameEvents();
    this.setupKeyboardEvents();
  }

  // === 터치/마우스 이벤트 ===
  setupTouchEvents() {
    if (!this.touchController) return;

    // 화살표 함수 대신 bind 사용
    this.touchController.onTileSelected = this.handleTileSelected.bind(this);
    this.touchController.onTileDiscarded = this.handleTileDiscarded.bind(this);
    this.touchController.onGestureDetected = this.handleGesture.bind(this);
  }

  handleTileSelected(tile) {
    console.log("이벤트: 타일 선택됨", tile.toString());
    this.selectedTile = tile;
    if (this.ui && this.ui.updateSelectedTile) {
      this.ui.updateSelectedTile(tile);
    }
  }

  handleTileDiscarded(tile) {
    console.log("이벤트: 타일 버리기 요청", tile.toString());
    this.handleTileDiscard(tile);
  }

  handleGesture(gesture, tile, data) {
    if ((gesture === "swipe" && data === "up") || gesture === "doubletap") {
      this.handleTileDiscard(tile);
    }
  }

  // === UI 버튼 이벤트 ===
  setupUIEvents() {
    if (!this.ui) return;

    // 콜백 함수들을 bind로 연결
    this.ui.onDiscardClick = this.handleDiscardButtonClick.bind(this);
    this.ui.onRiichiClick = this.handleRiichi.bind(this);
    this.ui.onTsumoClick = this.handleTsumo.bind(this);
    this.ui.onRonClick = this.handleRon.bind(this);
    this.ui.onChiClick = this.handleChi.bind(this);
    this.ui.onPonClick = this.handlePon.bind(this);
    this.ui.onKanClick = this.handleKan.bind(this);
  }

  handleDiscardButtonClick() {
    if (this.selectedTile) {
      this.handleTileDiscard(this.selectedTile);
    } else if (this.ui && this.ui.showMessage) {
      this.ui.showMessage("버릴 패를 먼저 선택하세요", "warning");
    }
  }

  // === 게임 이벤트 ===
  setupGameEvents() {
    if (!this.game) return;

    // 게임 이벤트 콜백들
    if (this.game.onGameStateChanged !== undefined) {
      this.game.onGameStateChanged = this.handleGameStateChanged.bind(this);
    }

    if (this.game.onPlayerTurn !== undefined) {
      this.game.onPlayerTurn = this.handlePlayerTurn.bind(this);
    }

    if (this.game.onRoundEnd !== undefined) {
      this.game.onRoundEnd = this.handleRoundEnd.bind(this);
    }
  }

  handleGameStateChanged(state) {
    if (this.ui && this.ui.updateGameState) {
      this.ui.updateGameState(state);
    }
  }

  handlePlayerTurn(playerIndex) {
    if (!this.ui) return;

    if (this.ui.updatePlayerTurn) {
      this.ui.updatePlayerTurn(playerIndex);
    }

    if (playerIndex === 0) {
      if (this.ui.enablePlayerControls) {
        this.ui.enablePlayerControls();
      }
    } else {
      if (this.ui.disablePlayerControls) {
        this.ui.disablePlayerControls();
      }
    }
  }

  handleRoundEnd(result) {
    if (this.ui && this.ui.showRoundResult) {
      this.ui.showRoundResult(result);
    }
  }

  // === 키보드 이벤트 ===
  setupKeyboardEvents() {
    this.keyboardHandler = this.handleKeyboard.bind(this);
    document.addEventListener("keydown", this.keyboardHandler);
  }

  handleKeyboard(e) {
    if (!this.ui || !this.ui.isEnabled || !this.ui.isEnabled()) return;

    switch (e.code) {
      case "KeyD":
      case "Space":
        e.preventDefault();
        this.handleDiscardButtonClick();
        break;
      case "KeyR":
        e.preventDefault();
        this.handleRiichi();
        break;
      case "Escape":
        e.preventDefault();
        this.selectedTile = null;
        if (this.ui.updateSelectedTile) {
          this.ui.updateSelectedTile(null);
        }
        break;
    }
  }

  // === 게임 액션 처리 ===
  handleTileDiscard(tile) {
    if (!tile || !this.game) return;

    console.log("이벤트: 패 버리기 처리", tile.toString());

    // 게임 상태 확인
    if (
      this.game.currentPlayerIndex !== 0 ||
      this.game.gameState !== "playing"
    ) {
      console.log("현재 플레이어 턴이 아닙니다");
      return;
    }

    // 손패에 있는지 확인
    if (!this.game.humanPlayer || !this.game.humanPlayer.hand.includes(tile)) {
      console.log("손패에 없는 타일입니다");
      return;
    }

    // 게임 로직 호출
    try {
      if (this.game.handleDiscard) {
        this.game.handleDiscard(0, tile);
      } else if (this.game.handleTileDiscard) {
        this.game.handleTileDiscard(tile);
      }

      // UI 업데이트
      this.selectedTile = null;
      if (this.ui && this.ui.updateSelectedTile) {
        this.ui.updateSelectedTile(null);
      }
    } catch (error) {
      console.error("패 버리기 처리 중 오류:", error);
    }
  }

  handleRiichi() {
    if (!this.game || !this.game.humanPlayer) return;

    // 리치 가능한지 확인
    const canRiichi =
      this.game.humanPlayer.score >= 1000 &&
      this.game.humanPlayer.melds.length === 0;

    if (canRiichi && this.ui && this.ui.showRiichiConfirmation) {
      this.ui.showRiichiConfirmation(() => {
        if (this.game.humanPlayer) {
          this.game.humanPlayer.wantToRiichi = true;
        }
        if (this.ui && this.ui.showMessage) {
          this.ui.showMessage("리치를 선언합니다. 패를 버리세요", "info");
        }
      });
    } else if (this.ui && this.ui.showMessage) {
      this.ui.showMessage("리치를 선언할 수 없습니다", "warning");
    }
  }

  handleTsumo() {
    if (!this.game || !this.game.humanPlayer) return;

    // 쯔모 가능한지 확인
    const canTsumo =
      this.game.handEvaluator &&
      this.game.handEvaluator.isWinningHand &&
      this.game.handEvaluator.isWinningHand(this.game.humanPlayer.hand);

    if (canTsumo && this.game.handleTsumo) {
      this.game.handleTsumo(0);
    }
  }

  handleRon() {
    // 론 처리 로직
    if (this.game && this.game.handleRon) {
      this.game.handleRon(0);
    }
  }

  handleChi() {
    // 치 처리 로직
    if (this.ui && this.ui.showChiOptions) {
      this.ui.showChiOptions();
    }
  }

  handlePon() {
    // 폰 처리 로직
    if (this.game && this.game.handlePon) {
      this.game.handlePon(0);
    }
  }

  handleKan() {
    // 깡 처리 로직
    if (this.ui && this.ui.showKanOptions) {
      this.ui.showKanOptions();
    }
  }

  // === 유틸리티 ===
  getSelectedTile() {
    return this.selectedTile;
  }

  clearSelection() {
    this.selectedTile = null;
    if (this.ui && this.ui.updateSelectedTile) {
      this.ui.updateSelectedTile(null);
    }
  }

  dispose() {
    this.isDisposed = true;

    // 키보드 이벤트 리스너 제거
    if (this.keyboardHandler) {
      document.removeEventListener("keydown", this.keyboardHandler);
      this.keyboardHandler = null;
    }

    // 이벤트 리스너 정리
    this.selectedTile = null;

    if (this.touchController) {
      this.touchController.onTileSelected = null;
      this.touchController.onTileDiscarded = null;
      this.touchController.onGestureDetected = null;
    }

    if (this.ui) {
      this.ui.onDiscardClick = null;
      this.ui.onRiichiClick = null;
      this.ui.onTsumoClick = null;
      this.ui.onRonClick = null;
      this.ui.onChiClick = null;
      this.ui.onPonClick = null;
      this.ui.onKanClick = null;
    }

    if (this.game) {
      // readonly 속성 확인 후 할당
      try {
        if (this.game.onGameStateChanged !== undefined) {
          this.game.onGameStateChanged = null;
        }
        if (this.game.onPlayerTurn !== undefined) {
          this.game.onPlayerTurn = null;
        }
        if (this.game.onRoundEnd !== undefined) {
          this.game.onRoundEnd = null;
        }
      } catch (error) {
        console.warn("게임 콜백 정리 중 오류 (무시 가능):", error);
      }
    }
  }
}
