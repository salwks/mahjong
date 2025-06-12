// src/ui/SimpleGameUI.js - 간소화된 UI (표시만 담당)
export class SimpleGameUI {
  constructor() {
    // UI 엘리먼트들
    this.elements = this.getUIElements();

    // 상태
    this.selectedTile = null;
    this.isButtonsEnabled = true;
    this.currentNotification = null;

    // 이벤트 콜백들 (EventManager에서 설정)
    this.onDiscardClick = null;
    this.onRiichiClick = null;
    this.onTsumoClick = null;
    this.onRonClick = null;
    this.onChiClick = null;
    this.onPonClick = null;
    this.onKanClick = null;

    this.setupButtonEvents();
    this.setupNotificationStyles();
  }

  getUIElements() {
    return {
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
    };
  }

  setupButtonEvents() {
    // 각 버튼에 이벤트 연결 (콜백 방식)
    if (this.elements.btnDiscard) {
      this.elements.btnDiscard.onclick = () => this.onDiscardClick?.();
    }
    if (this.elements.btnRiichi) {
      this.elements.btnRiichi.onclick = () => this.onRiichiClick?.();
    }
    if (this.elements.btnTsumo) {
      this.elements.btnTsumo.onclick = () => this.onTsumoClick?.();
    }
    if (this.elements.btnRon) {
      this.elements.btnRon.onclick = () => this.onRonClick?.();
    }
    if (this.elements.btnChi) {
      this.elements.btnChi.onclick = () => this.onChiClick?.();
    }
    if (this.elements.btnPon) {
      this.elements.btnPon.onclick = () => this.onPonClick?.();
    }
    if (this.elements.btnKan) {
      this.elements.btnKan.onclick = () => this.onKanClick?.();
    }
  }

  // === UI 업데이트 메서드들 ===

  updateSelectedTile(tile) {
    this.selectedTile = tile;
    this.updateButtonStates();

    if (tile) {
      this.showMessage(`${tile.toString()} 선택됨`, "info", 1000);
    }
  }

  updateGameState(gameState) {
    this.updateScores(gameState.players);
    this.updateStatus(gameState);
  }

  updateScores(players) {
    const scoreElements = [
      this.elements.scoreEast,
      this.elements.scoreSouth,
      this.elements.scoreWest,
      this.elements.scoreNorth,
    ];

    players.forEach((player, index) => {
      if (scoreElements[index]) {
        scoreElements[index].textContent = player.score.toLocaleString();
      }
    });
  }

  updateStatus(gameState) {
    if (this.elements.roundNumber) {
      this.elements.roundNumber.textContent = gameState.roundNumber || 1;
    }
    if (this.elements.remainingTiles) {
      this.elements.remainingTiles.textContent = gameState.remainingTiles || 0;
    }
  }

  updatePlayerTurn(playerIndex) {
    const playerNames = ["당신", "AI 남", "AI 서", "AI 북"];
    const message =
      playerIndex === 0
        ? "당신의 차례입니다"
        : `${playerNames[playerIndex]}의 차례`;

    this.showMessage(message, "info", 1500);
  }

  updateButtonStates() {
    // 버리기 버튼
    if (this.elements.btnDiscard) {
      this.elements.btnDiscard.disabled =
        !this.selectedTile || !this.isButtonsEnabled;
    }

    // 다른 버튼들은 게임 상태에 따라 활성화/비활성화
    const actionButtons = [
      this.elements.btnRiichi,
      this.elements.btnTsumo,
      this.elements.btnRon,
      this.elements.btnChi,
      this.elements.btnPon,
      this.elements.btnKan,
    ];

    actionButtons.forEach((button) => {
      if (button) {
        button.disabled = !this.isButtonsEnabled;
      }
    });
  }

  // === 컨트롤 활성화/비활성화 ===

  enablePlayerControls() {
    this.isButtonsEnabled = true;
    this.updateButtonStates();
  }

  disablePlayerControls() {
    this.isButtonsEnabled = false;
    this.updateButtonStates();
  }

  isEnabled() {
    return this.isButtonsEnabled;
  }

  // === 메시지 표시 ===

  showMessage(message, type = "info", duration = 3000) {
    this.hideNotification();

    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
      `;

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

    notification.querySelector(".notification-close").onclick = () => {
      this.hideNotification();
    };

    document.body.appendChild(notification);
    this.currentNotification = notification;

    if (duration > 0) {
      setTimeout(() => this.hideNotification(), duration);
    }
  }

  getNotificationColor(type) {
    const colors = {
      info: "#2196F3",
      success: "#4CAF50",
      warning: "#FF9800",
      error: "#F44336",
    };
    return colors[type] || colors.info;
  }

  hideNotification() {
    if (this.currentNotification) {
      this.currentNotification.remove();
      this.currentNotification = null;
    }
  }

  setupNotificationStyles() {
    if (document.getElementById("notification-styles")) return;

    const styles = document.createElement("style");
    styles.id = "notification-styles";
    styles.textContent = `
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
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

  // === 모달 (간단한 버전) ===

  showRiichiConfirmation(onConfirm) {
    const modal = this.createSimpleModal(
      "리치 선언",
      "리치를 선언하시겠습니까?\n• 1000점이 차감됩니다\n• 손패를 바꿀 수 없습니다",
      [
        {
          text: "선언",
          onClick: () => {
            this.hideModal();
            onConfirm();
          },
        },
        { text: "취소", onClick: () => this.hideModal() },
      ]
    );
  }

  showChiOptions() {
    this.showMessage("치 기능은 준비 중입니다", "info");
  }

  showKanOptions() {
    this.showMessage("깡 기능은 준비 중입니다", "info");
  }

  showRoundResult(result) {
    const message = result.type === "draw" ? "유국" : `${result.winner} 승리!`;
    this.showMessage(message, "success", 5000);
  }

  createSimpleModal(title, content, buttons) {
    const modal = document.createElement("div");
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
      `;

    const modalContent = document.createElement("div");
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      `;

    modalContent.innerHTML = `
        <h3 style="margin-top: 0; color: #333;">${title}</h3>
        <p style="margin: 20px 0; white-space: pre-line; line-height: 1.5;">${content}</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          ${buttons
            .map(
              (btn) =>
                `<button style="padding: 10px 20px; border: none; border-radius: 6px; 
             cursor: pointer; font-size: 14px; color: white; 
             background: ${btn.text === "선언" ? "#4CAF50" : "#f44336"};">${
                  btn.text
                }</button>`
            )
            .join("")}
        </div>
      `;

    buttons.forEach((btn, index) => {
      modalContent.querySelectorAll("button")[index].onclick = btn.onClick;
    });

    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    this.currentModal = modal;

    return modal;
  }

  hideModal() {
    if (this.currentModal) {
      this.currentModal.remove();
      this.currentModal = null;
    }
  }

  // === 정리 ===

  dispose() {
    this.hideNotification();
    this.hideModal();

    // 콜백 제거
    this.onDiscardClick = null;
    this.onRiichiClick = null;
    this.onTsumoClick = null;
    this.onRonClick = null;
    this.onChiClick = null;
    this.onPonClick = null;
    this.onKanClick = null;
  }
}
