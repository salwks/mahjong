// src/game/TileManager.js (새로 작성 - 패 배치 관리)
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

    // 플레이어 위치 설정 (4명 기준)
    this.playerPositions = this.setupPlayerPositions();

    // 디버그 모드
    this.debugMode = true;
  }

  setupPlayerPositions() {
    return {
      // 플레이어 0: East (하단, 인간) - 가로 배치
      0: {
        hand: {
          basePosition: new THREE.Vector3(0, 0.35, 4.8),
          direction: new THREE.Vector3(1, 0, 0), // 가로 배치 (X축)
          rotation: new THREE.Euler(0, 0, 0), // 앞면
        },
        discard: {
          basePosition: new THREE.Vector3(0, 0.05, 2.0),
          direction: new THREE.Vector3(1, 0, 0),
          rotation: new THREE.Euler(Math.PI / 2, 0, 0), // 눕히기
        },
      },

      // 플레이어 1: South (우측, AI) - 세로 배치 (Z축 방향, -90도 회전)
      1: {
        hand: {
          basePosition: new THREE.Vector3(4.8, 0.35, 0),
          direction: new THREE.Vector3(0, 0, 1), // 세로 배치 (Z축)
          rotation: new THREE.Euler(0, -Math.PI / 2, 0), // -90도 회전 (왼쪽으로)
        },
        discard: {
          basePosition: new THREE.Vector3(2.0, 0.05, 0),
          direction: new THREE.Vector3(0, 0, 1),
          rotation: new THREE.Euler(Math.PI / 2, 0, 0), // 눕히기
        },
      },

      // 플레이어 2: West (상단, AI) - 가로 배치 (뒤집어서)
      2: {
        hand: {
          basePosition: new THREE.Vector3(0, 0.35, -4.8),
          direction: new THREE.Vector3(-1, 0, 0), // 가로 배치 (X축 반대)
          rotation: new THREE.Euler(0, Math.PI, 0), // 180도 회전 (뒷면)
        },
        discard: {
          basePosition: new THREE.Vector3(0, 0.05, -2.0),
          direction: new THREE.Vector3(-1, 0, 0),
          rotation: new THREE.Euler(Math.PI / 2, 0, 0), // 눕히기
        },
      },

      // 플레이어 3: North (좌측, AI) - 세로 배치 (Z축 반대 방향, +90도 회전)
      3: {
        hand: {
          basePosition: new THREE.Vector3(-4.8, 0.35, 0),
          direction: new THREE.Vector3(0, 0, -1), // 세로 배치 (Z축 반대)
          rotation: new THREE.Euler(0, Math.PI / 2, 0), // +90도 회전 (오른쪽으로)
        },
        discard: {
          basePosition: new THREE.Vector3(-2.0, 0.05, 0),
          direction: new THREE.Vector3(0, 0, -1),
          rotation: new THREE.Euler(Math.PI / 2, 0, 0), // 눕히기
        },
      },
    };
  }

  // === 손패 배치 ===

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
    }

    tiles.forEach((tile, index) => {
      // 위치 계산
      const offset = (index - (tiles.length - 1) / 2) * this.tileSize.width;
      const position = basePosition
        .clone()
        .add(direction.clone().multiplyScalar(offset));

      // 패 설정
      tile.setPosition(position.x, position.y, position.z);
      tile.setRotation(rotation.x, rotation.y, rotation.z);
      tile.setRevealed(isHuman); // 인간만 앞면
      tile.owner = `player${playerIndex}`;
      tile.mesh.userData.selectable = isHuman; // 인간만 선택 가능

      if (this.debugMode && index < 3) {
        // 처음 3장만 로그
        console.log(
          `  타일 ${index}: ${tile.toString()} at (${position.x.toFixed(
            2
          )}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`
        );
      }
    });

    if (this.debugMode) {
      console.log(`플레이어 ${playerIndex} 손패 배치 완료`);
    }
  }

  // === 버린 패 배치 ===

  arrangeDiscardedTiles(playerIndex, tiles) {
    const config = this.playerPositions[playerIndex];
    if (!config) {
      console.error(`플레이어 ${playerIndex} 설정을 찾을 수 없습니다.`);
      return;
    }

    const { basePosition, direction, rotation } = config.discard;
    const tilesPerRow = 6; // 한 줄에 6장

    if (this.debugMode) {
      console.log(
        `플레이어 ${playerIndex} 버린패 배치 시작 (${tiles.length}장)`
      );
    }

    tiles.forEach((tile, index) => {
      const row = Math.floor(index / tilesPerRow);
      const col = index % tilesPerRow;

      // 위치 계산 (가로 방향)
      const xOffset = (col - (tilesPerRow - 1) / 2) * this.tileSize.width;
      const zOffset = row * this.tileSize.depth;

      let position;
      if (Math.abs(direction.x) > 0.5) {
        // 가로 방향 플레이어 (0, 2)
        position = basePosition
          .clone()
          .add(
            new THREE.Vector3(
              direction.x * xOffset,
              0,
              direction.x > 0 ? zOffset : -zOffset
            )
          );
      } else {
        // 세로 방향 플레이어 (1, 3)
        position = basePosition
          .clone()
          .add(
            new THREE.Vector3(
              direction.z > 0 ? -zOffset : zOffset,
              0,
              direction.z * xOffset
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

  // === 단일 패 추가 ===

  addTileToPlayerHand(playerIndex, tile, handTiles) {
    // 기존 손패에 새 패 추가하고 재배치
    handTiles.push(tile);
    this.arrangePlayerHand(playerIndex, handTiles);
  }

  addTileToDiscardPile(playerIndex, tile, discardTiles) {
    // 버린패 더미에 추가하고 재배치
    discardTiles.push(tile);
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

  // === 검증 및 디버그 ===

  validateTilePositions(playerIndex, tiles, type = "hand") {
    const results = {
      playerIndex,
      type,
      totalTiles: tiles.length,
      issues: [],
    };

    tiles.forEach((tile, index) => {
      if (!tile.mesh) {
        results.issues.push(`타일 ${index}: 메시가 없음`);
      }

      if (!tile.owner) {
        results.issues.push(`타일 ${index}: 소유자가 설정되지 않음`);
      }

      const pos = tile.mesh.position;
      if (pos.y < 0) {
        results.issues.push(`타일 ${index}: Y 위치가 음수 (${pos.y})`);
      }
    });

    if (this.debugMode && results.issues.length > 0) {
      console.warn("타일 배치 검증 실패:", results);
    }

    return results;
  }

  // === 테스트 모드 ===

  testPlayerLayout(playerIndex, tileCount = 13) {
    console.log(`=== 플레이어 ${playerIndex} 레이아웃 테스트 ===`);

    const config = this.playerPositions[playerIndex];
    if (!config) {
      console.error("플레이어 설정을 찾을 수 없습니다.");
      return;
    }

    // 테스트용 가상 타일들 (모든 메서드 포함)
    const testTiles = [];
    for (let i = 0; i < tileCount; i++) {
      const mockTile = {
        toString: () => `테스트${i}`,
        setPosition: (x, y, z) =>
          console.log(
            `  타일 ${i}: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`
          ),
        setRotation: (x, y, z) =>
          console.log(
            `  회전 ${i}: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`
          ),
        setRevealed: (revealed) => console.log(`  공개 ${i}: ${revealed}`),
        setDiscarded: (discarded) => console.log(`  버림 ${i}: ${discarded}`), // 추가된 메서드
        mesh: { userData: {} },
        owner: null,
      };
      testTiles.push(mockTile);
    }

    console.log("손패 배치 테스트:");
    this.arrangePlayerHand(playerIndex, testTiles.slice(0, 13));

    console.log("버린패 배치 테스트:");
    this.arrangeDiscardedTiles(playerIndex, testTiles.slice(0, 6));
  }

  // === 전체 테스트 ===

  testAllLayouts() {
    console.log("=== 전체 플레이어 레이아웃 테스트 ===");
    for (let i = 0; i < 4; i++) {
      this.testPlayerLayout(i);
      console.log("");
    }
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

  dispose() {
    // 필요시 정리 작업
    console.log("TileManager 정리 완료");
  }
}
