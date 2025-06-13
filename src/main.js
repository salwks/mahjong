// src/main.js (정리된 버전 - 핵심 기능만)
import * as THREE from "three";
import { gsap } from "gsap";

// 안전한 import
let SceneManager, MahjongGame, TouchController, SimpleGameUI, EventManager;

class MahjongApp {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.loadingScreen = document.getElementById("loadingScreen");

    // 핵심 시스템들
    this.sceneManager = null;
    this.game = null;
    this.touchController = null;
    this.ui = null;
    this.eventManager = null;

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

      // 1. 모듈 동적 import
      await this.loadModules();

      // 2. 3D 씬 관리자 초기화
      this.updateLoadingText("3D 씬 초기화 중...");
      if (SceneManager) {
        this.sceneManager = new SceneManager(this.canvas);
        await this.sceneManager.init();
      }

      // 3. 게임 로직 초기화
      this.updateLoadingText("게임 시스템 초기화 중...");
      if (MahjongGame && this.sceneManager) {
        this.game = new MahjongGame(this.sceneManager);
        await this.game.init();
      }

      // 4. 입력 컨트롤러 초기화
      this.updateLoadingText("입력 시스템 초기화 중...");
      if (TouchController && this.sceneManager) {
        this.touchController = new TouchController(
          this.sceneManager.camera,
          this.sceneManager.scene,
          this.canvas
        );
      }

      // 5. SimpleGameUI 초기화
      this.updateLoadingText("UI 초기화 중...");
      if (SimpleGameUI) {
        this.ui = new SimpleGameUI();
      }

      // 6. EventManager 초기화
      this.updateLoadingText("이벤트 시스템 초기화 중...");
      if (EventManager) {
        this.eventManager = new EventManager(
          this.game,
          this.ui,
          this.touchController
        );
      }

      // 7. 윈도우 이벤트 설정
      this.setupWindowEvents();

      // 초기화 완료
      this.isInitialized = true;
      this.hideLoadingScreen();
      this.showStartMenu();

      console.log("✅ 마작 게임 초기화 완료");
    } catch (error) {
      console.error("초기화 실패:", error);
      this.handleError(error.message);
    }
  }

  async loadModules() {
    console.log("📦 모듈 로딩 중...");

    const modules = [
      {
        name: "SceneManager",
        path: "./graphics/SceneManager.js",
        var: "SceneManager",
      },
      {
        name: "MahjongGame",
        path: "./game/MahjongGame.js",
        var: "MahjongGame",
      },
      {
        name: "TouchController",
        path: "./input/TouchController.js",
        var: "TouchController",
      },
      {
        name: "SimpleGameUI",
        path: "./ui/SimpleGameUI.js",
        var: "SimpleGameUI",
      },
      {
        name: "EventManager",
        path: "./events/EventManager.js",
        var: "EventManager",
      },
    ];

    for (const module of modules) {
      try {
        const imported = await import(module.path);
        switch (module.var) {
          case "SceneManager":
            SceneManager = imported.SceneManager;
            break;
          case "MahjongGame":
            MahjongGame = imported.MahjongGame;
            break;
          case "TouchController":
            TouchController = imported.TouchController;
            break;
          case "SimpleGameUI":
            SimpleGameUI = imported.SimpleGameUI;
            break;
          case "EventManager":
            EventManager = imported.EventManager;
            break;
        }
        console.log(`✅ ${module.name} 로드 완료`);
      } catch (error) {
        console.error(`❌ ${module.name} 로드 실패:`, error);
      }
    }

    console.log("📦 모듈 로딩 완료");
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
        // 게임 시작
        await this.game.startNewGame();

        // 입력 활성화
        if (this.touchController) {
          this.touchController.setEnabled(true);
        }

        if (this.ui && this.ui.showMessage) {
          this.ui.showMessage("게임이 시작되었습니다!", "success", 2000);
        }
      }
    } catch (error) {
      console.error("게임 시작 실패:", error);
      this.handleError("게임을 시작할 수 없습니다.");
    }
  }

  // === 유틸리티 ===

  updateLoadingText(text) {
    const loadingScreen = this.loadingScreen;
    if (loadingScreen) {
      const loadingText = loadingScreen.querySelector("div") || loadingScreen;
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

    if (this.loadingScreen) {
      this.loadingScreen.innerHTML = `
        <div style="text-align: center; color: white;">
          <h2>오류 발생</h2>
          <p>${message}</p>
          <button onclick="window.location.reload()" 
                  style="margin-top: 20px; padding: 12px 24px; background: #4CAF50; 
                         color: white; border: none; border-radius: 6px; font-size: 16px; 
                         cursor: pointer;">
            새로고침
          </button>
        </div>
      `;
      this.loadingScreen.style.display = "flex";
    }
  }

  dispose() {
    console.log("게임 정리 중...");

    // 각 시스템 정리 (순서 중요)
    if (this.eventManager) {
      this.eventManager.dispose();
    }

    if (this.touchController) {
      this.touchController.dispose();
    }

    if (this.ui) {
      this.ui.dispose();
    }

    if (this.game) {
      this.game.dispose();
    }

    if (this.sceneManager) {
      this.sceneManager.dispose();
    }

    console.log("게임 정리 완료");
  }
}

// 앱 시작
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM 로드 완료, 마작 게임 시작...");

  try {
    const app = new MahjongApp();

    // 전역 접근용
    window.mahjongApp = app;

    // 디버그 도구 로드 (분리된 파일에서)
    try {
      const { DebugTools } = await import("./debug/DebugTools.js");
      const debugTools = new DebugTools(app);
      debugTools.init();
      console.log("✅ 디버그 도구 로드 완료");
    } catch (error) {
      console.warn("디버그 도구 로드 실패:", error);
      // 기본 디버그 함수들만 설정
      window.debugGame = () => {
        console.log("=== 게임 상태 ===");
        if (app.game) {
          console.log(app.game.getDebugInfo());
        }
      };
    }

    console.log("🎮 게임 초기화 완료!");
  } catch (error) {
    console.error("앱 시작 실패:", error);
  }
});
