// src/graphics/PlayerGroupManager.js - 플레이어 그룹 관리
import * as THREE from "three";

export class PlayerGroupManager {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.playerGroups = [];

    // 각 플레이어별 그룹 생성 (0=East, 1=South, 2=West, 3=North)
    this.createPlayerGroups();
  }

  createPlayerGroups() {
    for (let i = 0; i < 4; i++) {
      const group = new THREE.Group();

      // 각 플레이어는 90도씩 회전 (반시계방향)
      group.rotation.y = (i * Math.PI) / 2;

      // 그룹을 씬에 추가
      this.sceneManager.scene.add(group);
      this.playerGroups.push(group);

      console.log(`플레이어 ${i} 그룹 생성 (회전: ${i * 90}도)`);
    }
  }

  // === 손패 배치 (기준: 플레이어 0) ===

  getHandPositions(handSize) {
    const positions = [];
    const tileWidth = 0.55;
    const baseX = -(handSize * tileWidth) / 2;
    const baseY = 0.35;
    const baseZ = 4.8; // 플레이어 0 기준 위치

    for (let i = 0; i < handSize; i++) {
      positions.push({
        position: new THREE.Vector3(baseX + i * tileWidth, baseY, baseZ),
        rotation: new THREE.Euler(0, 0, 0), // 기본 회전 (앞면)
      });
    }

    return positions;
  }

  // === 버린 패 배치 (기준: 플레이어 0) ===

  getDiscardPosition(discardIndex) {
    const tileWidth = 0.6;
    const tileDepth = 0.4;
    const tilesPerRow = 6;
    const row = Math.floor(discardIndex / tilesPerRow);
    const col = discardIndex % tilesPerRow;

    // 플레이어 0 기준 위치 (플레이어 앞쪽에 배치)
    return {
      position: new THREE.Vector3(
        (col - (tilesPerRow - 1) / 2) * tileWidth,
        0.03,
        2.0 + row * tileDepth
      ),
      rotation: new THREE.Euler(Math.PI / 2, 0, 0), // 눕혀서 플레이어를 향하도록
    };
  }

  // === 타일을 그룹에 추가/제거 ===

  addTileToPlayerGroup(tile, playerIndex) {
    if (tile.mesh && this.playerGroups[playerIndex]) {
      // 기존 부모에서 제거
      if (tile.mesh.parent) {
        tile.mesh.parent.remove(tile.mesh);
      }

      // 해당 플레이어 그룹에 추가
      this.playerGroups[playerIndex].add(tile.mesh);

      console.log(
        `타일 ${tile.toString()}을 플레이어 ${playerIndex} 그룹에 추가`
      );
    }
  }

  removeTileFromPlayerGroup(tile, playerIndex) {
    if (tile.mesh && this.playerGroups[playerIndex]) {
      this.playerGroups[playerIndex].remove(tile.mesh);

      // 메인 씬에 다시 추가 (필요한 경우)
      this.sceneManager.scene.add(tile.mesh);

      console.log(
        `타일 ${tile.toString()}을 플레이어 ${playerIndex} 그룹에서 제거`
      );
    }
  }

  // === 손패 배열 (그룹 방식) ===

  async arrangePlayerHand(player, tiles) {
    const playerIndex = player.index;
    const handPositions = this.getHandPositions(tiles.length);
    const isHuman = player.isHuman;

    console.log(`플레이어 ${playerIndex} 손패 배치 시작 (${tiles.length}장)`);

    const arrangePromises = tiles.map(async (tile, index) => {
      // 타일을 해당 플레이어 그룹에 추가
      this.addTileToPlayerGroup(tile, playerIndex);

      const targetPos = handPositions[index];

      // 그룹 내 상대 좌표로 설정
      tile.mesh.position.copy(targetPos.position);
      tile.mesh.rotation.copy(targetPos.rotation);

      // 인간 플레이어는 앞면, AI는 뒷면
      if (isHuman) {
        tile.mesh.rotation.y = 0; // 앞면
        tile.mesh.userData.selectable = true;
      } else {
        tile.mesh.rotation.y = Math.PI; // 뒷면
        tile.mesh.userData.selectable = false;
      }

      // 애니메이션 효과
      return new Promise((resolve) => {
        tile.mesh.position.y -= 2; // 아래에서 시작

        const gsap = window.gsap;
        if (gsap) {
          gsap.to(tile.mesh.position, {
            duration: 0.3,
            y: targetPos.position.y,
            delay: index * 0.03,
            ease: "back.out(1.7)",
            onComplete: resolve,
          });
        } else {
          tile.mesh.position.y = targetPos.position.y;
          resolve();
        }
      });
    });

    await Promise.all(arrangePromises);
    console.log(`플레이어 ${playerIndex} 손패 배치 완료`);
  }

  // === 버린 패 배치 (그룹 방식) ===

  async arrangeDiscardedTile(tile, playerIndex, discardIndex) {
    console.log(
      `플레이어 ${playerIndex}의 ${discardIndex}번째 버린패 배치: ${tile.toString()}`
    );

    // 타일을 해당 플레이어 그룹에 추가
    this.addTileToPlayerGroup(tile, playerIndex);

    const discardPos = this.getDiscardPosition(discardIndex);

    // 그룹 내 상대 좌표로 설정
    tile.mesh.position.copy(discardPos.position);
    tile.mesh.rotation.copy(discardPos.rotation);

    // 버린 패는 항상 앞면 공개
    tile.isRevealed = true;

    console.log(
      `버린패 최종 위치: (${discardPos.position.x.toFixed(
        2
      )}, ${discardPos.position.y.toFixed(2)}, ${discardPos.position.z.toFixed(
        2
      )})`
    );
  }

  // === 버린 패 재정렬 ===

  async reorganizeDiscardPile(playerIndex, discardedTiles) {
    console.log(
      `플레이어 ${playerIndex} 버린패 재정렬: ${discardedTiles.length}장`
    );

    const reorganizePromises = discardedTiles.map(async (tile, index) => {
      const discardPos = this.getDiscardPosition(index);

      // 애니메이션으로 재정렬
      return new Promise((resolve) => {
        const gsap = window.gsap;
        if (gsap) {
          gsap.to(tile.mesh.position, {
            duration: 0.3,
            x: discardPos.position.x,
            y: discardPos.position.y,
            z: discardPos.position.z,
            ease: "power2.out",
            onComplete: resolve,
          });
        } else {
          tile.mesh.position.copy(discardPos.position);
          resolve();
        }
      });
    });

    await Promise.all(reorganizePromises);
    console.log(`플레이어 ${playerIndex} 버린패 재정렬 완료`);
  }

  // === 디버그 정보 ===

  getDebugInfo() {
    return {
      playerGroups: this.playerGroups.map((group, index) => ({
        playerIndex: index,
        rotation: `${((group.rotation.y * 180) / Math.PI).toFixed(0)}도`,
        children: group.children.length,
      })),
      totalTiles: this.playerGroups.reduce(
        (sum, group) => sum + group.children.length,
        0
      ),
    };
  }

  // === 정리 ===

  dispose() {
    this.playerGroups.forEach((group, index) => {
      // 그룹 내 모든 타일 정리
      while (group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);

        // 타일의 dispose 메서드 호출 (있는 경우)
        if (
          child.userData &&
          child.userData.tile &&
          child.userData.tile.dispose
        ) {
          child.userData.tile.dispose();
        }
      }

      // 씬에서 그룹 제거
      this.sceneManager.scene.remove(group);

      console.log(`플레이어 ${index} 그룹 정리 완료`);
    });

    this.playerGroups = [];
  }
}
