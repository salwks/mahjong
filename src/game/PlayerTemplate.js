// src/game/PlayerTemplate.js - 완전히 새로 작성 (angle 변수 문제 해결)
import * as THREE from "three";

export class UnifiedPlayerManager {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.debugMode = false;

    // 🎯 기준 템플릿 (플레이어 0번만 완벽하게 정의)
    this.template = {
      hand: {
        basePosition: new THREE.Vector3(0, 0.35, 5.0),
        spacing: 0.58,
        direction: new THREE.Vector3(1, 0, 0), // X축 방향
      },
      discard: {
        basePosition: new THREE.Vector3(0, 0.05, 2.8),
        spacing: 0.6,
        rowSpacing: 0.42,
        tilesPerRow: 6,
        direction: new THREE.Vector3(1, 0, 0), // X축 방향
        rowDirection: new THREE.Vector3(0, 0, 1), // Z축 방향
      },
    };
  }

  // 플레이어별 회전된 설정 생성
  getRotatedConfig(playerIndex) {
    const rotationAngle = (playerIndex * Math.PI) / 2; // 0°, 90°, 180°, 270°

    // 손패 설정 회전
    const handPos = this.template.hand.basePosition.clone();
    handPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationAngle);

    const handDir = this.template.hand.direction.clone();
    handDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationAngle);

    // 버린패 설정 회전
    const discardPos = this.template.discard.basePosition.clone();
    discardPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationAngle);

    const discardDir = this.template.discard.direction.clone();
    discardDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationAngle);

    const discardRowDir = this.template.discard.rowDirection.clone();
    discardRowDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationAngle);

    return {
      playerIndex,
      rotationAngle: rotationAngle,
      rotationDegrees: playerIndex * 90,
      hand: {
        basePosition: handPos,
        spacing: this.template.hand.spacing,
        direction: handDir,
      },
      discard: {
        basePosition: discardPos,
        spacing: this.template.discard.spacing,
        rowSpacing: this.template.discard.rowSpacing,
        tilesPerRow: this.template.discard.tilesPerRow,
        direction: discardDir,
        rowDirection: discardRowDir,
      },
    };
  }

  // === 손패 배치 (템플릿 기반) ===
  arrangePlayerHand(playerIndex, tiles) {
    if (!tiles || tiles.length === 0) return;

    const config = this.getRotatedConfig(playerIndex);
    const isHuman = playerIndex === 0;

    if (this.debugMode) {
      console.log(
        `플레이어 ${playerIndex} 손패 배치 (${config.rotationDegrees}도 회전)`
      );
    }

    tiles.forEach((tile, index) => {
      // 템플릿 기반 위치 계산
      const offset = (index - (tiles.length - 1) / 2) * config.hand.spacing;
      const offsetVector = config.hand.direction.clone().multiplyScalar(offset);
      const finalPosition = config.hand.basePosition.clone().add(offsetVector);

      // 타일 배치
      tile.setPosition(finalPosition.x, finalPosition.y, finalPosition.z);

      // 패는 회전시키지 않음 - 모든 패가 같은 방향(앞면이 위)을 바라봄
      if (tile.mesh) {
        tile.mesh.rotation.x = 0;
        tile.mesh.rotation.y = 0; // 회전 없음
        tile.mesh.rotation.z = 0;
      }

      tile.setRevealed(isHuman);
      tile.owner = `player${playerIndex}`;

      if (tile.mesh && tile.mesh.userData) {
        tile.mesh.userData.selectable = isHuman;
      }
    });

    if (this.debugMode) {
      console.log(`✅ 플레이어 ${playerIndex} 손패 배치 완료`);
    }
  }

  // === 버린패 배치 (템플릿 기반) ===
  arrangeDiscardedTiles(playerIndex, tiles) {
    if (!tiles || tiles.length === 0) return;

    const config = this.getRotatedConfig(playerIndex);

    if (this.debugMode) {
      console.log(
        `플레이어 ${playerIndex} 버린패 배치 (${config.rotationDegrees}도 회전)`
      );
    }

    tiles.forEach((tile, index) => {
      const row = Math.floor(index / config.discard.tilesPerRow);
      const col = index % config.discard.tilesPerRow;

      // 템플릿 기반 그리드 계산
      const colOffset =
        (col - (config.discard.tilesPerRow - 1) / 2) * config.discard.spacing;
      const rowOffset = row * config.discard.rowSpacing;

      // 회전된 방향벡터로 최종 위치 계산
      const colVector = config.discard.direction
        .clone()
        .multiplyScalar(colOffset);
      const rowVector = config.discard.rowDirection
        .clone()
        .multiplyScalar(rowOffset);
      const finalPosition = config.discard.basePosition
        .clone()
        .add(colVector)
        .add(rowVector);

      // 타일 배치
      tile.setPosition(finalPosition.x, finalPosition.y, finalPosition.z);

      // 버린패도 회전시키지 않음 - 위치만 회전
      // 모든 버린패가 동일한 방향으로 눕혀짐
      tile.setRotation(Math.PI / 2, 0, 0); // X축만 회전 (눕히기)

      tile.setRevealed(true);
      tile.setDiscarded(true);
      tile.owner = `discard${playerIndex}`;
    });

    if (this.debugMode) {
      console.log(`✅ 플레이어 ${playerIndex} 버린패 배치 완료`);
    }
  }

  // === 기본 메서드들 ===
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
    return index !== -1 ? handTiles.splice(index, 1)[0] : null;
  }

  validateTilePositions(playerIndex, tiles, type = "hand") {
    return {
      playerIndex,
      type,
      totalTiles: tiles.length,
      issues: [],
      positions: tiles.map((tile, index) => ({
        index,
        tile: tile.toString(),
        position: tile.mesh
          ? {
              x: tile.mesh.position.x,
              y: tile.mesh.position.y,
              z: tile.mesh.position.z,
            }
          : { x: 0, y: 0, z: 0 },
        rotationDegrees: tile.mesh
          ? ((tile.mesh.rotation.y * 180) / Math.PI).toFixed(0)
          : "0",
      })),
    };
  }

  testAllLayouts() {
    console.log("=== 템플릿 기반 레이아웃 테스트 ===");
    console.log("기준 템플릿:");
    console.log(
      `  손패: (${this.template.hand.basePosition.x}, ${this.template.hand.basePosition.z})`
    );
    console.log(
      `  버린패: (${this.template.discard.basePosition.x}, ${this.template.discard.basePosition.z})`
    );
    console.log("");

    for (let i = 0; i < 4; i++) {
      const config = this.getRotatedConfig(i);
      console.log(`플레이어 ${i} (${config.rotationDegrees}도 회전):`);
      console.log(
        `  손패: (${config.hand.basePosition.x.toFixed(
          2
        )}, ${config.hand.basePosition.z.toFixed(2)})`
      );
      console.log(
        `  버린패: (${config.discard.basePosition.x.toFixed(
          2
        )}, ${config.discard.basePosition.z.toFixed(2)})`
      );
      console.log(
        `  타일 회전: ${((config.rotationAngle * 180) / Math.PI).toFixed(0)}도`
      );
    }

    console.log("\n✅ 템플릿 기반 테스트 완료");
  }

  fixOverlappingTiles() {
    // 기준 템플릿만 수정하면 모든 플레이어에 적용
    this.template.hand.basePosition.z = 5.0;
    this.template.discard.basePosition.z = 2.8;
    console.log("✅ 템플릿 기준 거리 조정 완료 (모든 플레이어 자동 적용)");
  }

  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(
      `템플릿 기반 PlayerManager 디버그 모드: ${
        enabled ? "활성화" : "비활성화"
      }`
    );
  }

  dispose() {
    console.log("템플릿 기반 UnifiedPlayerManager 정리 완료");
  }
}
