// src/game/MahjongTile.js (간소화된 버전 - 패 로직만)
import * as THREE from "three";
import { TileAnimator } from "../animation/TileAnimator.js";

export class MahjongTile {
  constructor(type, number, sceneManager, position = new THREE.Vector3()) {
    this.type = type; // 'man', 'pin', 'sou', 'honor'
    this.number = number; // 1-9 for suits, or honor name for honors
    this.sceneManager = sceneManager;
    this.position = position.clone();

    // 상태
    this.isSelected = false;
    this.isDiscarded = false;
    this.isRevealed = true; // 앞면이 보이는지
    this.isAnimating = false;
    this.owner = null; // 'player0', 'player1', 'player2', 'player3', 'wall'

    // 3D 메시
    this.mesh = null;
    this.originalY = position.y;
    this.originalRotation = { x: 0, y: 0, z: 0 };

    // 애니메이션 담당 객체
    this.animator = new TileAnimator(this);

    this.createMesh();
  }

  createMesh() {
    // 마작패 크기
    const width = 0.5;
    const height = 0.7;
    const depth = 0.35;

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const materials = this.createMaterials();

    this.mesh = new THREE.Mesh(geometry, materials);
    this.mesh.position.copy(this.position);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // 메시에 타일 정보 저장
    this.mesh.userData = {
      tile: this,
      type: "mahjong-tile",
      selectable: true,
    };

    this.sceneManager.scene.add(this.mesh);
  }

  createMaterials() {
    const materials = [];

    // 옆면들 (4개면) - 흰색
    const sideMaterial = new THREE.MeshLambertMaterial({
      color: 0xf5f5f5,
      transparent: true,
    });

    for (let i = 0; i < 4; i++) {
      materials.push(sideMaterial);
    }

    // 앞면 (타일 그림)
    const frontTexture = this.sceneManager.getTileTexture(this.getTextureKey());
    const frontMaterial = new THREE.MeshLambertMaterial({
      map: frontTexture,
      transparent: true,
    });
    materials.push(frontMaterial);

    // 뒷면
    const backTexture = this.sceneManager.getTileTexture("back");
    const backMaterial = new THREE.MeshLambertMaterial({
      map: backTexture,
      transparent: true,
    });
    materials.push(backMaterial);

    return materials;
  }

  getTextureKey() {
    if (this.type === "honor") {
      return `honor_${this.number}`;
    } else {
      return `${this.type}_${this.number}`;
    }
  }

  // === 패 정보 관련 메서드들 ===

  toString() {
    if (this.type === "honor") {
      const honorNames = {
        east: "東",
        south: "南",
        west: "西",
        north: "北",
        white: "白",
        green: "發",
        red: "中",
      };
      return honorNames[this.number] || this.number;
    } else {
      const typeNames = { man: "万", pin: "筒", sou: "索" };
      return `${this.number}${typeNames[this.type]}`;
    }
  }

  equals(otherTile) {
    return this.type === otherTile.type && this.number === otherTile.number;
  }

  compare(otherTile) {
    const typeOrder = { man: 0, pin: 1, sou: 2, honor: 3 };

    if (this.type !== otherTile.type) {
      return typeOrder[this.type] - typeOrder[otherTile.type];
    }

    if (this.type === "honor") {
      const honorOrder = {
        east: 0,
        south: 1,
        west: 2,
        north: 3,
        white: 4,
        green: 5,
        red: 6,
      };
      return honorOrder[this.number] - honorOrder[otherTile.number];
    } else {
      return this.number - otherTile.number;
    }
  }

  // === 상태 관리 ===

  setSelected(selected) {
    this.isSelected = selected;
  }

  setDiscarded(discarded) {
    this.isDiscarded = discarded;
    if (discarded) {
      this.mesh.userData.selectable = false;
    }
  }

  setRevealed(revealed) {
    this.isRevealed = revealed;
  }

  // === 애니메이션 메서드들 (TileAnimator로 위임) ===

  // 기본 위치/회전 설정
  setPosition(x, y, z, animate = false, duration = 0.5) {
    return this.animator.setPosition(x, y, z, animate, duration);
  }

  setRotation(x, y, z, animate = false, duration = 0.5) {
    return this.animator.setRotation(x, y, z, animate, duration);
  }

  flip(showFront = true, animate = true, duration = 0.4) {
    return this.animator.flip(showFront, animate, duration);
  }

  // 인터랙션 애니메이션
  onHover(isHovering) {
    return this.animator.onHover(isHovering);
  }

  select() {
    this.setSelected(true);
    return this.animator.select();
  }

  deselect() {
    this.setSelected(false);
    return this.animator.deselect();
  }

  // 마작 게임 특화 애니메이션
  async arrangeInHand(
    targetPosition,
    targetRotation,
    showFront = true,
    delay = 0
  ) {
    return this.animator.arrangeInHand(
      targetPosition,
      targetRotation,
      showFront,
      delay
    );
  }

  async discardWithRule(finalPosition, playerIndex) {
    this.setDiscarded(true);
    return this.animator.discardWithRule(finalPosition, playerIndex);
  }

  async reorganize(correctPosition) {
    return this.animator.reorganize(correctPosition);
  }

  // 기타 애니메이션
  discard(targetPosition, onComplete) {
    this.setDiscarded(true);
    return this.animator.discard(targetPosition, onComplete);
  }

  drawFromWall(targetPosition, onComplete) {
    return this.animator.drawFromWall(targetPosition, onComplete);
  }

  shuffle(intensity = 1) {
    return this.animator.shuffle(intensity);
  }

  moveToMeld(targetPosition, targetRotation, onComplete) {
    return this.animator.moveToMeld(targetPosition, targetRotation, onComplete);
  }

  fadeIn(duration = 0.5) {
    return this.animator.fadeIn(duration);
  }

  fadeOut(duration = 0.5, onComplete) {
    return this.animator.fadeOut(duration, onComplete);
  }

  // === 애니메이션 관리 ===

  killTweens() {
    return this.animator.killTweens();
  }

  // === 유틸리티 ===

  clone() {
    const clonedTile = new MahjongTile(
      this.type,
      this.number,
      this.sceneManager,
      this.position
    );
    clonedTile.isRevealed = this.isRevealed;
    clonedTile.owner = this.owner;
    return clonedTile;
  }

  getDebugInfo() {
    return {
      type: this.type,
      number: this.number,
      position: this.position,
      isSelected: this.isSelected,
      isDiscarded: this.isDiscarded,
      isRevealed: this.isRevealed,
      isAnimating: this.isAnimating,
      owner: this.owner,
      toString: this.toString(),
    };
  }

  dispose() {
    // 애니메이션 정리
    this.animator.dispose();

    // 씬에서 제거
    if (this.mesh) {
      this.sceneManager.scene.remove(this.mesh);

      // 지오메트리와 재질 해제
      this.mesh.geometry.dispose();
      this.mesh.material.forEach((material) => {
        if (material.map) material.map.dispose();
        material.dispose();
      });
    }

    this.mesh = null;
    this.animator = null;
  }
}
