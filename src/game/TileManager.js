// src/game/TileManager.js (수정된 버전 - 겹침 문제 해결)
import * as THREE from "three";

export class TileManager {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;

    // 배치 설정
    this.tileSize = {
      width: 0.55,
      height: 0.7,
      depth: 0.35,
    };

    // 플레이어 위치 설정 (4명 기준) - 겹침 방지를 위해 거리 조정
    this.playerPositions = this.setupPlayerPositions();

    // 디버그 모드
    this.debugMode = true;
  }

  setupPlayerPositions() {
    return {
      // 플레이어 0: East (하단, 인간) - 가로 배치
      0: {
        hand: {
          basePosition: new THREE.Vector3(0, 0.35, 5.5), // Z 위치를 더 멀리
          direction: new THREE.Vector3(1, 0, 0), // 가로 배치 (X축)
          rotation: new THREE.Euler(0, 0, 0), // 앞면 (0도)
        },
        discard: {
          basePosition: new THREE.Vector3(0, 0.05, 3.0), // 버린패도 더 멀리
          direction: new THREE.Vector3(1, 0, 0),
          rotation: new THREE.Euler(Math.PI / 2, 0, 0), // 눕히기
        },
      },

      // 플레이어 1: South (우측, AI) - 세로 배치 (시계방향 90도)
      1: {
        hand: {
          basePosition: new THREE.Vector3(5.5, 0.35, 0), // X 위치를 더 멀리
          direction: new THREE.Vector3(0, 0, 1), // 세로 배치 (Z축)
          rotation: new THREE.Euler(0, Math.PI / 2, 0), // +90도 회전 (시계방향)
        },
        discard: {
          basePosition: new THREE.Vector3(3.0, 0.05, 0), // 버린패도 더 멀리
          direction: new THREE.Vector3(0, 0, 1),
          rotation: new THREE.Euler(Math.PI / 2, 0, 0), // 눕히기
        },
      },

      // 플레이어 2: West (상단, AI) - 가로 배치 (180도)
      2: {
        hand: {
          basePosition: new THREE.Vector3(0, 0.35, -5.5), // Z 위치를 더 멀리 (음수)
          direction: new THREE.Vector3(-1, 0, 0), // 가로 배치 (X축 반대)
          rotation: new THREE.Euler(0, Math.PI, 0), // 180도 회전 (뒷면)
        },
        discard: {
          basePosition: new THREE.Vector3(0, 0.05, -3.0), // 버린패도 더 멀리
          direction: new THREE.Vector3(-1, 0, 0),
          rotation: new THREE.Euler(Math.PI / 2, 0, 0), // 눕히기
        },
      },

      // 플레이어 3: North (좌측, AI) - 세로 배치 (반시계방향 90도)
      3: {
        hand: {
          basePosition: new THREE.Vector3(-5.5, 0.35, 0), // X 위치를 더 멀리 (음수)
          direction: new THREE.Vector3(0, 0, -1), // 세로 배치 (Z축 반대)
          rotation: new THREE.Euler(0, -Math.PI / 2, 0), // -90도 회전 (반시계방향)
        },
        discard: {
          basePosition: new THREE.Vector3(-3.0, 0.05, 0), // 버린패도 더 멀리
          direction: new THREE.Vector3(0, 0, -1),
          rotation: new THREE.Euler(Math.PI / 2, 0, 0), // 눕히기
        },
      },
    };
  }

  // === 손패 배치 (회전 유지 수정 버전) ===

  arrangePlayerHand(playerIndex, tiles) {
    const config = this.playerPositions[playerIndex];
    if (!config) {
      console.error(`플레이어 ${playerIndex} 설정을 찾을 수 없습니다.`);
      return;
    }

    const { basePosition, direction, rotation } = config.hand;
    const isHuman = playerIndex === 0;

    if (this.debugMode) {
      console.log(`플레이어 ${playerIndex} 손패 배치 시작 (${tiles.length}장)`);
      console.log(
        `기준점: (${basePosition.x}, ${basePosition.y}, ${basePosition.z})`
      );
      console.log(`방향: (${direction.x}, ${direction.y}, ${direction.z})`);
      console.log(`회전: (${rotation.x}, ${rotation.y}, ${rotation.z})`);
    }

    // 패 배치 간격 계산 (겹침 방지)
    const spacing = this.tileSize.width * 1.05; // 5% 여유 공간

    tiles.forEach((tile, index) => {
      // 위치 계산 (중앙 정렬)
      const offset = (index - (tiles.length - 1) / 2) * spacing;
      const position = basePosition
        .clone()
        .add(direction.clone().multiplyScalar(offset));

      // 패 설정
      tile.setPosition(position.x, position.y, position.z);

      // 회전 설정 (강제로 올바른 회전 적용)
      this.setCorrectRotation(tile, playerIndex);

      tile.setRevealed(isHuman); // 인간만 앞면
      tile.owner = `player${playerIndex}`;
      tile.mesh.userData.selectable = isHuman; // 인간만 선택 가능

      if (this.debugMode && index < 3) {
        // 처음 3장만 로그
        console.log(
          `  타일 ${index}: ${tile.toString()} at (${position.x.toFixed(
            2
          )}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}) 회전: ${(
            (tile.mesh.rotation.y * 180) /
            Math.PI
          ).toFixed(0)}도`
        );
      }
    });

    if (this.debugMode) {
      console.log(`플레이어 ${playerIndex} 손패 배치 완료`);
    }
  }

  // 올바른 회전 강제 적용 (안전한 버전)
  setCorrectRotation(tile, playerIndex) {
    // mesh가 없으면 실행하지 않음 (테스트용 가상 타일 대응)
    if (!tile.mesh) {
      return;
    }

    // 플레이어별 표준 회전각 (라디안)
    const standardRotations = {
      0: 0, // 플레이어: 0도 (앞면)
      1: Math.PI / 2, // 우측 AI: +90도 (시계방향)
      2: Math.PI, // 상단 AI: 180도 (뒤집힌 상태)
      3: -Math.PI / 2, // 좌측 AI: -90도 (반시계방향)
    };

    const correctRotation = standardRotations[playerIndex] || 0;

    // 안전하게 회전 적용
    if (typeof tile.setRotation === "function") {
      tile.setRotation(0, correctRotation, 0);
    }

    // 추가 보험: mesh에 직접 적용 (mesh가 존재할 때만)
    if (tile.mesh && tile.mesh.rotation) {
      tile.mesh.rotation.x = 0;
      tile.mesh.rotation.y = correctRotation;
      tile.mesh.rotation.z = 0;
    }
  }

  // === 테스트 모드 (개선된 버전 - 오류 방지) ===

  testPlayerLayout(playerIndex, tileCount = 13) {
    console.log(`=== 플레이어 ${playerIndex} 레이아웃 테스트 ===`);

    const config = this.playerPositions[playerIndex];
    if (!config) {
      console.error("플레이어 설정을 찾을 수 없습니다.");
      return;
    }

    console.log("설정 정보:");
    console.log(
      `  손패 기준점: (${config.hand.basePosition.x}, ${config.hand.basePosition.y}, ${config.hand.basePosition.z})`
    );
    console.log(
      `  손패 방향: (${config.hand.direction.x}, ${config.hand.direction.y}, ${config.hand.direction.z})`
    );
    console.log(
      `  손패 회전: ${((config.hand.rotation.y * 180) / Math.PI).toFixed(0)}도`
    );
    console.log(
      `  버린패 기준점: (${config.discard.basePosition.x}, ${config.discard.basePosition.y}, ${config.discard.basePosition.z})`
    );

    // 테스트용 가상 타일들 (안전한 버전)
    const testTiles = [];
    for (let i = 0; i < tileCount; i++) {
      const mockTile = {
        toString: () => `테스트${i}`,
        setPosition: (x, y, z) => {
          console.log(
            `  타일 ${i}: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`
          );
          mockTile.position = { x, y, z };
        },
        setRotation: (x, y, z) => {
          console.log(`  회전 ${i}: ${((y * 180) / Math.PI).toFixed(0)}도`);
          mockTile.rotation = { x, y, z };
        },
        setRevealed: (revealed) => console.log(`  공개 ${i}: ${revealed}`),
        setDiscarded: (discarded) => console.log(`  버림 ${i}: ${discarded}`),
        // mesh는 null로 설정 (테스트용)
        mesh: null,
        owner: null,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      };
      testTiles.push(mockTile);
    }

    console.log("손패 배치 테스트:");
    // arrangePlayerHand를 직접 호출하지 않고 안전한 버전으로 테스트
    this.safeTestArrangement(playerIndex, testTiles.slice(0, 13), "hand");

    console.log("버린패 배치 테스트:");
    this.safeTestArrangement(playerIndex, testTiles.slice(0, 6), "discard");

    // 겹침 검사
    console.log("겹침 검사:");
    this.checkOverlap(testTiles.slice(0, 13));
  }

  // 안전한 테스트 배치 메서드
  safeTestArrangement(playerIndex, tiles, type) {
    const config = this.playerPositions[playerIndex];
    const arrangement = config[type]; // hand 또는 discard
    const { basePosition, direction, rotation } = arrangement;

    console.log(`${type} 배치 시작 (${tiles.length}장)`);
    console.log(
      `기준점: (${basePosition.x}, ${basePosition.y}, ${basePosition.z})`
    );
    console.log(`방향: (${direction.x}, ${direction.y}, ${direction.z})`);
    console.log(`회전: (${rotation.x}, ${rotation.y}, ${rotation.z})`);

    if (type === "hand") {
      // 손패 배치 로직
      const spacing = this.tileSize.width * 1.05;
      tiles.forEach((tile, index) => {
        const offset = (index - (tiles.length - 1) / 2) * spacing;
        const position = basePosition
          .clone()
          .add(direction.clone().multiplyScalar(offset));

        tile.setPosition(position.x, position.y, position.z);
        tile.setRotation(rotation.x, rotation.y, rotation.z);

        if (index < 3) {
          // 처음 3장만 로그
          console.log(
            `  타일 ${index}: ${tile.toString()} at (${position.x.toFixed(
              2
            )}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}) 회전: ${(
              (rotation.y * 180) /
              Math.PI
            ).toFixed(0)}도`
          );
        }
      });
    } else {
      // 버린패 배치 로직 (간단 버전)
      tiles.forEach((tile, index) => {
        const row = Math.floor(index / 6);
        const col = index % 6;
        const spacing = this.tileSize.width * 1.1;
        const rowSpacing = this.tileSize.depth * 1.2;

        let position;
        switch (playerIndex) {
          case 0:
            position = basePosition
              .clone()
              .add(
                new THREE.Vector3((col - 2.5) * spacing, 0, row * rowSpacing)
              );
            break;
          case 1:
            position = basePosition
              .clone()
              .add(
                new THREE.Vector3(-row * rowSpacing, 0, (col - 2.5) * spacing)
              );
            break;
          case 2:
            position = basePosition
              .clone()
              .add(
                new THREE.Vector3(-(col - 2.5) * spacing, 0, -row * rowSpacing)
              );
            break;
          case 3:
            position = basePosition
              .clone()
              .add(
                new THREE.Vector3(row * rowSpacing, 0, -(col - 2.5) * spacing)
              );
            break;
          default:
            position = basePosition.clone();
        }

        tile.setPosition(position.x, position.y, position.z);
        tile.setRotation(rotation.x, rotation.y, rotation.z);
      });
    }
  }

  // 겹침 검사 메서드
  checkOverlap(tiles) {
    const positions = tiles.map(
      (t) => `(${t.position.x.toFixed(1)}, ${t.position.z.toFixed(1)})`
    );
    const uniquePositions = [...new Set(positions)];

    if (positions.length !== uniquePositions.length) {
      console.warn("⚠️ 손패에 겹치는 위치가 있습니다!");
      console.log("위치들:", positions);
    } else {
      console.log("✅ 손패 위치 겹침 없음");
    }
  }

  // === 버린 패 배치 (수정된 버전 - 각 플레이어 기준) ===

  arrangeDiscardedTiles(playerIndex, tiles) {
    const config = this.playerPositions[playerIndex];
    if (!config) {
      console.error(`플레이어 ${playerIndex} 설정을 찾을 수 없습니다.`);
      return;
    }

    const { basePosition, direction, rotation } = config.discard;
    const tilesPerRow = 6; // 한 줄에 6장
    const tileSpacing = this.tileSize.width * 1.1; // 10% 여유 공간
    const rowSpacing = this.tileSize.depth * 1.2; // 20% 여유 공간

    if (this.debugMode) {
      console.log(
        `플레이어 ${playerIndex} 버린패 배치 시작 (${tiles.length}장)`
      );
    }

    tiles.forEach((tile, index) => {
      const row = Math.floor(index / tilesPerRow);
      const col = index % tilesPerRow;

      // 각 플레이어별로 다른 배치 방식 적용
      let position;

      switch (playerIndex) {
        case 0: // 플레이어 0 (하단): 가로로 배치 (세로줄)
          position = basePosition.clone().add(
            new THREE.Vector3(
              (col - (tilesPerRow - 1) / 2) * tileSpacing, // X축으로 가로 배치
              0,
              row * rowSpacing // Z축으로 앞쪽으로 확장
            )
          );
          break;

        case 1: // 플레이어 1 (우측): 세로로 배치 (우측에서 보면 가로줄)
          position = basePosition.clone().add(
            new THREE.Vector3(
              -row * rowSpacing, // X축으로 왼쪽으로 확장
              0,
              (col - (tilesPerRow - 1) / 2) * tileSpacing // Z축으로 세로 배치
            )
          );
          break;

        case 2: // 플레이어 2 (상단): 가로로 배치 (세로줄, 반대 방향)
          position = basePosition.clone().add(
            new THREE.Vector3(
              -(col - (tilesPerRow - 1) / 2) * tileSpacing, // X축으로 가로 배치 (반대)
              0,
              -row * rowSpacing // Z축으로 뒤쪽으로 확장
            )
          );
          break;

        case 3: // 플레이어 3 (좌측): 세로로 배치 (좌측에서 보면 가로줄)
          position = basePosition.clone().add(
            new THREE.Vector3(
              row * rowSpacing, // X축으로 오른쪽으로 확장
              0,
              -(col - (tilesPerRow - 1) / 2) * tileSpacing // Z축으로 세로 배치 (반대)
            )
          );
          break;

        default:
          // 기본값 (플레이어 0과 동일)
          position = basePosition
            .clone()
            .add(
              new THREE.Vector3(
                (col - (tilesPerRow - 1) / 2) * tileSpacing,
                0,
                row * rowSpacing
              )
            );
      }

      // 패 설정
      tile.setPosition(position.x, position.y, position.z);
      tile.setRotation(rotation.x, rotation.y, rotation.z);
      tile.setRevealed(true); // 버린 패는 항상 앞면
      tile.setDiscarded(true); // 버린 패 상태 설정
      tile.owner = `discard${playerIndex}`;

      if (this.debugMode && index < 3) {
        console.log(
          `  버린패 ${index}: ${tile.toString()} at (${position.x.toFixed(
            2
          )}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`
        );
      }
    });

    if (this.debugMode) {
      console.log(`플레이어 ${playerIndex} 버린패 배치 완료`);
    }
  }

  // === 단일 패 추가 (수정된 버전) ===

  addTileToPlayerHand(playerIndex, tile, handTiles) {
    // 기존 손패에 새 패 추가하고 재배치
    if (!handTiles.includes(tile)) {
      handTiles.push(tile);
    }
    this.arrangePlayerHand(playerIndex, handTiles);
  }

  addTileToDiscardPile(playerIndex, tile, discardTiles) {
    // 버린패 더미에 추가하고 재배치
    if (!discardTiles.includes(tile)) {
      discardTiles.push(tile);
    }
    this.arrangeDiscardedTiles(playerIndex, discardTiles);
  }

  // === 패 제거 ===

  removeTileFromHand(tile, handTiles) {
    const index = handTiles.indexOf(tile);
    if (index !== -1) {
      handTiles.splice(index, 1);
      return tile;
    }
    return null;
  }

  // === 검증 및 디버그 (강화된 버전) ===

  validateTilePositions(playerIndex, tiles, type = "hand") {
    const results = {
      playerIndex,
      type,
      totalTiles: tiles.length,
      issues: [],
      positions: [],
    };

    tiles.forEach((tile, index) => {
      if (!tile.mesh) {
        results.issues.push(`타일 ${index}: 메시가 없음`);
        return;
      }

      if (!tile.owner) {
        results.issues.push(`타일 ${index}: 소유자가 설정되지 않음`);
      }

      const pos = tile.mesh.position;
      const rot = tile.mesh.rotation;

      // 위치 기록
      results.positions.push({
        index,
        tile: tile.toString(),
        position: { x: pos.x, y: pos.y, z: pos.z },
        rotation: { x: rot.x, y: rot.y, z: rot.z },
        rotationDegrees: ((rot.y * 180) / Math.PI).toFixed(0),
      });

      // 문제 검사
      if (pos.y < 0) {
        results.issues.push(`타일 ${index}: Y 위치가 음수 (${pos.y})`);
      }

      // 거리 검사 (너무 멀리 있는지)
      const distance = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      if (distance > 20) {
        results.issues.push(
          `타일 ${index}: 너무 멀리 위치 (거리: ${distance.toFixed(2)})`
        );
      }
    });

    // 겹침 검사 (같은 위치에 있는 패들)
    const positionMap = new Map();
    results.positions.forEach((posData, index) => {
      const key = `${posData.position.x.toFixed(
        1
      )},${posData.position.z.toFixed(1)}`;
      if (positionMap.has(key)) {
        results.issues.push(
          `타일 ${index}와 ${positionMap.get(key)}가 같은 위치에 있음`
        );
      } else {
        positionMap.set(key, index);
      }
    });

    if (this.debugMode && results.issues.length > 0) {
      console.warn("타일 배치 검증 실패:", results);
    }

    return results;
  }

  // === 테스트 모드 (개선된 버전) ===

  testPlayerLayout(playerIndex, tileCount = 13) {
    console.log(`=== 플레이어 ${playerIndex} 레이아웃 테스트 ===`);

    const config = this.playerPositions[playerIndex];
    if (!config) {
      console.error("플레이어 설정을 찾을 수 없습니다.");
      return;
    }

    console.log("설정 정보:");
    console.log(
      `  손패 기준점: (${config.hand.basePosition.x}, ${config.hand.basePosition.y}, ${config.hand.basePosition.z})`
    );
    console.log(
      `  손패 방향: (${config.hand.direction.x}, ${config.hand.direction.y}, ${config.hand.direction.z})`
    );
    console.log(
      `  손패 회전: ${((config.hand.rotation.y * 180) / Math.PI).toFixed(0)}도`
    );
    console.log(
      `  버린패 기준점: (${config.discard.basePosition.x}, ${config.discard.basePosition.y}, ${config.discard.basePosition.z})`
    );

    // 테스트용 가상 타일들
    const testTiles = [];
    for (let i = 0; i < tileCount; i++) {
      const mockTile = {
        toString: () => `테스트${i}`,
        setPosition: (x, y, z) => {
          console.log(
            `  타일 ${i}: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`
          );
          mockTile.position = { x, y, z };
        },
        setRotation: (x, y, z) => {
          console.log(`  회전 ${i}: ${((y * 180) / Math.PI).toFixed(0)}도`);
          mockTile.rotation = { x, y, z };
        },
        setRevealed: (revealed) => console.log(`  공개 ${i}: ${revealed}`),
        setDiscarded: (discarded) => console.log(`  버림 ${i}: ${discarded}`),
        mesh: { userData: {} },
        owner: null,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      };
      testTiles.push(mockTile);
    }

    console.log("손패 배치 테스트:");
    this.arrangePlayerHand(playerIndex, testTiles.slice(0, 13));

    console.log("버린패 배치 테스트:");
    this.arrangeDiscardedTiles(playerIndex, testTiles.slice(0, 6));

    // 겹침 검사
    console.log("겹침 검사:");
    const handPositions = testTiles
      .slice(0, 13)
      .map((t) => `(${t.position.x.toFixed(1)}, ${t.position.z.toFixed(1)})`);
    const uniquePositions = [...new Set(handPositions)];

    if (handPositions.length !== uniquePositions.length) {
      console.warn("⚠️ 손패에 겹치는 위치가 있습니다!");
      console.log("위치들:", handPositions);
    } else {
      console.log("✅ 손패 위치 겹침 없음");
    }
  }

  // === 전체 테스트 ===

  testAllLayouts() {
    console.log("=== 전체 플레이어 레이아웃 테스트 ===");
    for (let i = 0; i < 4; i++) {
      this.testPlayerLayout(i);
      console.log("");
    }
  }

  // === 겹침 문제 해결 도구 ===

  fixOverlappingTiles() {
    console.log("=== 겹침 문제 자동 해결 시도 ===");

    // 모든 플레이어 위치를 더 멀리 이동
    this.playerPositions[0].hand.basePosition.z = 6.0;
    this.playerPositions[1].hand.basePosition.x = 6.0;
    this.playerPositions[2].hand.basePosition.z = -6.0;
    this.playerPositions[3].hand.basePosition.x = -6.0;

    // 버린패 위치도 조정
    this.playerPositions[0].discard.basePosition.z = 3.5;
    this.playerPositions[1].discard.basePosition.x = 3.5;
    this.playerPositions[2].discard.basePosition.z = -3.5;
    this.playerPositions[3].discard.basePosition.x = -3.5;

    console.log("✅ 위치 조정 완료 - 더 넓은 간격으로 설정");
  }

  // === 설정 ===

  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`디버그 모드: ${enabled ? "활성화" : "비활성화"}`);
  }

  // === 유틸리티 ===

  getPlayerName(index) {
    const names = ["플레이어", "AI 남", "AI 서", "AI 북"];
    return names[index] || `플레이어 ${index}`;
  }

  getDistanceBetweenPlayers(playerA, playerB) {
    const posA = this.playerPositions[playerA]?.hand.basePosition;
    const posB = this.playerPositions[playerB]?.hand.basePosition;

    if (!posA || !posB) return 0;

    return Math.sqrt(
      Math.pow(posA.x - posB.x, 2) + Math.pow(posA.z - posB.z, 2)
    );
  }

  dispose() {
    console.log("TileManager 정리 완료");
  }
}
