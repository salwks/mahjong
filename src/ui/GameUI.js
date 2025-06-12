// src/ui/GameUI.js
export class GameUI {
  constructor(game) {
    this.game = game;

    // UI 엘리먼트들
    this.elements = {
      // 점수 표시
      scoreEast: document.getElementById("score-east"),
      scoreSouth: document.getElementById("score-south"),
      scoreWest: document.getElementById("score-west"),
      scoreNorth: document.getElementById("score-north"),

      // 게임 상태
      roundNumber: document.getElementById("round-number"),
      remainingTiles: document.getElementById("remaining-tiles"),
      doraIndicator: document.getElementById("dora-indicator"),

      // 컨트롤 버튼들
      btnDiscard: document.getElementById("btn-discard"),
      btnRiichi: document.getElementById("btn-riichi"),
      btnTsumo: document.getElementById("btn-tsumo"),
      btnRon: document.getElementById("btn-ron"),
      btnChi: document.getElementById("btn-chi"),
      btnPon: document.getElementById("btn-pon"),
      btnKan: document.getElementById("btn-kan"),

      // 모바일 컨트롤
      mobileControls: document.querySelector(".mobile-controls"),

      // 알림 영역
      gameContainer: document.getElementById("gameContainer"),
    };

    // UI 상태
    this.currentNotification = null;
    this.isButtonsEnabled = true;
    this.selectedTile = null;

    // 모바일 최적화
    this.isMobile = this.detectMobile();
    this.orientation = this.getOrientation();

    // 애니메이션 큐
    this.animationQueue = [];
    this.isAnimating = false;

    this.setupEventListeners();
    this.optimizeForDevice();
  }

  init() {
    console.log("게임 UI 초기화");

    // 초기 UI 상태 설정
    this.updateScoreDisplay();
    this.updateGameStatusDisplay();
    this.disableAllButtons();

    // 게임 콜백 설정
    this.setupGameCallbacks();

    // 키보드 단축키 설정
    this.setupKeyboardShortcuts();

    // 모바일 최적화
    if (this.isMobile) {
      this.setupMobileOptimizations();
    }

    this.showWelcomeMessage();
  }

  // === 디바이스 감지 및 최적화 ===

  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  getOrientation() {
    return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
  }

  optimizeForDevice() {
    if (this.isMobile) {
      // 모바일 최적화
      document.body.classList.add("mobile");

      // 버튼 크기 조정
      this.adjustButtonSizes();

      // 터치 영역 최적화
      this.optimizeTouchAreas();
    }

    // 화면 크기에 따른 UI 조정
    this.adjustLayoutForScreenSize();
  }

  adjustButtonSizes() {
    const buttons = document.querySelectorAll(".control-button");
    buttons.forEach((button) => {
      button.style.padding = "16px 24px";
      button.style.fontSize = "16px";
      button.style.minHeight = "48px"; // 터치 접근성
    });
  }

  optimizeTouchAreas() {
    // 터치 영역을 최소 44x44px로 보장
    const touchElements = document.querySelectorAll(".ui-element");
    touchElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width < 44 || rect.height < 44) {
        element.style.minWidth = "44px";
        element.style.minHeight = "44px";
      }
    });
  }

  adjustLayoutForScreenSize() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    if (screenWidth < 768) {
      // 작은 화면 대응
      this.elements.mobileControls.style.flexWrap = "wrap";
      this.elements.mobileControls.style.gap = "8px";
    } else {
      // 큰 화면 대응
      this.elements.mobileControls.style.flexWrap = "nowrap";
      this.elements.mobileControls.style.gap = "12px";
    }
  }

  setupMobileOptimizations() {
    // 스크롤 방지
    document.body.style.overflow = "hidden";

    // 확대/축소 방지
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.content =
        "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
    }

    // iOS Safari의 바운스 효과 방지
    document.addEventListener(
      "touchmove",
      (e) => {
        if (e.target.closest("#gameCanvas")) {
          e.preventDefault();
        }
      },
      { passive: false }
    );

    // 화면 회전 감지
    window.addEventListener("orientationchange", () => {
      setTimeout(() => {
        this.orientation = this.getOrientation();
        this.handleOrientationChange();
      }, 100);
    });
  }

  handleOrientationChange() {
    this.adjustLayoutForScreenSize();

    // 3D 씬도 조정 필요시
    if (this.game && this.game.sceneManager) {
      this.game.sceneManager.onWindowResize();
    }

    this.showNotification(
      `화면이 ${
        this.orientation === "landscape" ? "가로" : "세로"
      } 모드로 변경되었습니다.`,
      "info",
      2000
    );
  }

  // === 이벤트 리스너 설정 ===

  setupEventListeners() {
    // 버튼 이벤트
    if (this.elements.btnDiscard) {
      this.elements.btnDiscard.addEventListener("click", () =>
        this.handleDiscardClick()
      );
    }

    if (this.elements.btnRiichi) {
      this.elements.btnRiichi.addEventListener("click", () =>
        this.handleRiichiClick()
      );
    }

    if (this.elements.btnTsumo) {
      this.elements.btnTsumo.addEventListener("click", () =>
        this.handleTsumoClick()
      );
    }

    if (this.elements.btnRon) {
      this.elements.btnRon.addEventListener("click", () =>
        this.handleRonClick()
      );
    }

    if (this.elements.btnChi) {
      this.elements.btnChi.addEventListener("click", () =>
        this.handleChiClick()
      );
    }

    if (this.elements.btnPon) {
      this.elements.btnPon.addEventListener("click", () =>
        this.handlePonClick()
      );
    }

    if (this.elements.btnKan) {
      this.elements.btnKan.addEventListener("click", () =>
        this.handleKanClick()
      );
    }

    // 윈도우 리사이즈
    window.addEventListener("resize", () => this.handleWindowResize());

    // 키보드 이벤트
    document.addEventListener("keydown", (e) => this.handleKeyDown(e));

    // 게임 컨테이너 클릭 (타일 선택 해제용)
    if (this.elements.gameContainer) {
      this.elements.gameContainer.addEventListener("click", (e) => {
        if (e.target === this.elements.gameContainer) {
          this.handleBackgroundClick();
        }
      });
    }
  }

  setupGameCallbacks() {
    if (this.game) {
      this.game.onGameStateChanged = (gameState) =>
        this.handleGameStateChanged(gameState);
      this.game.onPlayerTurn = (playerIndex) =>
        this.handlePlayerTurn(playerIndex);
      this.game.onRoundEnd = (result) => this.handleRoundEnd(result);
      this.game.onGameEnd = (rankings) => this.handleGameEnd(rankings);
    }
  }

  setupKeyboardShortcuts() {
    // PC 사용자를 위한 키보드 단축키
    this.shortcuts = {
      KeyD: () => this.handleDiscardClick(),
      KeyR: () => this.handleRiichiClick(),
      KeyT: () => this.handleTsumoClick(),
      KeyO: () => this.handleRonClick(),
      KeyC: () => this.handleChiClick(),
      KeyP: () => this.handlePonClick(),
      KeyK: () => this.handleKanClick(),
      Escape: () => this.handleEscapeKey(),
      Space: () => this.handleSpaceKey(),
    };
  }

  // === 버튼 이벤트 처리 ===

  handleDiscardClick() {
    if (!this.isButtonsEnabled) return;

    if (this.selectedTile) {
      // 선택된 타일이 있으면 버리기
      this.game.onTileDiscarded(this.selectedTile);
      this.selectedTile = null;
    } else {
      this.showNotification("버릴 패를 먼저 선택하세요.", "warning");
    }
  }

  handleRiichiClick() {
    if (!this.isButtonsEnabled) return;

    this.showRiichiConfirmation();
  }

  handleTsumoClick() {
    if (!this.isButtonsEnabled) return;

    if (this.game && this.game.handleTsumo) {
      this.game.handleTsumo(0); // 인간 플레이어 인덱스
    }

    this.disableAllButtons();
  }

  handleRonClick() {
    if (!this.isButtonsEnabled) return;

    if (this.game && this.game.handleRon) {
      this.game.handleRon(0);
    }

    this.disableAllButtons();
  }

  handleChiClick() {
    if (!this.isButtonsEnabled) return;

    this.showChiOptions();
  }

  handlePonClick() {
    if (!this.isButtonsEnabled) return;

    if (this.game && this.game.handlePon) {
      this.game.handlePon(0);
    }

    this.disableAllButtons();
  }

  handleKanClick() {
    if (!this.isButtonsEnabled) return;

    this.showKanOptions();
  }

  handleBackgroundClick() {
    // 배경 클릭시 선택 해제
    this.selectedTile = null;
    this.updateButtonStates();
  }

  handleWindowResize() {
    this.optimizeForDevice();

    // 3D 씬 리사이즈
    if (this.game && this.game.sceneManager) {
      this.game.sceneManager.onWindowResize();
    }
  }

  handleKeyDown(event) {
    const shortcut = this.shortcuts[event.code];
    if (shortcut && this.isButtonsEnabled) {
      event.preventDefault();
      shortcut();
    }
  }

  handleEscapeKey() {
    this.selectedTile = null;
    this.updateButtonStates();
    this.hideAllModals();
  }

  handleSpaceKey() {
    this.handleDiscardClick();
  }

  // === 게임 이벤트 처리 ===

  handleGameStateChanged(gameState) {
    this.updateScoreDisplay();
    this.updateGameStatusDisplay();
    this.updateButtonStates();

    // 애니메이션 큐 처리
    this.processAnimationQueue();
  }

  handlePlayerTurn(playerIndex) {
    if (playerIndex === 0) {
      // 인간 플레이어 턴
      this.enablePlayerControls();
      this.showNotification("당신의 차례입니다", "info", 2000);
    } else {
      // AI 플레이어 턴
      this.disablePlayerControls();
      const playerName = this.game.players[playerIndex].name;
      this.showNotification(`${playerName}의 차례`, "info", 1000);
    }
  }

  handleRoundEnd(result) {
    this.disableAllButtons();

    let message = "";
    switch (result.type) {
      case "tsumo":
        message = `${result.winner} 쯔모! ${result.score}점`;
        break;
      case "ron":
        message = `${result.winner} 론! ${result.score}점`;
        break;
      case "draw":
        message = "유국";
        break;
      default:
        message = "라운드 종료";
    }

    this.showRoundResult(message, result);
  }

  handleGameEnd(rankings) {
    this.disableAllButtons();
    this.showGameResult(rankings);
  }

  // === UI 업데이트 ===

  updateScoreDisplay() {
    if (!this.game || !this.game.players) return;

    const scoreElements = [
      this.elements.scoreEast,
      this.elements.scoreSouth,
      this.elements.scoreWest,
      this.elements.scoreNorth,
    ];

    for (let i = 0; i < this.game.players.length; i++) {
      const element = scoreElements[i];
      if (element) {
        const score = this.game.players[i].score;
        element.textContent = score.toLocaleString();

        // 점수에 따른 색상 변경
        element.className = this.getScoreColorClass(score);
      }
    }
  }

  getScoreColorClass(score) {
    if (score >= 30000) return "score-excellent";
    if (score >= 25000) return "score-good";
    if (score >= 20000) return "score-normal";
    if (score >= 10000) return "score-low";
    return "score-danger";
  }

  updateGameStatusDisplay() {
    if (!this.game) return;

    // 라운드 정보
    if (this.elements.roundNumber) {
      this.elements.roundNumber.textContent = this.game.roundNumber;
    }

    // 남은 패 수
    if (this.elements.remainingTiles) {
      this.elements.remainingTiles.textContent = this.game.remainingTiles;
    }

    // 도라 표시
    if (
      this.elements.doraIndicator &&
      this.game.dora &&
      this.game.dora.length > 0
    ) {
      this.elements.doraIndicator.textContent = this.game.dora[0].toString();
    }
  }

  updateButtonStates() {
    if (!this.game || !this.game.humanPlayer) return;

    const player = this.game.humanPlayer;
    const gameState = this.game.getGameState();

    // 버리기 버튼
    if (this.elements.btnDiscard) {
      this.elements.btnDiscard.disabled =
        !this.selectedTile || !this.isButtonsEnabled;
    }

    // 리치 버튼
    if (this.elements.btnRiichi) {
      const canRiichi =
        this.game.canDeclareRiichi && this.game.canDeclareRiichi(player);
      this.elements.btnRiichi.disabled = !canRiichi || !this.isButtonsEnabled;
    }

    // 쯔모 버튼
    if (this.elements.btnTsumo) {
      const canTsumo =
        player.lastDrawnTile &&
        this.game.handEvaluator &&
        this.game.handEvaluator.isWinningHand(player.hand);
      this.elements.btnTsumo.disabled = !canTsumo || !this.isButtonsEnabled;
    }

    // 론/치/폰/깡은 게임에서 직접 제어
    this.updateClaimButtons(gameState);
  }

  updateClaimButtons(gameState) {
    const claimButtons = [
      this.elements.btnRon,
      this.elements.btnChi,
      this.elements.btnPon,
      this.elements.btnKan,
    ];

    // 기본적으로 모든 클레임 버튼 비활성화
    claimButtons.forEach((button) => {
      if (button) button.disabled = true;
    });

    // 게임에서 활성화된 버튼들만 활성화 (게임 로직에서 처리)
  }

  // === 버튼 제어 ===

  enablePlayerControls() {
    this.isButtonsEnabled = true;
    this.updateButtonStates();
  }

  disablePlayerControls() {
    this.isButtonsEnabled = false;
    this.updateButtonStates();
  }

  disableAllButtons() {
    const buttons = [
      this.elements.btnDiscard,
      this.elements.btnRiichi,
      this.elements.btnTsumo,
      this.elements.btnRon,
      this.elements.btnChi,
      this.elements.btnPon,
      this.elements.btnKan,
    ];

    buttons.forEach((button) => {
      if (button) {
        button.disabled = true;
        button.onclick = null;
      }
    });

    this.isButtonsEnabled = false;
  }

  enableButton(buttonName, onClick = null) {
    const button =
      this.elements[
        `btn${buttonName.charAt(0).toUpperCase()}${buttonName.slice(1)}`
      ];
    if (button) {
      button.disabled = false;
      if (onClick) {
        button.onclick = onClick;
      }
    }
  }

  // === 알림 및 메시지 ===

  showNotification(message, type = "info", duration = 3000) {
    // 기존 알림 제거
    this.hideNotification();

    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

    // 스타일 적용
    notification.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            font-size: 14px;
            max-width: 90vw;
            text-align: center;
            animation: slideDown 0.3s ease-out;
        `;

    // 닫기 버튼 이벤트
    const closeBtn = notification.querySelector(".notification-close");
    closeBtn.onclick = () => this.hideNotification();

    document.body.appendChild(notification);
    this.currentNotification = notification;

    // 자동 숨김
    if (duration > 0) {
      setTimeout(() => this.hideNotification(), duration);
    }

    // 애니메이션 CSS 추가 (한 번만)
    if (!document.getElementById("notification-styles")) {
      const styles = document.createElement("style");
      styles.id = "notification-styles";
      styles.textContent = `
                @keyframes slideDown {
                    from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
                @keyframes slideUp {
                    from { opacity: 1; transform: translateX(-50%) translateY(0); }
                    to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                }
                .notification-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    margin-left: 10px;
                    padding: 0;
                    line-height: 1;
                }
            `;
      document.head.appendChild(styles);
    }
  }

  getNotificationColor(type) {
    const colors = {
      info: "#2196F3",
      success: "#4CAF50",
      warning: "#FF9800",
      error: "#F44336",
      win: "#8BC34A",
      lose: "#FF5722",
    };
    return colors[type] || colors.info;
  }

  hideNotification() {
    if (this.currentNotification) {
      this.currentNotification.style.animation = "slideUp 0.3s ease-out";
      setTimeout(() => {
        if (this.currentNotification && this.currentNotification.parentNode) {
          this.currentNotification.parentNode.removeChild(
            this.currentNotification
          );
        }
        this.currentNotification = null;
      }, 300);
    }
  }

  showWelcomeMessage() {
    this.showNotification(
      "Three.js 마작 게임에 오신 것을 환영합니다!",
      "success",
      3000
    );
  }

  // === 모달 다이얼로그 ===

  showRiichiConfirmation() {
    const modal = this.createModal(
      "리치 선언",
      `
            <p>리치를 선언하시겠습니까?</p>
            <p><small>• 1000점이 차감됩니다</small></p>
            <p><small>• 손패를 바꿀 수 없습니다</small></p>
            <div class="modal-buttons">
                <button class="btn-confirm">선언</button>
                <button class="btn-cancel">취소</button>
            </div>
        `
    );

    modal.querySelector(".btn-confirm").onclick = () => {
      this.hideModal(modal);
      if (this.game && this.game.handleRiichi) {
        this.game.humanPlayer.wantToRiichi = true;
        this.showNotification(
          "리치를 선언합니다. 버릴 패를 선택하세요.",
          "info"
        );
      }
    };

    modal.querySelector(".btn-cancel").onclick = () => {
      this.hideModal(modal);
    };
  }

  showChiOptions() {
    if (!this.game || !this.game.lastDiscardedTile) return;

    const player = this.game.humanPlayer;
    const chiOptions = player.getChiOptions(this.game.lastDiscardedTile);

    if (chiOptions.length === 0) {
      this.showNotification("치가 불가능합니다.", "warning");
      return;
    }

    let optionsHtml = "<p>치 옵션을 선택하세요:</p>";
    chiOptions.forEach((option, index) => {
      optionsHtml += `<button class="chi-option" data-index="${index}">
                ${option
                  .map(
                    (num) =>
                      `${num}${
                        this.game.lastDiscardedTile.type === "man"
                          ? "만"
                          : this.game.lastDiscardedTile.type === "pin"
                          ? "통"
                          : "삭"
                      }`
                  )
                  .join(" ")}
            </button>`;
    });
    optionsHtml += '<button class="btn-cancel">취소</button>';

    const modal = this.createModal("치 선택", optionsHtml);

    modal.querySelectorAll(".chi-option").forEach((btn, index) => {
      btn.onclick = () => {
        this.hideModal(modal);
        if (this.game && this.game.handleChi) {
          this.game.handleChi(0, chiOptions[index]);
        }
      };
    });

    modal.querySelector(".btn-cancel").onclick = () => {
      this.hideModal(modal);
    };
  }

  showKanOptions() {
    const player = this.game.humanPlayer;
    const ankanOptions = player.getAnkanOptions();
    const kakanOptions = player.getKakanOptions();

    if (ankanOptions.length === 0 && kakanOptions.length === 0) {
      this.showNotification("깡이 불가능합니다.", "warning");
      return;
    }

    let optionsHtml = "<p>깡 옵션을 선택하세요:</p>";

    // 암깡 옵션
    ankanOptions.forEach((tiles, index) => {
      optionsHtml += `<button class="kan-option" data-type="ankan" data-index="${index}">
                암깡: ${tiles[0].toString()} (4장)
            </button>`;
    });

    // 가깡 옵션
    kakanOptions.forEach((option, index) => {
      optionsHtml += `<button class="kan-option" data-type="kakan" data-index="${index}">
                가깡: ${option.tile.toString()}
            </button>`;
    });

    optionsHtml += '<button class="btn-cancel">취소</button>';

    const modal = this.createModal("깡 선택", optionsHtml);

    modal.querySelectorAll(".kan-option").forEach((btn) => {
      btn.onclick = () => {
        this.hideModal(modal);
        const type = btn.dataset.type;
        const index = parseInt(btn.dataset.index);

        if (type === "ankan") {
          // 암깡 처리
          if (this.game && this.game.handleKan) {
            this.game.handleKan(0, ankanOptions[index]);
          }
        } else if (type === "kakan") {
          // 가깡 처리
          if (this.game && this.game.handleKan) {
            this.game.handleKan(0, [kakanOptions[index].tile]);
          }
        }
      };
    });

    modal.querySelector(".btn-cancel").onclick = () => {
      this.hideModal(modal);
    };
  }

  createModal(title, content) {
    // 기존 모달 제거
    this.hideAllModals();

    const modal = document.createElement("div");
    modal.className = "game-modal";
    modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

    // 스타일 적용
    modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 2000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

    // 모달 스타일 (한 번만 추가)
    if (!document.getElementById("modal-styles")) {
      const styles = document.createElement("style");
      styles.id = "modal-styles";
      styles.textContent = `
                .modal-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                }
                .modal-content {
                    position: relative;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    max-width: 90vw;
                    max-height: 90vh;
                    overflow-y: auto;
                    animation: modalSlideIn 0.3s ease-out;
                }
                .modal-header {
                    padding: 20px 24px 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #eee;
                    margin-bottom: 20px;
                }
                .modal-header h3 {
                    margin: 0;
                    color: #333;
                }
                .modal-close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #999;
                    padding: 0;
                    line-height: 1;
                }
                .modal-body {
                    padding: 0 24px 24px;
                }
                .modal-buttons {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                    margin-top: 20px;
                }
                .btn-confirm, .btn-cancel, .chi-option, .kan-option {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s;
                }
                .btn-confirm {
                    background: #4CAF50;
                    color: white;
                }
                .btn-confirm:hover {
                    background: #45a049;
                }
                .btn-cancel {
                    background: #f44336;
                    color: white;
                }
                .btn-cancel:hover {
                    background: #da190b;
                }
                .chi-option, .kan-option {
                    background: #2196F3;
                    color: white;
                    margin: 5px;
                    display: block;
                    width: 100%;
                }
                .chi-option:hover, .kan-option:hover {
                    background: #0b7dda;
                }
                @keyframes modalSlideIn {
                    from { 
                        opacity: 0; 
                        transform: scale(0.9) translateY(-20px); 
                    }
                    to { 
                        opacity: 1; 
                        transform: scale(1) translateY(0); 
                    }
                }
            `;
      document.head.appendChild(styles);
    }

    // 닫기 이벤트
    modal.querySelector(".modal-close").onclick = () => this.hideModal(modal);
    modal.querySelector(".modal-overlay").onclick = () => this.hideModal(modal);

    document.body.appendChild(modal);
    return modal;
  }

  hideModal(modal) {
    if (modal && modal.parentNode) {
      modal.style.animation = "modalSlideOut 0.3s ease-out";
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300);
    }
  }

  hideAllModals() {
    const modals = document.querySelectorAll(".game-modal");
    modals.forEach((modal) => this.hideModal(modal));
  }

  // === 결과 표시 ===

  showRoundResult(message, result) {
    let resultHtml = `<h2>${message}</h2>`;

    if (result.yakuList && result.yakuList.length > 0) {
      resultHtml += '<div class="yaku-list"><h4>역 목록:</h4><ul>';
      result.yakuList.forEach((yaku) => {
        resultHtml += `<li>${yaku.name} (${yaku.han}한)</li>`;
      });
      resultHtml += "</ul></div>";
    }

    resultHtml += `
            <div class="score-changes">
                <h4>점수 변동:</h4>
                <div class="score-grid">
                    ${this.game.players
                      .map(
                        (player, index) => `
                        <div class="score-item">
                            <span class="player-name">${player.name}</span>
                            <span class="player-score">${player.score.toLocaleString()}</span>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
            <button class="btn-confirm">다음 라운드</button>
        `;

    const modal = this.createModal("라운드 결과", resultHtml);

    modal.querySelector(".btn-confirm").onclick = () => {
      this.hideModal(modal);
    };
  }

  showGameResult(rankings) {
    let resultHtml = '<h2>게임 종료!</h2><div class="final-rankings">';

    rankings.forEach((rank, index) => {
      const medalEmoji = ["🥇", "🥈", "🥉", ""][index] || "";
      resultHtml += `
                <div class="rank-item rank-${index + 1}">
                    <span class="rank-number">${medalEmoji} ${
        rank.rank
      }위</span>
                    <span class="rank-name">${rank.name}</span>
                    <span class="rank-score">${rank.score.toLocaleString()}점</span>
                </div>
            `;
    });

    resultHtml += `
            </div>
            <div class="game-end-buttons">
                <button class="btn-confirm">새 게임</button>
                <button class="btn-cancel">종료</button>
            </div>
        `;

    const modal = this.createModal("게임 결과", resultHtml);

    modal.querySelector(".btn-confirm").onclick = () => {
      this.hideModal(modal);
      if (this.game && this.game.startNewGame) {
        this.game.startNewGame();
      }
    };

    modal.querySelector(".btn-cancel").onclick = () => {
      this.hideModal(modal);
      // 게임 종료 처리
    };

    // 랭킹 스타일 추가
    if (!document.getElementById("ranking-styles")) {
      const styles = document.createElement("style");
      styles.id = "ranking-styles";
      styles.textContent = `
                .final-rankings {
                    margin: 20px 0;
                }
                .rank-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px;
                    margin: 8px 0;
                    border-radius: 8px;
                    background: #f5f5f5;
                }
                .rank-item.rank-1 {
                    background: linear-gradient(135deg, #FFD700, #FFA500);
                    color: white;
                }
                .rank-item.rank-2 {
                    background: linear-gradient(135deg, #C0C0C0, #A9A9A9);
                    color: white;
                }
                .rank-item.rank-3 {
                    background: linear-gradient(135deg, #CD7F32, #B8860B);
                    color: white;
                }
                .rank-number {
                    font-weight: bold;
                    font-size: 16px;
                }
                .rank-name {
                    flex: 1;
                    text-align: center;
                    font-weight: bold;
                }
                .rank-score {
                    font-weight: bold;
                    font-family: monospace;
                }
                .game-end-buttons {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                    margin-top: 20px;
                }
                .score-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                    gap: 10px;
                    margin: 15px 0;
                }
                .score-item {
                    text-align: center;
                    padding: 10px;
                    background: #f9f9f9;
                    border-radius: 6px;
                }
                .player-name {
                    display: block;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .player-score {
                    display: block;
                    font-family: monospace;
                    color: #333;
                }
                .yaku-list {
                    background: #f0f8ff;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 15px 0;
                }
                .yaku-list h4 {
                    margin-top: 0;
                    color: #2196F3;
                }
                .yaku-list ul {
                    margin: 10px 0;
                    padding-left: 20px;
                }
                .yaku-list li {
                    margin: 5px 0;
                }
            `;
      document.head.appendChild(styles);
    }
  }

  // === 애니메이션 큐 ===

  addToAnimationQueue(animation) {
    this.animationQueue.push(animation);
    if (!this.isAnimating) {
      this.processAnimationQueue();
    }
  }

  async processAnimationQueue() {
    if (this.animationQueue.length === 0 || this.isAnimating) return;

    this.isAnimating = true;

    while (this.animationQueue.length > 0) {
      const animation = this.animationQueue.shift();
      await animation();
    }

    this.isAnimating = false;
  }

  // === 유틸리티 ===

  onTileSelected(tile) {
    this.selectedTile = tile;
    this.updateButtonStates();

    // 선택된 타일 정보 표시
    this.showNotification(`${tile.toString()} 선택됨`, "info", 1000);
  }

  // === 정리 ===

  dispose() {
    // 이벤트 리스너 제거
    window.removeEventListener("resize", this.handleWindowResize);
    document.removeEventListener("keydown", this.handleKeyDown);

    // 모달과 알림 제거
    this.hideAllModals();
    this.hideNotification();

    // 애니메이션 큐 정리
    this.animationQueue = [];
    this.isAnimating = false;

    // 게임 콜백 제거
    if (this.game) {
      this.game.onGameStateChanged = null;
      this.game.onPlayerTurn = null;
      this.game.onRoundEnd = null;
      this.game.onGameEnd = null;
    }

    console.log("게임 UI 정리 완료");
  }
}
