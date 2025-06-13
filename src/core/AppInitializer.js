// src/core/AppInitializer.js - 앱 초기화 로직 분리
export class AppInitializer {
  constructor() {
    this.modules = new Map();
    this.loadingCallbacks = [];
  }

  // 로딩 상태 콜백 등록
  onLoadingUpdate(callback) {
    this.loadingCallbacks.push(callback);
  }

  // 로딩 상태 업데이트
  updateLoading(message) {
    console.log(message);
    this.loadingCallbacks.forEach((callback) => {
      try {
        callback(message);
      } catch (error) {
        console.warn("로딩 콜백 오류:", error);
      }
    });
  }

  // 모든 모듈 로드
  async loadAllModules() {
    this.updateLoading("📦 모듈 로딩 중...");

    const moduleConfigs = [
      {
        name: "SceneManager",
        path: "./graphics/SceneManager.js",
        exportName: "SceneManager",
        required: true,
      },
      {
        name: "MahjongGame",
        path: "./game/MahjongGame.js",
        exportName: "MahjongGame",
        required: true,
      },
      {
        name: "TouchController",
        path: "./input/TouchController.js",
        exportName: "TouchController",
        required: true,
      },
      {
        name: "SimpleGameUI",
        path: "./ui/SimpleGameUI.js",
        exportName: "SimpleGameUI",
        required: false,
      },
      {
        name: "EventManager",
        path: "./events/EventManager.js",
        exportName: "EventManager",
        required: false,
      },
    ];

    const results = await Promise.allSettled(
      moduleConfigs.map((config) => this.loadModule(config))
    );

    // 결과 분석
    let loadedCount = 0;
    let failedModules = [];

    results.forEach((result, index) => {
      const config = moduleConfigs[index];
      if (result.status === "fulfilled") {
        loadedCount++;
        console.log(`✅ ${config.name} 로드 완료`);
      } else {
        failedModules.push(config.name);
        console.error(`❌ ${config.name} 로드 실패:`, result.reason);

        // 필수 모듈이 실패하면 에러 발생
        if (config.required) {
          throw new Error(
            `필수 모듈 ${config.name} 로드 실패: ${result.reason.message}`
          );
        }
      }
    });

    console.log(
      `📦 모듈 로딩 완료: ${loadedCount}/${moduleConfigs.length}개 성공`
    );

    if (failedModules.length > 0) {
      console.warn("실패한 모듈들:", failedModules);
    }

    return this.modules;
  }

  // 개별 모듈 로드
  async loadModule(config) {
    try {
      const module = await import(config.path);
      const exportedClass = module[config.exportName];

      if (!exportedClass) {
        throw new Error(`${config.exportName} export를 찾을 수 없습니다.`);
      }

      this.modules.set(config.name, exportedClass);
      return exportedClass;
    } catch (error) {
      console.error(`모듈 ${config.name} 로드 중 오류:`, error);
      throw error;
    }
  }

  // 모듈 가져오기
  getModule(name) {
    return this.modules.get(name);
  }

  // 모든 모듈이 로드되었는지 확인
  areAllModulesLoaded() {
    const requiredModules = ["SceneManager", "MahjongGame", "TouchController"];
    return requiredModules.every((name) => this.modules.has(name));
  }

  // 시스템 초기화 순서
  async initializeSystems(app) {
    const systems = [];

    try {
      // 1. SceneManager 초기화
      this.updateLoading("3D 씬 초기화 중...");
      if (this.modules.has("SceneManager")) {
        const SceneManager = this.modules.get("SceneManager");
        app.sceneManager = new SceneManager(app.canvas);
        await app.sceneManager.init();
        systems.push("SceneManager");
      }

      // 2. MahjongGame 초기화
      this.updateLoading("게임 시스템 초기화 중...");
      if (this.modules.has("MahjongGame") && app.sceneManager) {
        const MahjongGame = this.modules.get("MahjongGame");
        app.game = new MahjongGame(app.sceneManager);
        await app.game.init();
        systems.push("MahjongGame");
      }

      // 3. TouchController 초기화
      this.updateLoading("입력 시스템 초기화 중...");
      if (this.modules.has("TouchController") && app.sceneManager) {
        const TouchController = this.modules.get("TouchController");
        app.touchController = new TouchController(
          app.sceneManager.camera,
          app.sceneManager.scene,
          app.canvas
        );
        systems.push("TouchController");
      }

      // 4. SimpleGameUI 초기화 (선택적)
      this.updateLoading("UI 초기화 중...");
      if (this.modules.has("SimpleGameUI")) {
        const SimpleGameUI = this.modules.get("SimpleGameUI");
        app.ui = new SimpleGameUI();
        systems.push("SimpleGameUI");
      }

      // 5. EventManager 초기화 (선택적)
      this.updateLoading("이벤트 시스템 초기화 중...");
      if (this.modules.has("EventManager")) {
        const EventManager = this.modules.get("EventManager");
        app.eventManager = new EventManager(
          app.game,
          app.ui,
          app.touchController
        );
        systems.push("EventManager");
      }

      console.log(`✅ 시스템 초기화 완료: ${systems.join(", ")}`);
      return systems;
    } catch (error) {
      console.error("시스템 초기화 실패:", error);
      console.log("초기화된 시스템들:", systems);
      throw error;
    }
  }

  // 초기화 상태 검증
  validateInitialization(app) {
    const checks = [];

    // 필수 컴포넌트 체크
    const requiredComponents = [
      { name: "canvas", obj: app.canvas },
      { name: "sceneManager", obj: app.sceneManager },
      { name: "game", obj: app.game },
    ];

    requiredComponents.forEach((component) => {
      const isValid = component.obj != null;
      checks.push({
        name: component.name,
        status: isValid ? "✅" : "❌",
        required: true,
        valid: isValid,
      });
    });

    // 선택적 컴포넌트 체크
    const optionalComponents = [
      { name: "touchController", obj: app.touchController },
      { name: "ui", obj: app.ui },
      { name: "eventManager", obj: app.eventManager },
    ];

    optionalComponents.forEach((component) => {
      const isValid = component.obj != null;
      checks.push({
        name: component.name,
        status: isValid ? "✅" : "⚠️",
        required: false,
        valid: isValid,
      });
    });

    // 게임 하위 시스템 체크
    if (app.game) {
      const gameSubsystems = [
        { name: "tileManager", obj: app.game.tileManager },
        { name: "players", obj: app.game.players },
        { name: "wallTiles", obj: app.game.wallTiles },
      ];

      gameSubsystems.forEach((subsystem) => {
        const isValid = subsystem.obj != null;
        checks.push({
          name: `game.${subsystem.name}`,
          status: isValid ? "✅" : "⚠️",
          required: false,
          valid: isValid,
        });
      });
    }

    // 검증 결과 출력
    console.log("=== 초기화 검증 결과 ===");
    checks.forEach((check) => {
      console.log(
        `${check.status} ${check.name} ${check.required ? "(필수)" : "(선택)"}`
      );
    });

    // 필수 컴포넌트 실패 체크
    const failedRequired = checks.filter(
      (check) => check.required && !check.valid
    );
    const failedOptional = checks.filter(
      (check) => !check.required && !check.valid
    );

    if (failedRequired.length > 0) {
      const failedNames = failedRequired.map((check) => check.name).join(", ");
      throw new Error(`필수 컴포넌트 초기화 실패: ${failedNames}`);
    }

    if (failedOptional.length > 0) {
      const failedNames = failedOptional.map((check) => check.name).join(", ");
      console.warn(`선택적 컴포넌트 초기화 실패: ${failedNames}`);
    }

    console.log("✅ 초기화 검증 통과");
    return {
      success: true,
      failedRequired: failedRequired.length,
      failedOptional: failedOptional.length,
      checks,
    };
  }

  // 에러 복구 시도
  async attemptRecovery(app, error) {
    console.log("🔧 에러 복구 시도 중...");

    try {
      // 기본적인 복구 시도들
      const recoverySteps = [
        {
          name: "캔버스 재확인",
          action: () => {
            if (!app.canvas) {
              app.canvas = document.getElementById("gameCanvas");
              if (!app.canvas) {
                throw new Error("캔버스를 찾을 수 없습니다.");
              }
            }
          },
        },
        {
          name: "모듈 재로드",
          action: async () => {
            this.modules.clear();
            await this.loadAllModules();
          },
        },
        {
          name: "시스템 재초기화",
          action: async () => {
            await this.initializeSystems(app);
          },
        },
      ];

      for (const step of recoverySteps) {
        try {
          console.log(`시도 중: ${step.name}`);
          await step.action();
          console.log(`✅ ${step.name} 완료`);
        } catch (stepError) {
          console.error(`❌ ${step.name} 실패:`, stepError);
        }
      }

      // 복구 후 검증
      const validation = this.validateInitialization(app);

      if (validation.failedRequired === 0) {
        console.log("✅ 에러 복구 성공");
        return true;
      } else {
        console.error("❌ 에러 복구 실패");
        return false;
      }
    } catch (recoveryError) {
      console.error("복구 과정에서 오류:", recoveryError);
      return false;
    }
  }

  // 정리
  dispose() {
    this.modules.clear();
    this.loadingCallbacks = [];
    console.log("AppInitializer 정리 완료");
  }
}
