// src/main.js (간소화된 버전)
import * as THREE from "three";
import { gsap } from "gsap";
import { SceneManager } from "./graphics/SceneManager.js";
import { MahjongGame } from "./game/MahjongGame.js";
import { TouchController } from "./input/TouchController.js";
import { GameUI } from "./ui/GameUI.js";

class MahjongApp {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.loadingScreen = document.getElementById("loadingScreen");

    // 핵심 시스템들
    this.sceneManager = null;
    this.game = null;
    this.touchController = null;
    this.gameUI = null;

    // 상태
    this.isInitialized = false;

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

      // GSAP 기본 설정
      gsap.defaults({
        ease: "power2.out",
        duration: 0.5,
      });

      // 1. 3D 씬 관리자 초기화
      this.updateLoadingText("3D 씬 초기화 중...");
      this.sceneManager = new SceneManager(this.canvas);
      await this.sceneManager.init();

      // 2. 게임 로직 초기화
      this.updateLoadingText("게임 시스템 초기화 중...");
      this.game = new MahjongGame(this.sceneManager);
      await this.game.init();

      // 3. 입력 컨트롤러 초기화
      this.updateLoadingText("입력 시스템 초기화 중...");
      this.touchController = new TouchController(
        this.sceneManager.camera,
        this.sceneManager.scene,
        this.canvas
      );
      this.setupInputCallbacks();

      // 4. UI 시스템 초기화
      this.updateLoadingText("UI 초기화 중...");
      this.gameUI = new GameUI(this.game);
      this.gameUI.init();
      this.setupUICallbacks();

      // 5. 윈도우 이벤트 설정
      this.setupWindowEvents();

      // 초기화 완료
      this.isInitialized = true;
      this.hideLoadingScreen();
      this.showStartMenu();

      console.log("✓ 마작 게임 초기화 완료");
    } catch (error) {
      console.error("초기화 실패:", error);
      this.handleError(error.message);
    }
  }

  setupInputCallbacks() {
    // 타일 선택/버리기 콜백
    this.touchController.onTileSelected = (tile) => {
      console.log("타일 선택됨:", tile.toString());
      this.gameUI.onTileSelected(tile);
    };

    this.touchController.onTileDiscarded = (tile) => {
      console.log("타일 버리기 요청:", tile.toString());
      if (this.game && this.game.onTileDiscarded) {
        this.game.onTileDiscarded(tile);
      }
    };

    this.touchController.onGestureDetected = (gesture, tile, data) => {
      console.log(`제스처 감지: ${gesture}`, tile?.toString(), data);

      // 위쪽 스와이프나 더블탭시 타일 버리기
      if ((gesture === "swipe" && data === "up") || gesture === "doubletap") {
        if (tile && this.game && this.game.onTileDiscarded) {
          this.game.onTileDiscarded(tile);
        }
      }
    };
  }

  setupUICallbacks() {
    // UI 콜백들은 GameUI에서 직접 처리
  }

  setupWindowEvents() {
    // 윈도우 리사이즈
    window.addEventListener("resize", () => {
      if (this.sceneManager) {
        this.sceneManager.onWindowResize();
      }
    });

    // 게임 정리
    window.addEventListener("beforeunload", () => {
      this.dispose();
    });
  }

  showStartMenu() {
    // 간단한 시작 메뉴
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

    // 버튼 페이드인
    gsap.fromTo(
      startButton,
      { opacity: 0, scale: 0.5 },
      { duration: 0.5, opacity: 1, scale: 1, ease: "back.out(1.7)" }
    );

    // 애니메이션 시작
    this.startAnimation();
  }

  startAnimation() {
    if (!this.isInitialized) return;

    requestAnimationFrame(() => this.startAnimation());

    try {
      // 씬 업데이트 및 렌더링
      if (this.sceneManager) {
        this.sceneManager.update();
        this.sceneManager.render();
      }

      // 게임 업데이트
      if (this.game) {
        this.game.update();
      }
    } catch (error) {
      console.error("애니메이션 루프 오류:", error);
    }
  }

  async startGame() {
    console.log("🎮 게임 시작!");

    try {
      if (this.game) {
        // 패 배분 없이 바로 게임 시작
        await this.game.startNewGame();

        // 입력 활성화
        this.touchController.setEnabled(true);
      }
    } catch (error) {
      console.error("게임 시작 실패:", error);
      this.handleError("게임을 시작할 수 없습니다.");
    }
  }

  // === 유틸리티 ===

  updateLoadingText(text) {
    const loadingText = document.getElementById("loading-text");
    if (loadingText) {
      loadingText.textContent = text;
    }
    console.log(text);
  }

  hideLoadingScreen() {
    if (this.loadingScreen) {
      gsap.to(this.loadingScreen, {
        duration: 0.5,
        opacity: 0,
        ease: "power2.out",
        onComplete: () => {
          this.loadingScreen.style.display = "none";
        },
      });
    }
  }

  handleError(message) {
    console.error("게임 에러:", message);

    const loadingText = document.getElementById("loading-text");
    const errorMessage = document.getElementById("error-message");

    if (loadingText) {
      loadingText.textContent = "오류 발생";
    }

    if (errorMessage) {
      errorMessage.textContent = message;
      errorMessage.style.display = "block";
    }

    // 새로고침 버튼
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
      `;

      if (this.loadingScreen) {
        this.loadingScreen.appendChild(button);
      }
    }
  }

  dispose() {
    console.log("게임 정리 중...");

    // 각 시스템 정리
    if (this.touchController) {
      this.touchController.dispose();
    }

    if (this.gameUI) {
      this.gameUI.dispose();
    }

    if (this.game) {
      this.game.dispose();
    }

    if (this.sceneManager) {
      // SceneManager의 정리는 내부에서 처리
    }

    console.log("게임 정리 완료");
  }
}

// 앱 시작
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM 로드 완료, 마작 게임 시작...");

  try {
    const app = new MahjongApp();

    // 전역 접근용
    window.mahjongApp = app;

    // 디버그 함수
    window.debugGame = () => {
      if (app.game) {
        console.log(app.game.getDebugInfo());
      }
    };

    console.log("🎮 디버깅 명령어:");
    console.log("- window.debugGame() : 게임 상태 확인");
    console.log("- window.mahjongApp : 앱 인스턴스 접근");
  } catch (error) {
    console.error("앱 시작 실패:", error);
  }
});
