// src/main.js (안전한 버전 - 오류 처리 강화)
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

    try {
      const sceneModule = await import("./graphics/SceneManager.js");
      SceneManager = sceneModule.SceneManager;
      console.log("✅ SceneManager 로드 완료");
    } catch (error) {
      console.error("❌ SceneManager 로드 실패:", error);
    }

    try {
      const gameModule = await import("./game/MahjongGame.js");
      MahjongGame = gameModule.MahjongGame;
      console.log("✅ MahjongGame 로드 완료");
    } catch (error) {
      console.error("❌ MahjongGame 로드 실패:", error);
    }

    try {
      const touchModule = await import("./input/TouchController.js");
      TouchController = touchModule.TouchController;
      console.log("✅ TouchController 로드 완료");
    } catch (error) {
      console.error("❌ TouchController 로드 실패:", error);
    }

    try {
      const uiModule = await import("./ui/SimpleGameUI.js");
      SimpleGameUI = uiModule.SimpleGameUI;
      console.log("✅ SimpleGameUI 로드 완료");
    } catch (error) {
      console.error("❌ SimpleGameUI 로드 실패:", error);
    }

    try {
      const eventModule = await import("./events/EventManager.js");
      EventManager = eventModule.EventManager;
      console.log("✅ EventManager 로드 완료");
    } catch (error) {
      console.error("❌ EventManager 로드 실패:", error);
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
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM 로드 완료, 마작 게임 시작...");

  try {
    const app = new MahjongApp();

    // 전역 접근용
    window.mahjongApp = app;

    // 디버그 함수들
    window.debugGame = () => {
      console.log("=== 게임 상태 ===");
      if (app.game) {
        console.log(app.game.getDebugInfo());
      }
    };

    window.debugSelected = () => {
      if (app.eventManager) {
        console.log(
          "선택된 타일:",
          app.eventManager.getSelectedTile()?.toString() || "없음"
        );
      }
    };

    console.log("🎮 디버깅 명령어:");
    console.log("- window.debugGame() : 게임 상태 확인");
    console.log("- window.debugSelected() : 선택된 타일 확인");
  } catch (error) {
    console.error("앱 시작 실패:", error);
  }
});

// 전역 디버그 함수들
window.debugTiles = {
  // 1. 모든 플레이어 패 배치 테스트
  testAll: () => {
    if (window.mahjongApp && window.mahjongApp.game) {
      try {
        window.mahjongApp.game.testAllTileLayouts();
      } catch (error) {
        console.error("testAll 실행 중 오류:", error);
      }
    } else {
      console.error("게임이 초기화되지 않았습니다.");
    }
  },

  // 2. 특정 플레이어 테스트
  testPlayer: (playerIndex) => {
    if (window.mahjongApp && window.mahjongApp.game) {
      try {
        window.mahjongApp.game.testPlayerTileLayout(playerIndex);
      } catch (error) {
        console.error("testPlayer 실행 중 오류:", error);
      }
    } else {
      console.error("게임이 초기화되지 않았습니다.");
    }
  },

  // 3. 버린패 시뮬레이션
  simulateDiscards: (count = 6) => {
    if (window.mahjongApp && window.mahjongApp.game) {
      try {
        window.mahjongApp.game.simulateDiscards(count);
      } catch (error) {
        console.error("simulateDiscards 실행 중 오류:", error);
      }
    } else {
      console.error("게임이 초기화되지 않았습니다.");
    }
  },

  // 4. 즉시 재배치
  rearrangeAll: () => {
    if (window.mahjongApp && window.mahjongApp.game) {
      try {
        window.mahjongApp.game.instantArrangeAll();
      } catch (error) {
        console.error("rearrangeAll 실행 중 오류:", error);
      }
    } else {
      console.error("게임이 초기화되지 않았습니다.");
    }
  },

  // 5. TileManager 레이아웃 테스트
  testLayouts: () => {
    if (
      window.mahjongApp &&
      window.mahjongApp.game &&
      window.mahjongApp.game.tileManager
    ) {
      try {
        window.mahjongApp.game.tileManager.testAllLayouts();
      } catch (error) {
        console.error("testLayouts 실행 중 오류:", error);
      }
    } else {
      console.error("TileManager가 초기화되지 않았습니다.");
    }
  },

  // 6. 디버그 모드 토글
  toggleDebug: () => {
    if (
      window.mahjongApp &&
      window.mahjongApp.game &&
      window.mahjongApp.game.tileManager
    ) {
      try {
        const current = window.mahjongApp.game.debugMode;
        window.mahjongApp.game.debugMode = !current;
        if (window.mahjongApp.game.tileManager.setDebugMode) {
          window.mahjongApp.game.tileManager.setDebugMode(!current);
        }
        console.log(`디버그 모드: ${!current ? "활성화" : "비활성화"}`);
      } catch (error) {
        console.error("toggleDebug 실행 중 오류:", error);
      }
    }
  },

  // 7. 게임 상태 확인
  status: () => {
    if (window.mahjongApp && window.mahjongApp.game) {
      try {
        const debug = window.mahjongApp.game.getDebugInfo();
        console.table(debug.players);
        console.log("상세 정보:", debug);
      } catch (error) {
        console.error("status 실행 중 오류:", error);
      }
    } else {
      console.error("게임이 초기화되지 않았습니다.");
    }
  },

  // 8. 안전한 게임 시작 (디버그 없이)
  safeStart: () => {
    if (window.mahjongApp && window.mahjongApp.game) {
      try {
        // 디버그 모드 끄기
        window.mahjongApp.game.debugMode = false;
        if (
          window.mahjongApp.game.tileManager &&
          window.mahjongApp.game.tileManager.setDebugMode
        ) {
          window.mahjongApp.game.tileManager.setDebugMode(false);
        }

        // 게임 시작
        window.mahjongApp.game.startNewGame();
        console.log("✅ 게임이 안전하게 시작되었습니다.");
      } catch (error) {
        console.error("safeStart 실행 중 오류:", error);
      }
    } else {
      console.error("게임이 초기화되지 않았습니다.");
    }
  },

  // 9. 패 회전 상태 확인
  checkRotations: () => {
    if (!window.mahjongApp || !window.mahjongApp.game) {
      console.error("게임이 초기화되지 않았습니다.");
      return;
    }

    console.log("=== 패 회전 상태 확인 ===");

    for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
      const player = window.mahjongApp.game.players[playerIndex];
      if (!player || player.hand.length === 0) {
        console.log(`플레이어 ${playerIndex}: 손패 없음`);
        continue;
      }

      console.log(`\n플레이어 ${playerIndex} (${player.name}):`);

      // TileManager 설정 확인
      if (
        window.mahjongApp.game.tileManager &&
        window.mahjongApp.game.tileManager.playerPositions
      ) {
        const config =
          window.mahjongApp.game.tileManager.playerPositions[playerIndex];
        if (config) {
          const expectedRotation = config.hand.rotation;
          console.log(
            `  설정된 회전: (${expectedRotation.x.toFixed(
              2
            )}, ${expectedRotation.y.toFixed(2)}, ${expectedRotation.z.toFixed(
              2
            )})`
          );
        }
      }

      // 실제 패들의 회전 확인 (처음 3장만)
      console.log(`  실제 패들 회전:`);
      player.hand.slice(0, 3).forEach((tile, i) => {
        if (tile.mesh) {
          const rotation = tile.mesh.rotation;
          console.log(
            `    패 ${i} (${tile.toString()}): (${rotation.x.toFixed(
              2
            )}, ${rotation.y.toFixed(2)}, ${rotation.z.toFixed(2)})`
          );
        }
      });

      // 회전각 분석
      if (player.hand.length > 0 && player.hand[0].mesh) {
        const yRotation = player.hand[0].mesh.rotation.y;
        const degrees = ((yRotation * 180) / Math.PI).toFixed(0);
        console.log(`  → Y축 회전: ${degrees}도`);
      }
    }

    console.log("\n=== 회전 분석 완료 ===");
  },

  // 10. 특정 플레이어 회전 강제 적용
  forceRotation: (playerIndex, degrees) => {
    if (!window.mahjongApp || !window.mahjongApp.game) {
      console.error("게임이 초기화되지 않았습니다.");
      return;
    }

    const player = window.mahjongApp.game.players[playerIndex];
    if (!player) {
      console.error(`플레이어 ${playerIndex}를 찾을 수 없습니다.`);
      return;
    }

    const radians = (degrees * Math.PI) / 180;
    console.log(`플레이어 ${playerIndex} 패들을 ${degrees}도로 회전 적용`);

    player.hand.forEach((tile, i) => {
      if (tile.mesh) {
        tile.mesh.rotation.y = radians;
        console.log(`  패 ${i} (${tile.toString()}) 회전 적용: ${degrees}도`);
      }
    });

    console.log("✅ 회전 적용 완료");
  },

  // 11. 초기화 상태 확인
  checkInit: () => {
    console.log("=== 초기화 상태 확인 ===");

    if (!window.mahjongApp) {
      console.log("❌ window.mahjongApp이 없음");
      return;
    }

    console.log("✅ MahjongApp 존재");
    console.log("  - isInitialized:", window.mahjongApp.isInitialized);

    if (window.mahjongApp.sceneManager) {
      console.log("✅ SceneManager 존재");
    } else {
      console.log("❌ SceneManager 없음");
    }

    if (window.mahjongApp.game) {
      console.log("✅ Game 존재");
      if (window.mahjongApp.game.tileManager) {
        console.log("✅ TileManager 존재");
      } else {
        console.log("❌ TileManager 없음");
      }
    } else {
      console.log("❌ Game 없음");
    }

    if (window.mahjongApp.touchController) {
      console.log("✅ TouchController 존재");
    } else {
      console.log("❌ TouchController 없음");
    }

    if (window.mahjongApp.ui) {
      console.log("✅ UI 존재");
    } else {
      console.log("❌ UI 없음");
    }

    if (window.mahjongApp.eventManager) {
      console.log("✅ EventManager 존재");
    } else {
      console.log("❌ EventManager 없음");
    }
  },

  // 12. 강제 초기화
  forceInit: async () => {
    console.log("🔧 강제 초기화 시도...");

    if (!window.mahjongApp) {
      console.error("MahjongApp이 없어서 초기화할 수 없습니다.");
      return;
    }

    try {
      if (!window.mahjongApp.isInitialized) {
        console.log("초기화 재시도...");
        await window.mahjongApp.init();
      }

      if (window.mahjongApp.loadingScreen) {
        window.mahjongApp.loadingScreen.style.display = "none";
        console.log("✅ 로딩 화면 제거");
      }

      if (window.mahjongApp.showStartMenu) {
        window.mahjongApp.showStartMenu();
        console.log("✅ 시작 메뉴 표시");
      }
    } catch (error) {
      console.error("강제 초기화 실패:", error);
    }
  },

  // 13. 도움말
  help: () => {
    console.log(`
🀄 마작 타일 디버그 명령어:

🚨 로딩 화면에서 멈춘 경우:
debugTiles.checkInit()        - 초기화 상태 확인
debugTiles.forceInit()        - 강제 초기화 시도

기본 명령어:
debugTiles.safeStart()         - 안전한 게임 시작 (디버그 없이)
debugTiles.status()           - 게임 상태 확인
debugTiles.checkRotations()   - 패 회전 상태 확인 ⭐ 
debugTiles.forceRotation(1, -90) - 플레이어1 패를 -90도로 강제 회전 ⭐

테스트 명령어:
debugTiles.testAll()           - 모든 플레이어 패 배치 테스트
debugTiles.testPlayer(0-3)     - 특정 플레이어 테스트
debugTiles.simulateDiscards(6) - 버린패 시뮬레이션
debugTiles.rearrangeAll()      - 모든 패 즉시 재배치
debugTiles.testLayouts()       - TileManager 레이아웃 테스트
debugTiles.toggleDebug()       - 디버그 모드 ON/OFF

🔧 문제 해결 단계:
1. debugTiles.checkInit()      - 초기화 상태 확인
2. debugTiles.forceInit()      - 문제 있으면 강제 초기화
3. debugTiles.safeStart()      - 게임 시작
4. debugTiles.checkRotations() - 회전 상태 확인

회전 문제 해결:
debugTiles.forceRotation(1, -90) - 우측 플레이어 -90도 강제 적용
debugTiles.forceRotation(3, 90)  - 좌측 플레이어 +90도 강제 적용
    `);
  },
};

// 초기 도움말 표시 및 게임 상태 확인
setTimeout(() => {
  console.log(`
🎮 마작 게임 로드 완료!

⚠️ 게임이 로딩 화면에서 멈춰있다면:

1. 브라우저 콘솔에서 오류 메시지 확인
2. debugTiles.forceInit() - 강제 초기화 시도
3. debugTiles.checkInit() - 초기화 상태 확인

정상 작동 시:
1. debugTiles.safeStart()  - 안전한 게임 시작
2. debugTiles.status()     - 게임 상태 확인
3. debugTiles.help()       - 전체 명령어 보기

게임 시작 후 각종 테스트를 진행할 수 있습니다.
`);

  // 게임 상태 확인
  if (window.mahjongApp) {
    console.log("✅ MahjongApp 초기화됨");
    if (window.mahjongApp.isInitialized) {
      console.log("✅ 게임 시스템 초기화 완료");
    } else {
      console.log("❌ 게임 시스템 초기화 실패 - debugTiles.forceInit() 시도");
    }
  } else {
    console.log("❌ MahjongApp 초기화 실패");
  }
}, 2000); // 2초 후 실행
