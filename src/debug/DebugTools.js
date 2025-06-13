// src/debug/DebugTools.js - 디버그 도구 모음
export class DebugTools {
  constructor(app) {
    this.app = app;
    this.isInitialized = false;
  }

  init() {
    this.setupBasicTools();
    this.setupAdvancedTools();
    this.setupAutoDetection();
    this.isInitialized = true;

    // 초기 도움말 표시
    setTimeout(() => this.showWelcomeMessage(), 1000);
  }

  setupBasicTools() {
    window.debugTiles = {
      // 1. 게임 상태 확인
      status: () => {
        if (!this.app.game) {
          console.error("게임이 초기화되지 않았습니다.");
          return;
        }

        try {
          const debug = this.app.game.getDebugInfo();
          console.table(debug.players);
          console.log("상세 정보:", debug);
        } catch (error) {
          console.error("status 실행 중 오류:", error);
        }
      },

      // 2. 초기화 상태 확인
      checkInit: () => {
        console.log("=== 초기화 상태 확인 ===");

        if (!this.app) {
          console.log("❌ MahjongApp이 없음");
          return;
        }

        console.log("✅ MahjongApp 존재");
        console.log("  - isInitialized:", this.app.isInitialized);

        const components = [
          { name: "SceneManager", obj: this.app.sceneManager },
          { name: "Game", obj: this.app.game },
          { name: "TouchController", obj: this.app.touchController },
          { name: "UI", obj: this.app.ui },
          { name: "EventManager", obj: this.app.eventManager },
        ];

        components.forEach((comp) => {
          if (comp.obj) {
            console.log(`✅ ${comp.name} 존재`);
            if (comp.name === "Game" && comp.obj.tileManager) {
              console.log("✅ TileManager 존재");
            }
          } else {
            console.log(`❌ ${comp.name} 없음`);
          }
        });
      },

      // 3. 패 회전 상태 확인
      checkRotations: () => {
        if (!this.app.game) {
          console.error("게임이 초기화되지 않았습니다.");
          return;
        }

        console.log("=== 패 회전 상태 확인 ===");

        for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
          const player = this.app.game.players[playerIndex];
          if (!player || player.hand.length === 0) {
            console.log(`플레이어 ${playerIndex}: 손패 없음`);
            continue;
          }

          console.log(`\n플레이어 ${playerIndex} (${player.name}):`);

          // TileManager 설정 확인
          if (this.app.game.tileManager?.playerPositions) {
            const config =
              this.app.game.tileManager.playerPositions[playerIndex];
            if (config) {
              const expectedRotation = config.hand.rotation;
              console.log(
                `  설정된 회전: (${expectedRotation.x.toFixed(
                  2
                )}, ${expectedRotation.y.toFixed(
                  2
                )}, ${expectedRotation.z.toFixed(2)})`
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

      // 4. 특정 플레이어 회전 강제 적용 (개선된 버전)
      forceRotation: (playerIndex, degrees) => {
        if (!this.app.game) {
          console.error("게임이 초기화되지 않았습니다.");
          return;
        }

        const player = this.app.game.players[playerIndex];
        if (!player) {
          console.error(`플레이어 ${playerIndex}를 찾을 수 없습니다.`);
          return;
        }

        const radians = (degrees * Math.PI) / 180;
        console.log(`플레이어 ${playerIndex} 패들을 ${degrees}도로 회전 적용`);

        player.hand.forEach((tile, i) => {
          if (tile.mesh) {
            tile.mesh.rotation.y = radians;
            if (i < 3) {
              // 처음 3장만 로그
              console.log(
                `  패 ${i} (${tile.toString()}) 회전 적용: ${degrees}도`
              );
            }
          }
        });

        console.log("✅ 회전 적용 완료");
      },

      // 4-1. 올바른 회전 적용 (표준 마작 배치)
      fixRotations: () => {
        if (!this.app.game) {
          console.error("게임이 초기화되지 않았습니다.");
          return;
        }

        console.log("🔄 표준 마작 패 회전 적용 중...");

        // 표준 회전각도 설정
        const standardRotations = {
          0: 0, // 플레이어: 0도 (앞면)
          1: 90, // 우측 AI: +90도 (시계방향)
          2: 180, // 상단 AI: 180도 (뒤집힘)
          3: -90, // 좌측 AI: -90도 (반시계방향)
        };

        Object.entries(standardRotations).forEach(([playerIndex, degrees]) => {
          const index = parseInt(playerIndex);
          const player = this.app.game.players[index];

          if (player && player.hand.length > 0) {
            const radians = (degrees * Math.PI) / 180;

            player.hand.forEach((tile) => {
              if (tile.mesh) {
                tile.mesh.rotation.y = radians;
              }
            });

            console.log(
              `✓ 플레이어 ${index} (${player.name}): ${degrees}도 적용`
            );
          }
        });

        console.log("✅ 표준 회전 적용 완료");

        // 결과 확인
        setTimeout(() => {
          window.debugTiles.checkRotations();
        }, 500);
      },

      // 5. 안전한 게임 시작
      safeStart: () => {
        if (!this.app.game) {
          console.error("게임이 초기화되지 않았습니다.");
          return;
        }

        try {
          // 디버그 모드 끄기
          this.app.game.debugMode = false;
          if (this.app.game.tileManager?.setDebugMode) {
            this.app.game.tileManager.setDebugMode(false);
          }

          // 게임 시작
          this.app.game.startNewGame();
          console.log("✅ 게임이 안전하게 시작되었습니다.");
        } catch (error) {
          console.error("safeStart 실행 중 오류:", error);
        }
      },

      // 6. 강제 초기화
      forceInit: async () => {
        console.log("🔧 강제 초기화 시도...");

        if (!this.app) {
          console.error("MahjongApp이 없어서 초기화할 수 없습니다.");
          return;
        }

        try {
          if (!this.app.isInitialized) {
            console.log("초기화 재시도...");
            await this.app.init();
          }

          if (this.app.loadingScreen) {
            this.app.loadingScreen.style.display = "none";
            console.log("✅ 로딩 화면 제거");
          }

          if (this.app.showStartMenu) {
            this.app.showStartMenu();
            console.log("✅ 시작 메뉴 표시");
          }
        } catch (error) {
          console.error("강제 초기화 실패:", error);
        }
      },

      // 7. 도움말 (업데이트됨)
      help: () => {
        console.log(`
🀄 마작 타일 디버그 명령어:

🚨 긴급 상황:
debugTiles.checkInit()        - 초기화 상태 확인
debugTiles.forceInit()        - 강제 초기화 시도
debugTiles.hardReset()        - 완전 초기화

🎮 기본 명령어:
debugTiles.safeStart()        - 안전한 게임 시작
debugTiles.status()           - 게임 상태 확인
debugTiles.checkRotations()   - 패 회전 상태 확인 ⭐

🔄 회전 관련 (새로 추가):
debugTiles.fixRotations()     - 표준 마작 회전 적용 ⭐⭐⭐
debugTiles.forceRotation(1, 90)  - 플레이어1 패를 90도로 회전
debugTiles.forceRotation(3, -90) - 플레이어3 패를 -90도로 회전

🚀 문제 해결:
debugTiles.quickFix()         - 원스톱 문제 해결 (회전 포함) ⭐⭐⭐
debugTiles.fixEmptyHands()    - 빈 손패 문제 해결
debugTiles.fixOverlapping()   - 패 겹침 문제 해결
debugTiles.autoDetectIssues() - 문제 자동 감지

📷 시각적 확인:
debugTiles.visualCheck()      - 전체 뷰로 카메라 이동
debugTiles.visualCheck(0-3)   - 특정 플레이어 뷰

🧪 테스트:
debugTiles.testAll()          - 모든 플레이어 패 배치 테스트
debugTiles.testPlayer(0-3)    - 특정 플레이어 테스트
debugTiles.simulateDiscards(6) - 버린패 시뮬레이션

💡 회전 문제 해결 순서:
1. debugTiles.quickFix()      - 모든 문제를 한 번에 해결 ⭐
2. debugTiles.fixRotations()  - 회전만 따로 수정
3. debugTiles.visualCheck()   - 결과 확인

📐 회전 기준:
- 플레이어 0 (하단): 0도 (정면)
- 플레이어 1 (우측): +90도 (시계방향)
- 플레이어 2 (상단): 180도 (뒤집힌 상태)
- 플레이어 3 (좌측): -90도 (반시계방향)
        `);
      },
    };
  }

  setupAdvancedTools() {
    // 고급 도구들을 추가
    Object.assign(window.debugTiles, {
      // 빈 손패 문제 해결
      fixEmptyHands: () => {
        if (!this.app.game) {
          console.error("게임이 초기화되지 않았습니다.");
          return;
        }

        console.log("🔧 빈 손패 문제 해결 중...");

        let fixedPlayers = 0;
        this.app.game.players.forEach((player, index) => {
          if (player.hand.length === 0) {
            console.log(
              `플레이어 ${index} (${player.name}) 손패가 비어있음 - 테스트 데이터 생성`
            );

            if (this.app.game.generateTestHand) {
              this.app.game.generateTestHand(index);
              fixedPlayers++;
            }
          }
        });

        if (fixedPlayers > 0) {
          console.log(`✅ ${fixedPlayers}명의 플레이어 손패 생성 완료`);

          // 재배치
          if (this.app.game.arrangeAllPlayerHands) {
            this.app.game.arrangeAllPlayerHands();
          }
        } else {
          console.log("✅ 모든 플레이어가 손패를 가지고 있습니다.");
        }
      },

      // 겹침 문제 해결
      fixOverlapping: () => {
        if (!this.app.game) {
          console.error("게임이 초기화되지 않았습니다.");
          return;
        }

        try {
          console.log("🔧 패 겹침 문제 해결 시도...");

          // TileManager의 겹침 해결 기능 호출
          if (this.app.game.tileManager?.fixOverlappingTiles) {
            this.app.game.tileManager.fixOverlappingTiles();
          }

          // 게임 차원에서 겹침 해결
          if (this.app.game.fixTileOverlapping) {
            this.app.game.fixTileOverlapping();
          } else {
            // fallback: 모든 패 재배치
            this.app.game.instantArrangeAll();
          }

          console.log("✅ 겹침 문제 해결 완료");

          // 결과 확인
          setTimeout(() => {
            window.debugTiles.checkRotations();
          }, 500);
        } catch (error) {
          console.error("fixOverlapping 실행 중 오류:", error);
        }
      },

      // 빠른 문제 해결 (원스톱) - 회전 문제 포함
      quickFix: () => {
        console.log("🚀 빠른 문제 해결 시작...");

        // 1단계: 빈 손패 해결
        console.log("1️⃣ 빈 손패 문제 해결 중...");
        window.debugTiles.fixEmptyHands();

        setTimeout(() => {
          // 2단계: 겹침 해결
          console.log("2️⃣ 패 겹침 문제 해결 중...");
          window.debugTiles.fixOverlapping();

          setTimeout(() => {
            // 3단계: 회전 문제 해결 (새로 추가)
            console.log("3️⃣ 패 회전 문제 해결 중...");
            window.debugTiles.fixRotations();

            setTimeout(() => {
              // 4단계: 상태 확인
              console.log("4️⃣ 최종 상태 확인 중...");
              window.debugTiles.status();
              window.debugTiles.checkRotations();
              console.log("✅ 빠른 문제 해결 완료!");
            }, 500);
          }, 500);
        }, 500);
      },

      // 시각적 검증 (카메라 이동)
      visualCheck: (playerIndex = -1) => {
        if (!this.app.sceneManager) {
          console.error("SceneManager가 없습니다.");
          return;
        }

        const sm = this.app.sceneManager;

        if (playerIndex === -1) {
          // 전체 뷰
          console.log("📷 전체 뷰로 카메라 이동");
          if (sm.setCameraPosition) {
            sm.setCameraPosition(0, 12, 12);
            sm.setCameraTarget(0, 0, 0);
          }
        } else {
          // 특정 플레이어 뷰
          const positions = [
            { pos: [0, 8, 10], target: [0, 0, 4] }, // 플레이어 0
            { pos: [10, 8, 0], target: [4, 0, 0] }, // 플레이어 1
            { pos: [0, 8, -10], target: [0, 0, -4] }, // 플레이어 2
            { pos: [-10, 8, 0], target: [-4, 0, 0] }, // 플레이어 3
          ];

          if (positions[playerIndex]) {
            console.log(`📷 플레이어 ${playerIndex} 뷰로 카메라 이동`);
            const config = positions[playerIndex];
            sm.setCameraPosition(...config.pos);
            sm.setCameraTarget(...config.target);
          }
        }
      },

      // 완전 초기화 (강력한 리셋)
      hardReset: async () => {
        if (!this.app) {
          console.error("MahjongApp이 없습니다.");
          return;
        }

        console.log("🔄 완전 초기화 중...");

        try {
          // 1. 기존 게임 정리
          if (this.app.game) {
            this.app.game.dispose();
          }

          // 2. 새 게임 생성
          const { MahjongGame } = await import("../game/MahjongGame.js");
          this.app.game = new MahjongGame(this.app.sceneManager);

          // 3. 게임 초기화
          await this.app.game.init();

          // 4. 이벤트 관리자 재연결
          if (this.app.eventManager) {
            this.app.eventManager.game = this.app.game;
          }

          console.log("✅ 완전 초기화 완료");

          // 5. 상태 확인
          setTimeout(() => {
            window.debugTiles.status();
          }, 1000);
        } catch (error) {
          console.error("완전 초기화 실패:", error);
        }
      },

      // 테스트 관련 도구들
      testAll: () => {
        if (this.app.game?.testAllTileLayouts) {
          this.app.game.testAllTileLayouts();
        } else {
          console.error("testAllTileLayouts 메서드를 찾을 수 없습니다.");
        }
      },

      testPlayer: (playerIndex) => {
        if (this.app.game?.testPlayerTileLayout) {
          this.app.game.testPlayerTileLayout(playerIndex);
        } else {
          console.error("testPlayerTileLayout 메서드를 찾을 수 없습니다.");
        }
      },

      simulateDiscards: (count = 6) => {
        if (this.app.game?.simulateDiscards) {
          this.app.game.simulateDiscards(count);
        } else {
          console.error("simulateDiscards 메서드를 찾을 수 없습니다.");
        }
      },

      rearrangeAll: () => {
        if (this.app.game?.instantArrangeAll) {
          this.app.game.instantArrangeAll();
        } else {
          console.error("instantArrangeAll 메서드를 찾을 수 없습니다.");
        }
      },

      testLayouts: () => {
        if (this.app.game?.tileManager?.testAllLayouts) {
          this.app.game.tileManager.testAllLayouts();
        } else {
          console.error(
            "TileManager testAllLayouts 메서드를 찾을 수 없습니다."
          );
        }
      },

      toggleDebug: () => {
        if (this.app.game?.tileManager) {
          const current = this.app.game.debugMode;
          this.app.game.debugMode = !current;
          if (this.app.game.tileManager.setDebugMode) {
            this.app.game.tileManager.setDebugMode(!current);
          }
          console.log(`디버그 모드: ${!current ? "활성화" : "비활성화"}`);
        }
      },
    });
  }

  setupAutoDetection() {
    // 자동 문제 감지 도구
    window.debugTiles.autoDetectIssues = () => {
      console.log("🔍 문제 자동 감지 중...");

      const issues = [];
      const solutions = [];

      if (!this.app) {
        issues.push("MahjongApp이 초기화되지 않음");
        solutions.push("debugTiles.forceInit()");
        return { issues, solutions };
      }

      if (!this.app.isInitialized) {
        issues.push("게임 시스템이 초기화되지 않음");
        solutions.push("debugTiles.forceInit()");
      }

      if (!this.app.game) {
        issues.push("게임 객체가 없음");
        solutions.push("debugTiles.hardReset()");
        return { issues, solutions };
      }

      // 빈 손패 체크
      let emptyHandCount = 0;
      this.app.game.players.forEach((player, index) => {
        if (player.hand.length === 0) {
          emptyHandCount++;
          issues.push(`플레이어 ${index}의 손패가 비어있음`);
        }
      });

      if (emptyHandCount > 0) {
        solutions.push("debugTiles.fixEmptyHands()");
      }

      // TileManager 체크
      if (!this.app.game.tileManager) {
        issues.push("TileManager가 없음");
        solutions.push("debugTiles.hardReset()");
      }

      // 겹침 가능성 체크
      const playerPositions = [];
      let hasOverlapping = false;

      this.app.game.players.forEach((player, index) => {
        if (player.hand.length > 0 && player.hand[0].mesh) {
          const pos = player.hand[0].mesh.position;
          playerPositions.push({ index, x: pos.x, z: pos.z });
        }
      });

      // 너무 가까운 플레이어 체크
      for (let i = 0; i < playerPositions.length; i++) {
        for (let j = i + 1; j < playerPositions.length; j++) {
          const a = playerPositions[i];
          const b = playerPositions[j];
          const distance = Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);

          if (distance < 3) {
            // 3 단위보다 가까우면 겹칠 가능성
            hasOverlapping = true;
            issues.push(
              `플레이어 ${a.index}와 ${
                b.index
              }의 패가 너무 가까움 (거리: ${distance.toFixed(2)})`
            );
          }
        }
      }

      if (hasOverlapping) {
        solutions.push("debugTiles.fixOverlapping()");
      }

      // 결과 출력
      if (issues.length === 0) {
        console.log("✅ 문제가 발견되지 않았습니다!");
        return { issues: [], solutions: [] };
      }

      console.log("⚠️ 발견된 문제들:");
      issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });

      console.log("\n💡 권장 해결 방법:");
      [...new Set(solutions)].forEach((solution, index) => {
        console.log(`  ${index + 1}. ${solution}`);
      });

      console.log("\n🚀 빠른 해결: debugTiles.quickFix()");

      return { issues, solutions };
    };

    // 거리 측정 도구
    window.debugTiles.measureDistances = () => {
      if (!this.app.game?.tileManager) {
        console.error("TileManager가 초기화되지 않았습니다.");
        return;
      }

      console.log("=== 플레이어 간 거리 측정 ===");

      const tm = this.app.game.tileManager;

      if (tm.getDistanceBetweenPlayers) {
        const pairs = [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0], // 인접한 플레이어들
          [0, 2],
          [1, 3], // 대각선 플레이어들
        ];

        pairs.forEach(([a, b]) => {
          const distance = tm.getDistanceBetweenPlayers(a, b);
          console.log(`플레이어 ${a} ↔ ${b}: ${distance.toFixed(2)} 단위`);
        });
      }

      // 실제 패들의 위치도 확인
      console.log("\n=== 실제 패 위치 확인 ===");
      this.app.game.players.forEach((player, index) => {
        if (player.hand.length > 0) {
          const firstTile = player.hand[0];
          if (firstTile.mesh) {
            const pos = firstTile.mesh.position;
            console.log(
              `플레이어 ${index} 첫 번째 패: (${pos.x.toFixed(
                2
              )}, ${pos.z.toFixed(2)})`
            );
          }
        }
      });
    };
  }

  showWelcomeMessage() {
    console.log(`
🎮 마작 게임 디버그 도구 준비 완료!

⚠️ 게임이 로딩 화면에서 멈춰있다면:
1. debugTiles.checkInit() - 초기화 상태 확인
2. debugTiles.forceInit() - 강제 초기화 시도

🚀 패 겹침 문제 해결:
debugTiles.quickFix()     - 원스톱 해결 (권장)
debugTiles.visualCheck()  - 결과 확인

📖 전체 명령어: debugTiles.help()

정상 작동 시:
1. debugTiles.safeStart() - 안전한 게임 시작
2. debugTiles.status()    - 게임 상태 확인
    `);

    // 게임 상태 자동 확인
    if (this.app) {
      console.log("✅ MahjongApp 초기화됨");
      if (this.app.isInitialized) {
        console.log("✅ 게임 시스템 초기화 완료");
      } else {
        console.log(
          "❌ 게임 시스템 초기화 실패 - debugTiles.forceInit() 시도 권장"
        );
      }
    } else {
      console.log("❌ MahjongApp 초기화 실패");
    }
  }

  // 성능 모니터링 (선택적)
  startMonitoring() {
    if (this._monitoring) {
      console.log("이미 모니터링 중입니다.");
      return;
    }

    console.log("📊 게임 상태 모니터링 시작 (10초마다 체크)");

    this._monitoring = setInterval(() => {
      const issues = window.debugTiles.autoDetectIssues();

      if (issues.issues.length > 0) {
        console.log("⚠️ 문제 감지됨!");

        // 자동 해결 시도 (선택적)
        if (
          confirm("문제가 감지되었습니다. 자동으로 해결을 시도하시겠습니까?")
        ) {
          window.debugTiles.quickFix();
        }
      }
    }, 10000);

    // 모니터링 제어 도구 추가
    window.debugTiles.stopMonitoring = () => {
      if (this._monitoring) {
        clearInterval(this._monitoring);
        this._monitoring = null;
        console.log("📊 모니터링 중지");
      }
    };
  }

  // 성능 최적화
  optimizePerformance() {
    console.log("⚡ 성능 최적화 적용 중...");

    if (this.app.sceneManager) {
      const sm = this.app.sceneManager;

      // 픽셀 비율 조정
      if (sm.renderer) {
        sm.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        console.log("✓ 픽셀 비율 최적화");
      }

      // 그림자 품질 조정
      const lights = sm.scene.children.filter(
        (child) => child instanceof THREE.DirectionalLight && child.castShadow
      );

      lights.forEach((light) => {
        if (light.shadow.mapSize.width > 1024) {
          light.shadow.mapSize.setScalar(1024);
        }
      });

      if (lights.length > 0) {
        console.log("✓ 그림자 품질 최적화");
      }
    }

    console.log("✅ 성능 최적화 완료");

    // 성능 최적화 도구를 debugTiles에 추가
    window.debugTiles.optimizePerformance = () => this.optimizePerformance();
  }

  dispose() {
    // 모니터링 중지
    if (this._monitoring) {
      clearInterval(this._monitoring);
      this._monitoring = null;
    }

    // 전역 객체 정리
    if (window.debugTiles) {
      delete window.debugTiles;
    }

    this.isInitialized = false;
    console.log("디버그 도구 정리 완료");
  }
}
