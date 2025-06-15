// src/game/PlayerTemplate.js - A방식: 패가 플레이어를 향하도록 회전
import * as THREE from "three";
import { MahjongTile } from "./MahjongTile.js";

class PlayerTemplate {
  constructor(sceneManager, playerIndex, position, rotation = 0) {
    this.sceneManager = sceneManager;
    this.playerIndex = playerIndex;
    this.isHuman = playerIndex === 0; // 플레이어 0만 인간

    // 이 플레이어의 패들
    this.handTiles = []; // 손패
    this.discardTiles = []; // 버린패

    // 위치 및 회전 설정
    this.position = position;
    this.rotation = rotation; // 라디안 (패 방향)

    // 배치 설정
    this.handSpacing = 0.58;
    this.discardSpacing = 0.6;
    this.discardRowSpacing = 0.42;
    this.tilesPerRow = 6;

    // 상태
    this.selectedTile = null;
    this.isReady = false;

    console.log(
      `플레이어 ${playerIndex} 생성: 회전 ${(
        (rotation * 180) /
        Math.PI
      ).toFixed(0)}도`
    );
  }

  // === 손패 배치 (위치 회전 + 패 회전) ===
  arrangeHand() {
    if (this.handTiles.length === 0) return;

    console.log(
      `플레이어 ${this.playerIndex} 손패 배치: ${this.handTiles.length}장`
    );

    this.handTiles.forEach((tile, index) => {
      // 1. 로컬 위치 계산 (중앙 정렬)
      const offsetX =
        (index - (this.handTiles.length - 1) / 2) * this.handSpacing;
      const localPosition = new THREE.Vector3(offsetX, 0, 0);

      // 2. 위치 회전 적용
      localPosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);

      // 3. 최종 위치 = 플레이어 위치 + 회전된 로컬 위치
      const finalPosition = this.position.clone().add(localPosition);

      // 4. 타일 배치
      tile.setPosition(finalPosition.x, finalPosition.y, finalPosition.z);

      // 5. 패는 모든 플레이어가 동일한 방향 (회전 없음)
      tile.setRotation(0, 0, 0);

      // 6. 공개/비공개 설정
      tile.setRevealed(this.isHuman); // 인간만 앞면
      tile.owner = `player${this.playerIndex}`;

      // 7. 선택 가능 설정 (인간만)
      if (tile.mesh && tile.mesh.userData) {
        tile.mesh.userData.selectable = this.isHuman;
      }
    });

    console.log(`✅ 플레이어 ${this.playerIndex} 손패 배치 완료`);
  }

  // === 버린패 배치 ===
  arrangeDiscards() {
    if (this.discardTiles.length === 0) return;

    console.log(
      `플레이어 ${this.playerIndex} 버린패 배치: ${this.discardTiles.length}장`
    );

    // 버린패 기준 위치 (플레이어 위치에서 중앙 방향으로)
    const discardOffset = new THREE.Vector3(0, -0.3, -2.2); // 중앙 방향으로
    discardOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
    const discardBasePosition = this.position.clone().add(discardOffset);

    this.discardTiles.forEach((tile, index) => {
      const row = Math.floor(index / this.tilesPerRow);
      const col = index % this.tilesPerRow;

      // 1. 그리드 위치 계산 (회전 전)
      const colOffset =
        (col - (this.tilesPerRow - 1) / 2) * this.discardSpacing;
      const rowOffset = row * this.discardRowSpacing;
      const localPosition = new THREE.Vector3(colOffset, 0, rowOffset);

      // 2. 위치 회전 적용
      localPosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);

      // 3. 최종 위치
      const finalPosition = discardBasePosition.clone().add(localPosition);

      // 4. 버린패는 눕혀서 배치 (앞면이 위로)
      tile.setPosition(finalPosition.x, finalPosition.y, finalPosition.z);

      // 5. 버린패는 눕히기만 (Y축 회전 없음)
      tile.setRotation(Math.PI / 2, 0, 0);

      // 6. 버린패 설정
      tile.setRevealed(true); // 버린패는 항상 공개
      tile.setDiscarded(true);
      tile.owner = `discard${this.playerIndex}`;

      // 7. 선택 불가
      if (tile.mesh && tile.mesh.userData) {
        tile.mesh.userData.selectable = false;
      }
    });

    console.log(`✅ 플레이어 ${this.playerIndex} 버린패 배치 완료`);
  }

  // === 패 추가 ===
  addTile(tile) {
    tile.owner = `player${this.playerIndex}`;
    tile.setRevealed(this.isHuman);
    this.handTiles.push(tile);
    this.sortHand();
  }

  // === 패 제거 ===
  removeTile(tile) {
    const index = this.handTiles.indexOf(tile);
    if (index !== -1) {
      this.handTiles.splice(index, 1);
      return tile;
    }
    return null;
  }

  // === 패 버리기 ===
  discardTile(tile) {
    const removedTile = this.removeTile(tile);
    if (!removedTile) {
      console.error(
        `플레이어 ${this.playerIndex}: 손패에 없는 타일`,
        tile?.toString()
      );
      return false;
    }

    // 버린패에 추가
    removedTile.owner = `discard${this.playerIndex}`;
    this.discardTiles.push(removedTile);

    // 재배치
    this.arrangeHand();
    this.arrangeDiscards();

    // 선택 해제
    if (this.selectedTile === tile) {
      this.selectedTile = null;
    }

    console.log(`플레이어 ${this.playerIndex} 패 버리기: ${tile.toString()}`);
    return true;
  }

  // === 패 선택 (인간만) ===
  selectTile(tile) {
    if (!this.isHuman) return false;
    if (!this.handTiles.includes(tile)) return false;

    // 이전 선택 해제
    if (this.selectedTile) {
      this.selectedTile.deselect();
    }

    // 새 선택
    this.selectedTile = tile;
    tile.select();

    console.log(`플레이어 ${this.playerIndex} 패 선택: ${tile.toString()}`);
    return true;
  }

  // === 선택 해제 ===
  deselectTile() {
    if (this.selectedTile) {
      this.selectedTile.deselect();
      this.selectedTile = null;
    }
  }

  // === 손패 정렬 ===
  sortHand() {
    this.handTiles.sort((a, b) => a.compare(b));
  }

  // === 랜덤 패 선택 (AI용) ===
  getRandomTile() {
    if (this.handTiles.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * this.handTiles.length);
    return this.handTiles[randomIndex];
  }

  // === 상태 정보 ===
  getState() {
    return {
      playerIndex: this.playerIndex,
      isHuman: this.isHuman,
      handCount: this.handTiles.length,
      discardCount: this.discardTiles.length,
      selectedTile: this.selectedTile?.toString() || null,
      position: this.position.toArray(),
      rotationDegrees: (this.rotation * 180) / Math.PI,
      isReady: this.isReady,
    };
  }

  // === 손패 정보 (인간만 공개) ===
  getHandInfo() {
    return {
      tiles: this.isHuman ? this.handTiles.map((t) => t.toString()) : [],
      count: this.handTiles.length,
      selectedTile: this.selectedTile?.toString() || null,
    };
  }

  // === 패 방향 테스트 ===
  testTilePositions() {
    console.log(`=== 플레이어 ${this.playerIndex} 패 위치 테스트 ===`);
    console.log(
      `플레이어 위치: (${this.position.x.toFixed(2)}, ${this.position.z.toFixed(
        2
      )})`
    );
    console.log(
      `플레이어 회전: ${((this.rotation * 180) / Math.PI).toFixed(0)}도`
    );

    if (this.handTiles.length > 0) {
      const firstTile = this.handTiles[0];
      if (firstTile.mesh) {
        const pos = firstTile.mesh.position;
        const rot = firstTile.mesh.rotation;
        console.log(
          `첫 번째 패 위치: (${pos.x.toFixed(2)}, ${pos.z.toFixed(2)})`
        );
        console.log(
          `첫 번째 패 회전: (${((rot.x * 180) / Math.PI).toFixed(0)}°, ${(
            (rot.y * 180) /
            Math.PI
          ).toFixed(0)}°, ${((rot.z * 180) / Math.PI).toFixed(0)}°)`
        );
        console.log(`모든 패가 같은 방향을 향함 (회전 없음)`);
      }
    }
  }

  // === 디버그 ===
  debugInfo() {
    console.log(
      `=== 플레이어 ${this.playerIndex} (${this.isHuman ? "인간" : "AI"}) ===`
    );
    console.log(
      `위치: (${this.position.x.toFixed(2)}, ${this.position.z.toFixed(2)})`
    );
    console.log(`회전: ${((this.rotation * 180) / Math.PI).toFixed(0)}도`);
    console.log(`손패: ${this.handTiles.length}장`);
    if (this.isHuman) {
      console.log(
        `  내용: ${this.handTiles.map((t) => t.toString()).join(" ")}`
      );
    }
    console.log(`버린패: ${this.discardTiles.length}장`);
    console.log(`선택된 패: ${this.selectedTile?.toString() || "없음"}`);

    // 패 위치 확인
    this.testTilePositions();
  }

  // === 즉시 재배치 ===
  rearrange() {
    this.arrangeHand();
    this.arrangeDiscards();
  }

  // === 정리 ===
  dispose() {
    console.log(`플레이어 ${this.playerIndex} 정리 중...`);

    // 모든 타일 정리
    [...this.handTiles, ...this.discardTiles].forEach((tile) => {
      if (tile.dispose) tile.dispose();
    });

    this.handTiles = [];
    this.discardTiles = [];
    this.selectedTile = null;
    this.isReady = false;

    console.log(`✅ 플레이어 ${this.playerIndex} 정리 완료`);
  }
}

export default PlayerTemplate;
