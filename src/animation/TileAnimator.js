// src/animation/TileAnimator.js (수정된 버전 - 버린 패 눕히기)
import * as THREE from "three";
import { gsap } from "gsap";

export class TileAnimator {
  constructor(tile) {
    this.tile = tile;

    // 애니메이션 트윈들 관리
    this.tweens = {
      position: null,
      rotation: null,
      scale: null,
      material: null,
      timeline: null,
      selectLoop: null,
    };
  }

  // === 기본 애니메이션 메서드들 ===

  setPosition(x, y, z, animate = false, duration = 0.5) {
    const newPosition = new THREE.Vector3(x, y, z);
    this.tile.position.copy(newPosition);
    this.tile.originalY = y;

    if (animate && this.tile.mesh) {
      this.tile.isAnimating = true;

      if (this.tweens.position) {
        this.tweens.position.kill();
      }

      this.tweens.position = gsap.to(this.tile.mesh.position, {
        duration: duration,
        x: x,
        y: y,
        z: z,
        ease: "power2.out",
        onComplete: () => {
          this.tile.isAnimating = false;
        },
      });
    } else if (this.tile.mesh) {
      this.tile.mesh.position.set(x, y, z);
    }
  }

  setRotation(x, y, z, animate = false, duration = 0.5) {
    this.tile.originalRotation = { x, y, z };

    if (animate && this.tile.mesh) {
      this.tile.isAnimating = true;

      if (this.tweens.rotation) {
        this.tweens.rotation.kill();
      }

      this.tweens.rotation = gsap.to(this.tile.mesh.rotation, {
        duration: duration,
        x: x,
        y: y,
        z: z,
        ease: "power2.out",
        onComplete: () => {
          this.tile.isAnimating = false;
        },
      });
    } else if (this.tile.mesh) {
      this.tile.mesh.rotation.set(x, y, z);
    }
  }

  flip(showFront = true, animate = true, duration = 0.4) {
    this.tile.isRevealed = showFront;
    const targetY = showFront ? 0 : Math.PI;

    if (animate && this.tile.mesh) {
      this.tile.isAnimating = true;

      if (this.tweens.rotation) {
        this.tweens.rotation.kill();
      }

      this.tweens.rotation = gsap.to(this.tile.mesh.rotation, {
        duration: duration,
        y: targetY,
        ease: "power2.inOut",
        onComplete: () => {
          this.tile.isAnimating = false;
        },
      });
    } else if (this.tile.mesh) {
      this.tile.mesh.rotation.y = targetY;
    }
  }

  // === 인터랙션 애니메이션 ===

  onHover(isHovering) {
    if (
      !this.tile.mesh ||
      this.tile.isAnimating ||
      this.tile.isDiscarded ||
      this.tile.isSelected
    )
      return;

    if (this.tweens.timeline) {
      this.tweens.timeline.kill();
    }

    const targetY = isHovering
      ? this.tile.originalY + 0.1
      : this.tile.originalY;
    const targetScale = isHovering ? 1.05 : 1;

    this.tweens.timeline = gsap.timeline();
    this.tweens.timeline
      .to(this.tile.mesh.position, {
        duration: 0.2,
        y: targetY,
        ease: "power2.out",
      })
      .to(
        this.tile.mesh.scale,
        {
          duration: 0.2,
          x: targetScale,
          y: targetScale,
          z: targetScale,
          ease: "power2.out",
        },
        0
      );
  }

  select() {
    if (!this.tile.mesh || this.tile.isAnimating || this.tile.isDiscarded)
      return;

    this.killTweens();

    // 위로 올리고 약간 기울이기
    this.tweens.timeline = gsap.timeline();
    this.tweens.timeline
      .to(this.tile.mesh.position, {
        duration: 0.3,
        y: this.tile.originalY + 0.3,
        ease: "back.out(1.7)",
      })
      .to(
        this.tile.mesh.rotation,
        {
          duration: 0.3,
          x: -0.2,
          ease: "back.out(1.7)",
        },
        0
      );

    // 발광 효과
    this.tile.mesh.material.forEach((material) => {
      if (material.emissive) {
        gsap.to(material.emissive, {
          duration: 0.3,
          r: 0.2,
          g: 0.4,
          b: 0.6,
        });
      }
    });

    this.startSelectAnimation();
  }

  startSelectAnimation() {
    if (!this.tile.isSelected || !this.tile.mesh) return;

    const baseY = this.tile.originalY + 0.3;

    this.tweens.selectLoop = gsap.timeline({ repeat: -1, yoyo: true });
    this.tweens.selectLoop
      .to(this.tile.mesh.position, {
        duration: 1.5,
        y: baseY + 0.05,
        ease: "sine.inOut",
      })
      .to(
        this.tile.mesh.rotation,
        {
          duration: 3,
          y: this.tile.originalRotation.y + 0.1,
          ease: "sine.inOut",
        },
        0
      );
  }

  deselect() {
    if (!this.tile.mesh) return;

    this.killTweens();

    // 원래 위치로 복귀
    this.tweens.timeline = gsap.timeline();
    this.tweens.timeline
      .to(this.tile.mesh.position, {
        duration: 0.3,
        y: this.tile.originalY,
        ease: "power2.out",
      })
      .to(
        this.tile.mesh.rotation,
        {
          duration: 0.3,
          x: this.tile.originalRotation.x,
          y: this.tile.originalRotation.y,
          z: this.tile.originalRotation.z,
          ease: "power2.out",
        },
        0
      )
      .to(
        this.tile.mesh.scale,
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
    this.tile.mesh.material.forEach((material) => {
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

  // === 마작 게임 특화 애니메이션 ===

  async arrangeInHand(
    targetPosition,
    targetRotation,
    showFront = true,
    delay = 0
  ) {
    return new Promise((resolve) => {
      gsap.delayedCall(delay, () => {
        this.tile.isAnimating = true;

        this.tweens.timeline = gsap.timeline();
        this.tweens.timeline
          .to(this.tile.mesh.position, {
            duration: 0.3,
            x: targetPosition.x,
            y: targetPosition.y,
            z: targetPosition.z,
            ease: "power2.out",
          })
          .to(
            this.tile.mesh.rotation,
            {
              duration: 0.3,
              x: targetRotation.x,
              y: targetRotation.y,
              z: targetRotation.z,
              ease: "power2.out",
            },
            0
          )
          .call(
            () => {
              this.tile.position.copy(targetPosition);
              this.tile.originalY = targetPosition.y;
              this.tile.originalRotation = targetRotation;
              this.flip(showFront, false);
              this.tile.isAnimating = false;
              resolve();
            },
            [],
            0.3
          );
      });
    });
  }

  async discardWithRule(finalPosition, playerIndex) {
    // 1단계: 포물선으로 중앙에 던지기
    const throwPosition = this.getThrowPosition(playerIndex);

    await new Promise((resolve) => {
      const startPos = this.tile.mesh.position.clone();
      const endPos = throwPosition.clone();
      const midPos = new THREE.Vector3(
        (startPos.x + endPos.x) / 2,
        Math.max(startPos.y, endPos.y) + 1.5,
        (startPos.z + endPos.z) / 2
      );

      this.tweens.timeline = gsap.timeline();
      this.tweens.timeline
        .to(this.tile.mesh.position, {
          duration: 0.4,
          x: midPos.x,
          y: midPos.y,
          z: midPos.z,
          ease: "power2.out",
        })
        .to(
          this.tile.mesh.rotation,
          {
            duration: 0.8,
            x: Math.PI / 2 + (Math.random() - 0.5) * 0.4,
            y: Math.random() * Math.PI * 2,
            z: (Math.random() - 0.5) * 0.4,
            ease: "power2.out",
          },
          0
        )
        .to(this.tile.mesh.position, {
          duration: 0.4,
          x: endPos.x,
          y: endPos.y,
          z: endPos.z,
          ease: "power2.in",
        })
        .call(() => resolve(), [], 0.8);
    });

    // 2단계: 정렬된 위치로 이동 + 각 플레이어에 맞는 각도로 눕히기
    await new Promise((resolve) => {
      // 플레이어별 버린 패 각도 (각자 앞에 두고 올바르게 눕히기)
      let rotationX, rotationY, rotationZ;

      switch (playerIndex) {
        case 0: // East (플레이어) - 아래쪽, 플레이어를 향해 눕히기
          rotationX = Math.PI / 2; // 앞으로 눕히기
          rotationY = 0;
          rotationZ = 0;
          break;
        case 1: // South (우측) - 오른쪽, 중앙을 향해 눕히기
          rotationX = 0;
          rotationY = Math.PI / 2; // Y축 90도 회전
          rotationZ = Math.PI / 2; // 그 다음 Z축으로 눕히기
          break;
        case 2: // West (상단) - 위쪽, 플레이어를 향해 눕히기
          rotationX = -Math.PI / 2; // 뒤로 눕히기 (플레이어 반대 방향)
          rotationY = 0;
          rotationZ = 0;
          break;
        case 3: // North (좌측) - 왼쪽, 중앙을 향해 눕히기
          rotationX = 0;
          rotationY = -Math.PI / 2; // Y축 -90도 회전
          rotationZ = -Math.PI / 2; // 그 다음 Z축으로 눕히기 (반대 방향)
          break;
      }

      this.tweens.timeline = gsap.timeline();
      this.tweens.timeline
        .to(this.tile.mesh.position, {
          duration: 0.5,
          x: finalPosition.x,
          y: finalPosition.y,
          z: finalPosition.z,
          ease: "power2.out",
        })
        .to(
          this.tile.mesh.rotation,
          {
            duration: 0.5,
            x: rotationX,
            y: rotationY,
            z: rotationZ,
            ease: "power2.out",
          },
          0
        )
        .call(
          () => {
            // 버린 패는 항상 앞면 공개 (모든 플레이어가 볼 수 있음)
            this.tile.isRevealed = true;
            resolve();
          },
          [],
          0.5
        );
    });
  }

  getThrowPosition(playerIndex) {
    const basePositions = [
      { x: 0, z: 1.5 }, // 플레이어 -> 중앙 위쪽
      { x: -1.5, z: 0 }, // 남 -> 중앙 왼쪽
      { x: 0, z: -1.5 }, // 서 -> 중앙 아래쪽
      { x: 1.5, z: 0 }, // 북 -> 중앙 오른쪽
    ];

    const pos = basePositions[playerIndex];
    return new THREE.Vector3(
      pos.x + (Math.random() - 0.5) * 0.5,
      0.1,
      pos.z + (Math.random() - 0.5) * 0.5
    );
  }

  async reorganize(correctPosition) {
    return new Promise((resolve) => {
      this.tweens.timeline = gsap.timeline();
      this.tweens.timeline
        .to(this.tile.mesh.position, {
          duration: 0.3,
          x: correctPosition.x,
          y: correctPosition.y,
          z: correctPosition.z,
          ease: "power2.out",
        })
        .call(
          () => {
            this.tile.position.copy(correctPosition);
            // 회전은 discardWithRule에서 이미 설정됨 (각 플레이어별로 다름)
            resolve();
          },
          [],
          0.3
        );
    });
  }

  // === 기타 애니메이션들 ===

  discard(targetPosition, onComplete) {
    if (!this.tile.mesh || this.tile.isDiscarded) return;

    this.killTweens();

    const startPos = this.tile.mesh.position.clone();
    const endPos = targetPosition.clone();
    const midPos = new THREE.Vector3(
      (startPos.x + endPos.x) / 2,
      Math.max(startPos.y, endPos.y) + 1.5,
      (startPos.z + endPos.z) / 2
    );

    this.tweens.timeline = gsap.timeline();
    this.tweens.timeline
      .to(this.tile.mesh.position, {
        duration: 0.4,
        x: midPos.x,
        y: midPos.y,
        z: midPos.z,
        ease: "power2.out",
      })
      .to(
        this.tile.mesh.rotation,
        {
          duration: 0.8,
          x: Math.PI / 2 + (Math.random() - 0.5) * 0.4,
          y: Math.random() * Math.PI * 2,
          z: (Math.random() - 0.5) * 0.4,
          ease: "power2.out",
        },
        0
      )
      .to(this.tile.mesh.position, {
        duration: 0.4,
        x: endPos.x,
        y: endPos.y,
        z: endPos.z,
        ease: "power2.in",
        onComplete: () => {
          this.tile.isAnimating = false;
          if (onComplete) onComplete(this.tile);
        },
      });
  }

  drawFromWall(targetPosition, onComplete) {
    if (!this.tile.mesh) return;

    this.tile.isAnimating = true;

    this.tweens.timeline = gsap.timeline();
    this.tweens.timeline
      .to(
        this.tile.mesh.rotation,
        {
          duration: 0.6,
          y: "+=6.28",
          ease: "power2.out",
        },
        0
      )
      .to(this.tile.mesh.position, {
        duration: 0.4,
        x: targetPosition.x,
        y: targetPosition.y + 0.5,
        z: targetPosition.z,
        ease: "power2.out",
      })
      .to(this.tile.mesh.position, {
        duration: 0.3,
        y: targetPosition.y,
        ease: "bounce.out",
        onComplete: () => {
          this.tile.position.copy(targetPosition);
          this.tile.originalY = targetPosition.y;
          this.tile.isAnimating = false;
          if (onComplete) onComplete(this.tile);
        },
      });
  }

  shuffle(intensity = 1) {
    if (!this.tile.mesh || this.tile.isAnimating) return;

    const randomX = (Math.random() - 0.5) * intensity;
    const randomY = (Math.random() - 0.5) * intensity * 0.5;
    const randomZ = (Math.random() - 0.5) * intensity;

    const randomRotX = (Math.random() - 0.5) * 0.5;
    const randomRotY = (Math.random() - 0.5) * Math.PI;
    const randomRotZ = (Math.random() - 0.5) * 0.3;

    this.tweens.timeline = gsap.timeline();
    this.tweens.timeline
      .to(this.tile.mesh.position, {
        duration: 0.3,
        x: this.tile.position.x + randomX,
        y: this.tile.position.y + Math.abs(randomY) + 0.2,
        z: this.tile.position.z + randomZ,
        ease: "power2.out",
      })
      .to(
        this.tile.mesh.rotation,
        {
          duration: 0.3,
          x: randomRotX,
          y: randomRotY,
          z: randomRotZ,
          ease: "power2.out",
        },
        0
      )
      .to(this.tile.mesh.position, {
        duration: 0.4,
        x: this.tile.position.x,
        y: this.tile.position.y,
        z: this.tile.position.z,
        ease: "bounce.out",
      })
      .to(
        this.tile.mesh.rotation,
        {
          duration: 0.4,
          x: this.tile.originalRotation.x,
          y: this.tile.originalRotation.y,
          z: this.tile.originalRotation.z,
          ease: "power2.out",
        },
        "-=0.4"
      );
  }

  moveToMeld(targetPosition, targetRotation, onComplete) {
    if (!this.tile.mesh) return;

    this.tile.isAnimating = true;

    this.tweens.timeline = gsap.timeline();
    this.tweens.timeline
      .to(this.tile.mesh.position, {
        duration: 0.6,
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        ease: "power2.out",
      })
      .to(
        this.tile.mesh.rotation,
        {
          duration: 0.6,
          x: targetRotation.x,
          y: targetRotation.y,
          z: targetRotation.z,
          ease: "power2.out",
          onComplete: () => {
            this.tile.position.copy(targetPosition);
            this.tile.originalY = targetPosition.y;
            this.tile.originalRotation = {
              x: targetRotation.x,
              y: targetRotation.y,
              z: targetRotation.z,
            };
            this.tile.isAnimating = false;
            if (onComplete) onComplete(this.tile);
          },
        },
        0
      );
  }

  fadeIn(duration = 0.5) {
    if (!this.tile.mesh) return;

    this.tile.mesh.material.forEach((material) => {
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
    if (!this.tile.mesh) return;

    this.tile.mesh.material.forEach((material) => {
      gsap.to(material, {
        duration: duration,
        opacity: 0,
        ease: "power2.out",
        onComplete: () => {
          if (onComplete) onComplete(this.tile);
        },
      });
    });
  }

  // === 유틸리티 ===

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
      selectLoop: null,
    };
  }

  dispose() {
    this.killTweens();
    this.tile = null;
  }
}
