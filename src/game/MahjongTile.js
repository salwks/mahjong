// src/game/MahjongTile.js (GSAP v3 올바른 문법)
import * as THREE from "three";
import { gsap } from "gsap";

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
    this.owner = null; // 'player', 'ai1', 'ai2', 'ai3', 'wall'

    // 3D 메시
    this.mesh = null;
    this.originalY = position.y;
    this.originalRotation = { x: 0, y: 0, z: 0 };

    // 애니메이션 트윈들 (GSAP v3에서는 개별적으로 관리)
    this.tweens = {
      position: null,
      rotation: null,
      scale: null,
      material: null,
      timeline: null,
    };

    this.createMesh();
  }

  createMesh() {
    // 마작패 크기 (실제 비율에 맞춤)
    const width = 0.5;
    const height = 0.7;
    const depth = 0.35;

    const geometry = new THREE.BoxGeometry(width, height, depth);

    // 각 면에 다른 재질 적용
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

    // 씬에 추가
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

  // 타일 정보를 문자열로 반환
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

  // 같은 패인지 확인
  equals(otherTile) {
    return this.type === otherTile.type && this.number === otherTile.number;
  }

  // 비교 함수 (정렬용)
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

  // === 애니메이션 유틸리티 ===

  // 기존 트윈 정리
  killTweens() {
    Object.values(this.tweens).forEach((tween) => {
      if (tween) {
        tween.kill();
      }
    });
    this.tweens = {
      position: null,
      rotation: null,
      scale: null,
      material: null,
      timeline: null,
    };
  }

  // === 애니메이션 메서드들 ===

  // 위치 설정 (애니메이션 포함)
  setPosition(x, y, z, animate = false, duration = 0.5) {
    const newPosition = new THREE.Vector3(x, y, z);
    this.position.copy(newPosition);
    this.originalY = y;

    if (animate && this.mesh) {
      this.isAnimating = true;

      // 기존 위치 애니메이션 정리
      if (this.tweens.position) {
        this.tweens.position.kill();
      }

      this.tweens.position = gsap.to(this.mesh.position, {
        duration: duration,
        x: x,
        y: y,
        z: z,
        ease: "power2.out",
        onComplete: () => {
          this.isAnimating = false;
        },
      });
    } else if (this.mesh) {
      this.mesh.position.set(x, y, z);
    }
  }

  // 회전 설정 (애니메이션 포함)
  setRotation(x, y, z, animate = false, duration = 0.5) {
    this.originalRotation = { x, y, z };

    if (animate && this.mesh) {
      this.isAnimating = true;

      if (this.tweens.rotation) {
        this.tweens.rotation.kill();
      }

      this.tweens.rotation = gsap.to(this.mesh.rotation, {
        duration: duration,
        x: x,
        y: y,
        z: z,
        ease: "power2.out",
        onComplete: () => {
          this.isAnimating = false;
        },
      });
    } else if (this.mesh) {
      this.mesh.rotation.set(x, y, z);
    }
  }

  // 패 뒤집기 (앞면/뒷면)
  flip(showFront = true, animate = true, duration = 0.4) {
    this.isRevealed = showFront;
    const targetY = showFront ? 0 : Math.PI;

    if (animate && this.mesh) {
      this.isAnimating = true;

      if (this.tweens.rotation) {
        this.tweens.rotation.kill();
      }

      this.tweens.rotation = gsap.to(this.mesh.rotation, {
        duration: duration,
        y: targetY,
        ease: "power2.inOut",
        onComplete: () => {
          this.isAnimating = false;
        },
      });
    } else if (this.mesh) {
      this.mesh.rotation.y = targetY;
    }
  }

  // 마우스 호버 효과
  onHover(isHovering) {
    if (!this.mesh || this.isAnimating || this.isDiscarded || this.isSelected)
      return;

    // 기존 호버 애니메이션 정리
    if (this.tweens.timeline) {
      this.tweens.timeline.kill();
    }

    const targetY = isHovering ? this.originalY + 0.1 : this.originalY;
    const targetScale = isHovering ? 1.05 : 1;

    // GSAP v3 타임라인 문법
    this.tweens.timeline = gsap.timeline();
    this.tweens.timeline
      .to(this.mesh.position, {
        duration: 0.2,
        y: targetY,
        ease: "power2.out",
      })
      .to(
        this.mesh.scale,
        {
          duration: 0.2,
          x: targetScale,
          y: targetScale,
          z: targetScale,
          ease: "power2.out",
        },
        0
      ); // 0은 동시 시작을 의미
  }

  // 선택 효과
  select() {
    if (!this.mesh || this.isAnimating || this.isDiscarded) return;

    this.isSelected = true;

    // 기존 애니메이션 정리
    this.killTweens();

    // 위로 올리고 약간 기울이기
    this.tweens.timeline = gsap.timeline();
    this.tweens.timeline
      .to(this.mesh.position, {
        duration: 0.3,
        y: this.originalY + 0.3,
        ease: "back.out(1.7)",
      })
      .to(
        this.mesh.rotation,
        {
          duration: 0.3,
          x: -0.2,
          ease: "back.out(1.7)",
        },
        0
      );

    // 발광 효과 (재질 변경)
    this.mesh.material.forEach((material) => {
      if (material.emissive) {
        gsap.to(material.emissive, {
          duration: 0.3,
          r: 0.2,
          g: 0.4,
          b: 0.6,
        });
      }
    });

    // 지속적인 부드러운 움직임
    this.startSelectAnimation();
  }

  startSelectAnimation() {
    if (!this.isSelected || !this.mesh) return;

    const baseY = this.originalY + 0.3;

    // 무한 반복 애니메이션
    this.tweens.selectLoop = gsap.timeline({ repeat: -1, yoyo: true });
    this.tweens.selectLoop
      .to(this.mesh.position, {
        duration: 1.5,
        y: baseY + 0.05,
        ease: "sine.inOut",
      })
      .to(
        this.mesh.rotation,
        {
          duration: 3,
          y: this.originalRotation.y + 0.1,
          ease: "sine.inOut",
        },
        0
      );
  }

  // 선택 해제
  deselect() {
    if (!this.mesh) return;

    this.isSelected = false;

    // 모든 애니메이션 정리
    this.killTweens();

    // 원래 위치로 복귀
    this.tweens.timeline = gsap.timeline();
    this.tweens.timeline
      .to(this.mesh.position, {
        duration: 0.3,
        y: this.originalY,
        ease: "power2.out",
      })
      .to(
        this.mesh.rotation,
        {
          duration: 0.3,
          x: this.originalRotation.x,
          y: this.originalRotation.y,
          z: this.originalRotation.z,
          ease: "power2.out",
        },
        0
      )
      .to(
        this.mesh.scale,
        {
          duration: 0.3,
          x: 1,
          y: 1,
          z: 1,
          ease: "power2.out",
        },
        0
      );

    // 발광 효과 제거
    this.mesh.material.forEach((material) => {
      if (material.emissive) {
        gsap.to(material.emissive, {
          duration: 0.3,
          r: 0,
          g: 0,
          b: 0,
        });
      }
    });
  }

  // 패 버리기 애니메이션
  discard(targetPosition, onComplete) {
    if (!this.mesh || this.isDiscarded) return;

    this.isDiscarded = true;
    this.isSelected = false;
    this.mesh.userData.selectable = false;

    // 기존 애니메이션 정리
    this.killTweens();

    // 포물선 움직임으로 버리기
    const startPos = this.mesh.position.clone();
    const endPos = targetPosition.clone();
    const midPos = new THREE.Vector3(
      (startPos.x + endPos.x) / 2,
      Math.max(startPos.y, endPos.y) + 1.5,
      (startPos.z + endPos.z) / 2
    );

    // 포물선 애니메이션
    this.tweens.timeline = gsap.timeline();
    this.tweens.timeline
      .to(this.mesh.position, {
        duration: 0.4,
        x: midPos.x,
        y: midPos.y,
        z: midPos.z,
        ease: "power2.out",
      })
      .to(
        this.mesh.rotation,
        {
          duration: 0.8,
          x: Math.PI / 2 + (Math.random() - 0.5) * 0.4,
          y: Math.random() * Math.PI * 2,
          z: (Math.random() - 0.5) * 0.4,
          ease: "power2.out",
        },
        0
      )
      .to(this.mesh.position, {
        duration: 0.4,
        x: endPos.x,
        y: endPos.y,
        z: endPos.z,
        ease: "power2.in",
        onComplete: () => {
          this.isAnimating = false;
          if (onComplete) onComplete(this);
        },
      });
  }

  // 패 뽑기 애니메이션 (벽에서 손으로)
  drawFromWall(targetPosition, onComplete) {
    if (!this.mesh) return;

    this.isAnimating = true;

    // 뽑을 때 회전하며 움직임
    this.tweens.timeline = gsap.timeline();
    this.tweens.timeline
      .to(
        this.mesh.rotation,
        {
          duration: 0.6,
          y: "+=6.28", // += 는 현재값에 더하기 (2π = 한 바퀴)
          ease: "power2.out",
        },
        0
      )
      .to(this.mesh.position, {
        duration: 0.4,
        x: targetPosition.x,
        y: targetPosition.y + 0.5,
        z: targetPosition.z,
        ease: "power2.out",
      })
      .to(this.mesh.position, {
        duration: 0.3,
        y: targetPosition.y,
        ease: "bounce.out",
        onComplete: () => {
          this.position.copy(targetPosition);
          this.originalY = targetPosition.y;
          this.isAnimating = false;
          if (onComplete) onComplete(this);
        },
      });
  }

  // 패 정렬 애니메이션
  arrangeInHand(targetPosition, delay = 0) {
    if (!this.mesh) return;

    return new Promise((resolve) => {
      gsap.delayedCall(delay, () => {
        this.isAnimating = true;

        this.tweens.timeline = gsap.timeline();
        this.tweens.timeline
          .to(this.mesh.position, {
            duration: 0.5,
            x: targetPosition.x,
            y: targetPosition.y,
            z: targetPosition.z,
            ease: "power2.out",
          })
          .to(
            this.mesh.rotation,
            {
              duration: 0.5,
              x: 0,
              y: 0,
              z: 0,
              ease: "power2.out",
              onComplete: () => {
                this.position.copy(targetPosition);
                this.originalY = targetPosition.y;
                this.originalRotation = { x: 0, y: 0, z: 0 };
                this.isAnimating = false;
                resolve();
              },
            },
            0
          );
      });
    });
  }

  // 섞기 애니메이션
  shuffle(intensity = 1) {
    if (!this.mesh || this.isAnimating) return;

    const randomX = (Math.random() - 0.5) * intensity;
    const randomY = (Math.random() - 0.5) * intensity * 0.5;
    const randomZ = (Math.random() - 0.5) * intensity;

    const randomRotX = (Math.random() - 0.5) * 0.5;
    const randomRotY = (Math.random() - 0.5) * Math.PI;
    const randomRotZ = (Math.random() - 0.5) * 0.3;

    this.tweens.timeline = gsap.timeline();
    this.tweens.timeline
      .to(this.mesh.position, {
        duration: 0.3,
        x: this.position.x + randomX,
        y: this.position.y + Math.abs(randomY) + 0.2,
        z: this.position.z + randomZ,
        ease: "power2.out",
      })
      .to(
        this.mesh.rotation,
        {
          duration: 0.3,
          x: randomRotX,
          y: randomRotY,
          z: randomRotZ,
          ease: "power2.out",
        },
        0
      )
      .to(this.mesh.position, {
        duration: 0.4,
        x: this.position.x,
        y: this.position.y,
        z: this.position.z,
        ease: "bounce.out",
      })
      .to(
        this.mesh.rotation,
        {
          duration: 0.4,
          x: this.originalRotation.x,
          y: this.originalRotation.y,
          z: this.originalRotation.z,
          ease: "power2.out",
        },
        "-=0.4"
      ); // -=0.4는 0.4초 전에 시작
  }

  // 손패에서 벽으로 이동 (게임 시작시)
  moveToWall(targetPosition, delay = 0) {
    return new Promise((resolve) => {
      gsap.delayedCall(delay, () => {
        this.isAnimating = true;

        this.tweens.timeline = gsap.timeline();
        this.tweens.timeline
          .to(this.mesh.position, {
            duration: 0.8,
            x: targetPosition.x,
            y: targetPosition.y,
            z: targetPosition.z,
            ease: "power2.inOut",
          })
          .to(
            this.mesh.rotation,
            {
              duration: 0.8,
              x: 0,
              y: Math.PI, // 뒷면으로
              z: 0,
              ease: "power2.inOut",
              onComplete: () => {
                this.position.copy(targetPosition);
                this.originalY = targetPosition.y;
                this.isRevealed = false;
                this.isAnimating = false;
                resolve();
              },
            },
            0
          );
      });
    });
  }

  // 멜드 위치로 이동
  moveToMeld(targetPosition, targetRotation, onComplete) {
    if (!this.mesh) return;

    this.isAnimating = true;
    this.mesh.userData.selectable = false;

    this.tweens.timeline = gsap.timeline();
    this.tweens.timeline
      .to(this.mesh.position, {
        duration: 0.6,
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        ease: "power2.out",
      })
      .to(
        this.mesh.rotation,
        {
          duration: 0.6,
          x: targetRotation.x,
          y: targetRotation.y,
          z: targetRotation.z,
          ease: "power2.out",
          onComplete: () => {
            this.position.copy(targetPosition);
            this.originalY = targetPosition.y;
            this.originalRotation = {
              x: targetRotation.x,
              y: targetRotation.y,
              z: targetRotation.z,
            };
            this.isAnimating = false;
            if (onComplete) onComplete(this);
          },
        },
        0
      );
  }

  // 페이드 인/아웃
  fadeIn(duration = 0.5) {
    if (!this.mesh) return;

    this.mesh.material.forEach((material) => {
      material.transparent = true;
      material.opacity = 0;
      gsap.to(material, {
        duration: duration,
        opacity: 1,
        ease: "power2.out",
      });
    });
  }

  fadeOut(duration = 0.5, onComplete) {
    if (!this.mesh) return;

    this.mesh.material.forEach((material) => {
      gsap.to(material, {
        duration: duration,
        opacity: 0,
        ease: "power2.out",
        onComplete: () => {
          if (onComplete) onComplete(this);
        },
      });
    });
  }

  // 제거
  dispose() {
    // 모든 애니메이션 정리
    this.killTweens();

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

  // 복사본 생성
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

  // 디버그 정보
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
}
