// src/game/MahjongTile.js (간단한 버전 - 애니메이션 제거, setDiscarded 수정)
import * as THREE from "three";

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
    this.owner = null; // 'player0', 'player1', 'player2', 'player3', 'wall'

    // 3D 메시
    this.mesh = null;

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

  // === 상태 관리 (간단한 버전) ===

  setSelected(selected) {
    this.isSelected = selected;

    // 간단한 선택 표시 (높이만 변경)
    if (this.mesh) {
      if (selected) {
        this.mesh.position.y += 0.3;
      } else {
        this.mesh.position.y = this.position.y;
      }
    }
  }

  setDiscarded(discarded) {
    this.isDiscarded = discarded;
    if (this.mesh && discarded) {
      this.mesh.userData.selectable = false;
    }
  }

  setRevealed(revealed) {
    this.isRevealed = revealed;
    // 간단한 뒤집기 (Y축 회전)
    if (this.mesh) {
      this.mesh.rotation.y = revealed ? 0 : Math.PI;
    }
  }

  // === 인터랙션 메서드들 (애니메이션 없는 간단한 버전) ===

  onHover(isHovering) {
    // 간단한 호버 효과 (크기 변화)
    if (!this.mesh || this.isDiscarded || this.isSelected) return;

    if (isHovering) {
      this.mesh.scale.set(1.05, 1.05, 1.05);
      this.mesh.position.y = this.position.y + 0.1;
    } else {
      this.mesh.scale.set(1, 1, 1);
      this.mesh.position.y = this.position.y;
    }
  }

  select() {
    if (!this.mesh || this.isDiscarded) return;

    this.setSelected(true);
    // 간단한 선택 효과 (이미 setSelected에서 처리됨)
  }

  deselect() {
    if (!this.mesh) return;

    this.setSelected(false);
    // 호버 효과도 제거
    this.mesh.scale.set(1, 1, 1);
  }

  // === 위치 설정 (즉시 적용) ===

  setPosition(x, y, z) {
    this.position.set(x, y, z);
    if (this.mesh) {
      this.mesh.position.copy(this.position);
    }
  }

  setRotation(x, y, z) {
    if (this.mesh) {
      this.mesh.rotation.set(x, y, z);
    }
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
      position: this.position.toArray(),
      isSelected: this.isSelected,
      isDiscarded: this.isDiscarded,
      isRevealed: this.isRevealed,
      owner: this.owner,
      toString: this.toString(),
    };
  }

  dispose() {
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
  }
}
