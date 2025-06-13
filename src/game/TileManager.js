// src/game/TileManager.js (회전 기반 - 간단한 방식)
import * as THREE from "three";

export class TileManager {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;

    // 타일 크기
    this.tileSize = {
      width: 0.55,
      height: 0.7,
      depth: 0.35,
    };

    // 기준 플레이어(플레이어 0) 포지션 설정
    this.basePlayerConfig = this.createBasePlayerConfig();

    // 각 플레이어별 회전각 (Y축 기준)
    this.playerRotations = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2]; // 0°, 90°, 180°, 270°

    this.debugMode = false;
  }

  // 기준 플레이어(동쪽, 플레이어 0) 설정 - 이것만 완벽하게 만들면 됨!
  createBasePlayerConfig() {
    return {
      // 손패 설정 (플레이어 앞쪽에 가로로 배치)
      hand: {
        basePosition: new THREE.Vector3(0, 0.35, 4.0), // 플레이어 앞쪽
        spacing: 0.6, // 패 간격
        rotation: new THREE.Euler(0, 0, 0), // 앞면이 플레이어를 향함
      },

      // 버린패 설정 (중앙쪽에 배치)
      discard: {
        basePosition: new THREE.Vector3(0, 0.05, 2.0), // 중앙 방향
        tilesPerRow: 6,
        tileSpacing: 0.6,
        rowSpacing: 0.4,
        rotation: new THREE.Euler(Math.PI / 2, 0, 0), // 눕혀서 앞면이 위로
      },
    };
  }

  // 특정 플레이어의 실제 설정 계산 (기준 설정을 회전)
  getPlayerConfig(playerIndex) {
    const rotationY = this.playerRotations[playerIndex];
    const config = JSON.parse(JSON.stringify(this.basePlayerConfig)); // 깊은 복사

    // 손패 위치 회전
    const handPos = new THREE.Vector3().copy(config.hand.basePosition);
    handPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);
    config.hand.basePosition = handPos;
    config.hand.rotation.y += rotationY;

    // 버린패 위치 회전
    const discardPos = new THREE.Vector3().copy(config.discard.basePosition);
    discardPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);
    config.discard.basePosition = discardPos;
    // 버린패는 항상 위를 향하므로 X축 회전만 유지

    return config;
  }

  // === 손패 배치 ===
  arrangePlayerHand(playerIndex, tiles) {
    if (tiles.length === 0) return;

    const config = this.getPlayerConfig(playerIndex);
    const isHuman = playerIndex === 0;

    console.log(`플레이어 ${playerIndex} 손패 배치: ${tiles.length}장`);

    tiles.forEach((tile, index) => {
      // 중앙 정렬로 X 위치 계산
      const offsetX = (index - (tiles.length - 1) / 2) * config.hand.spacing;

      // 최종 위치 = 기준위치 + 오프셋
      const finalPosition = new THREE.Vector3(
        config.hand.basePosition.x + offsetX,
        config.hand.basePosition.y,
        config.hand.basePosition.z
      );

      // 패 배치
      tile.setPosition(finalPosition.x, finalPosition.y, finalPosition.z);
      tile.setRotation(
        config.hand.rotation.x,
        config.hand.rotation.y,
        config.hand.rotation.z
      );
      tile.setRevealed(isHuman); // 인간만 앞면
      tile.owner = `player${playerIndex}`;

      if (tile.mesh) {
        tile.mesh.userData.selectable = isHuman;
      }
    });

    if (this.debugMode) {
      console.log(
        `✅ 플레이어 ${playerIndex} 손패 배치 완료 (회전: ${(
          (this.playerRotations[playerIndex] * 180) /
          Math.PI
        ).toFixed(0)}도)`
      );
    }
  }

  // === 버린패 배치 ===
  arrangeDiscardedTiles(playerIndex, tiles) {
    if (tiles.length === 0) return;

    const config = this.getPlayerConfig(playerIndex);

    console.log(`플레이어 ${playerIndex} 버린패 배치: ${tiles.length}장`);

    tiles.forEach((tile, index) => {
      const row = Math.floor(index / config.discard.tilesPerRow);
      const col = index % config.discard.tilesPerRow;

      // 해당 플레이어 방향으로 버린패 배치
      let finalPosition;

      if (playerIndex === 0) {
        // 동 (기준)
        finalPosition = new THREE.Vector3(
          config.discard.basePosition.x +
            (col - (config.discard.tilesPerRow - 1) / 2) *
              config.discard.tileSpacing,
          config.discard.basePosition.y,
          config.discard.basePosition.z + row * config.discard.rowSpacing
        );
      } else if (playerIndex === 1) {
        // 남 (90도 회전)
        finalPosition = new THREE.Vector3(
          config.discard.basePosition.x - row * config.discard.rowSpacing,
          config.discard.basePosition.y,
          config.discard.basePosition.z +
            (col - (config.discard.tilesPerRow - 1) / 2) *
              config.discard.tileSpacing
        );
      } else if (playerIndex === 2) {
        // 서 (180도 회전)
        finalPosition = new THREE.Vector3(
          config.discard.basePosition.x -
            (col - (config.discard.tilesPerRow - 1) / 2) *
              config.discard.tileSpacing,
          config.discard.basePosition.y,
          config.discard.basePosition.z - row * config.discard.rowSpacing
        );
      } else {
        // 북 (270도 회전)
        finalPosition = new THREE.Vector3(
          config.discard.basePosition.x + row * config.discard.rowSpacing,
          config.discard.basePosition.y,
          config.discard.basePosition.z -
            (col - (config.discard.tilesPerRow - 1) / 2) *
              config.discard.tileSpacing
        );
      }

      // 패 배치
      tile.setPosition(finalPosition.x, finalPosition.y, finalPosition.z);
      tile.setRotation(
        config.discard.rotation.x,
        config.discard.rotation.y,
        config.discard.rotation.z
      );
      tile.setRevealed(true); // 버린패는 항상 공개
      tile.setDiscarded(true);
      tile.owner = `discard${playerIndex}`;
    });

    if (this.debugMode) {
      console.log(`✅ 플레이어 ${playerIndex} 버린패 배치 완료`);
    }
  }

  // === 패 추가/제거 ===
  addTileToPlayerHand(playerIndex, tile, handTiles) {
    if (!handTiles.includes(tile)) {
      handTiles.push(tile);
    }
    this.arrangePlayerHand(playerIndex, handTiles);
  }

  addTileToDiscardPile(playerIndex, tile, discardTiles) {
    if (!discardTiles.includes(tile)) {
      discardTiles.push(tile);
    }
    this.arrangeDiscardedTiles(playerIndex, discardTiles);
  }

  removeTileFromHand(tile, handTiles) {
    const index = handTiles.indexOf(tile);
    if (index !== -1) {
      return handTiles.splice(index, 1)[0];
    }
    return null;
  }

  // === 검증 ===
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
        results.positions.push({
          index,
          tile: tile.toString(),
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          rotationDegrees: "0",
          note: "가상 타일",
        });
        return;
      }

      const pos = tile.mesh.position;
      const rot = tile.mesh.rotation;

      results.positions.push({
        index,
        tile: tile.toString(),
        position: { x: pos.x, y: pos.y, z: pos.z },
        rotation: { x: rot.x, y: rot.y, z: rot.z },
        rotationDegrees: ((rot.y * 180) / Math.PI).toFixed(0),
      });
    });

    return results;
  }

  // === 테스트 ===
  testAllLayouts() {
    console.log("=== 회전 기반 레이아웃 테스트 ===");

    for (let i = 0; i < 4; i++) {
      const config = this.getPlayerConfig(i);
      const rotationDeg = ((this.playerRotations[i] * 180) / Math.PI).toFixed(
        0
      );

      console.log(`플레이어 ${i} (${rotationDeg}도 회전):`);
      console.log(
        `  손패 위치: (${config.hand.basePosition.x.toFixed(
          2
        )}, ${config.hand.basePosition.z.toFixed(2)})`
      );
      console.log(
        `  손패 회전: ${((config.hand.rotation.y * 180) / Math.PI).toFixed(
          0
        )}도`
      );
      console.log(
        `  버린패 위치: (${config.discard.basePosition.x.toFixed(
          2
        )}, ${config.discard.basePosition.z.toFixed(2)})`
      );
    }

    console.log("✅ 회전 기반 테스트 완료");
  }

  // === 유틸리티 ===
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`TileManager 디버그 모드: ${enabled ? "활성화" : "비활성화"}`);
  }

  fixOverlappingTiles() {
    // 기준 위치를 조금 더 멀리 설정
    this.basePlayerConfig.hand.basePosition.z = 5.0;
    this.basePlayerConfig.discard.basePosition.z = 2.5;
    console.log("✅ 겹침 방지를 위해 거리 조정 완료");
  }

  dispose() {
    console.log("TileManager 정리 완료");
  }
}
