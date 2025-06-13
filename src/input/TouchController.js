// src/input/TouchController.js (수정된 버전 - 인간 플레이어 패만 선택 가능)
import * as THREE from "three";

export class TouchController {
  constructor(camera, scene, canvas) {
    this.camera = camera;
    this.scene = scene;
    this.canvas = canvas;

    // 레이캐스터 (터치/마우스 위치에서 3D 객체 선택)
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // 현재 상태
    this.selectedTile = null;
    this.hoveredTile = null;
    this.isDragging = false;
    this.isEnabled = true;

    // 터치 상태
    this.touchStartTime = 0;
    this.touchStartPosition = new THREE.Vector2();
    this.touchCurrentPosition = new THREE.Vector2();
    this.lastTapTime = 0;

    // 설정값
    this.settings = {
      tapThreshold: 10, // 탭으로 인식할 최대 이동거리 (픽셀)
      longPressTime: 500, // 롱프레스 인식 시간 (ms)
      doubleTapTime: 300, // 더블탭 인식 시간 (ms)
      swipeThreshold: 50, // 스와이프 인식 최소 거리 (픽셀)
      hoverEnabled: true, // 호버 효과 활성화 (PC용)
    };

    // 콜백 함수들
    this.onTileSelected = null;
    this.onTileDiscarded = null;
    this.onTileHover = null;
    this.onGestureDetected = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // 터치 이벤트 (모바일)
    this.canvas.addEventListener(
      "touchstart",
      (e) => this.handleTouchStart(e),
      { passive: false }
    );
    this.canvas.addEventListener("touchmove", (e) => this.handleTouchMove(e), {
      passive: false,
    });
    this.canvas.addEventListener("touchend", (e) => this.handleTouchEnd(e), {
      passive: false,
    });
    this.canvas.addEventListener(
      "touchcancel",
      (e) => this.handleTouchCancel(e),
      { passive: false }
    );

    // 마우스 이벤트 (PC)
    this.canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e));
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    this.canvas.addEventListener("mouseup", (e) => this.handleMouseUp(e));
    this.canvas.addEventListener("mouseleave", (e) => this.handleMouseLeave(e));

    // 컨텍스트 메뉴 방지 (우클릭 메뉴)
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // 윈도우 포커스 관련
    window.addEventListener("blur", () => this.handleWindowBlur());
  }

  // === 터치 이벤트 처리 ===

  handleTouchStart(event) {
    if (!this.isEnabled) return;
    event.preventDefault();

    const touch = event.touches[0];
    this.touchStartTime = Date.now();
    this.touchStartPosition.set(touch.clientX, touch.clientY);
    this.touchCurrentPosition.copy(this.touchStartPosition);

    this.updateMousePosition(touch.clientX, touch.clientY);

    // 터치한 위치의 타일 찾기
    const intersectedTile = this.getIntersectedTile();

    if (intersectedTile) {
      // 더블탭 체크
      const now = Date.now();
      const isDoubleTap = now - this.lastTapTime < this.settings.doubleTapTime;
      this.lastTapTime = now;

      if (isDoubleTap && this.selectedTile === intersectedTile) {
        // 더블탭 - 즉시 버리기
        this.handleDoubleTap(intersectedTile);
      } else {
        // 첫 번째 탭 - 타일 선택
        this.selectTile(intersectedTile);
      }
    } else {
      // 빈 공간 터치 - 선택 해제
      this.deselectCurrentTile();
    }

    // 롱프레스 타이머 시작
    this.startLongPressTimer();
  }

  handleTouchMove(event) {
    if (!this.isEnabled) return;
    event.preventDefault();

    const touch = event.touches[0];
    this.touchCurrentPosition.set(touch.clientX, touch.clientY);

    // 일정 거리 이상 움직이면 탭이 아님
    const moveDistance = this.touchStartPosition.distanceTo(
      this.touchCurrentPosition
    );
    if (moveDistance > this.settings.tapThreshold) {
      this.isDragging = true;
      this.cancelLongPressTimer();
    }

    // 드래그 중일 때 스와이프 방향 감지
    if (this.isDragging && this.selectedTile) {
      this.updateMousePosition(touch.clientX, touch.clientY);
      this.detectSwipeDirection();
    }
  }

  handleTouchEnd(event) {
    if (!this.isEnabled) return;
    event.preventDefault();

    this.cancelLongPressTimer();

    const touchDuration = Date.now() - this.touchStartTime;
    const moveDistance = this.touchStartPosition.distanceTo(
      this.touchCurrentPosition
    );

    if (this.isDragging) {
      // 스와이프 처리
      if (moveDistance > this.settings.swipeThreshold) {
        this.handleSwipe();
      }
      this.isDragging = false;
    } else if (moveDistance < this.settings.tapThreshold) {
      // 탭 처리 (이미 touchStart에서 처리됨)
    }

    this.touchStartTime = 0;
  }

  handleTouchCancel(event) {
    if (!this.isEnabled) return;
    event.preventDefault();

    this.cancelLongPressTimer();
    this.isDragging = false;
    this.touchStartTime = 0;
  }

  // === 마우스 이벤트 처리 ===

  handleMouseDown(event) {
    if (!this.isEnabled) return;
    event.preventDefault();

    this.updateMousePosition(event.clientX, event.clientY);

    const intersectedTile = this.getIntersectedTile();

    if (event.button === 0) {
      // 좌클릭
      if (intersectedTile) {
        this.selectTile(intersectedTile);
      } else {
        this.deselectCurrentTile();
      }
    } else if (event.button === 2) {
      // 우클릭
      if (intersectedTile && this.selectedTile === intersectedTile) {
        // 우클릭으로 바로 버리기
        this.discardTile(intersectedTile);
      }
    }
  }

  handleMouseMove(event) {
    if (!this.isEnabled) return;

    this.updateMousePosition(event.clientX, event.clientY);

    // 호버 효과 (PC에서만)
    if (this.settings.hoverEnabled) {
      const intersectedTile = this.getIntersectedTile();
      this.updateHover(intersectedTile);
    }
  }

  handleMouseUp(event) {
    if (!this.isEnabled) return;
    // 마우스업은 일반적으로 처리할 것이 없음 (mousedown에서 처리)
  }

  handleMouseLeave(event) {
    // 마우스가 캔버스를 벗어나면 호버 해제
    this.updateHover(null);
  }

  handleWindowBlur() {
    // 윈도우 포커스 잃으면 모든 상태 리셋
    this.updateHover(null);
    this.cancelLongPressTimer();
    this.isDragging = false;
  }

  // === 유틸리티 메서드 ===

  updateMousePosition(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  getIntersectedTile() {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 마작 타일만 검사 (선택 가능한 것들만)
    const intersectableObjects = this.scene.children.filter(
      (obj) =>
        obj.userData &&
        obj.userData.type === "mahjong-tile" &&
        obj.userData.selectable === true // 선택 가능한 타일만
    );

    const intersects = this.raycaster.intersectObjects(intersectableObjects);

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      return intersectedObject.userData.tile;
    }

    return null;
  }

  selectTile(tile) {
    // 선택 불가능한 타일이면 무시
    if (
      !tile ||
      tile.isAnimating ||
      tile.isDiscarded ||
      !tile.mesh.userData.selectable
    ) {
      console.log(
        "선택할 수 없는 타일입니다:",
        tile ? tile.toString() : "null"
      );
      return;
    }

    // 인간 플레이어(player0)의 패만 선택 가능
    if (tile.owner !== "player0") {
      console.log("다른 플레이어의 패는 선택할 수 없습니다:", tile.toString());
      return;
    }

    // 기존 선택 해제
    if (this.selectedTile && this.selectedTile !== tile) {
      this.selectedTile.deselect();
    }

    // 새 타일 선택
    this.selectedTile = tile;
    tile.select();

    // 콜백 호출
    if (this.onTileSelected) {
      this.onTileSelected(tile);
    }

    console.log(`타일 선택됨: ${tile.toString()}`);
  }

  deselectCurrentTile() {
    if (this.selectedTile) {
      this.selectedTile.deselect();
      this.selectedTile = null;
    }
  }

  discardTile(tile) {
    // 선택 불가능한 타일이거나 인간 플레이어 패가 아니면 무시
    if (
      !tile ||
      tile.isAnimating ||
      tile.isDiscarded ||
      tile.owner !== "player0"
    ) {
      console.log("버릴 수 없는 타일입니다:", tile ? tile.toString() : "null");
      return;
    }

    console.log(`타일 버리기: ${tile.toString()}`);

    // 선택 해제
    if (this.selectedTile === tile) {
      this.selectedTile = null;
    }

    // 콜백 호출
    if (this.onTileDiscarded) {
      this.onTileDiscarded(tile);
    }
  }

  updateHover(tile) {
    // 기존 호버 해제
    if (this.hoveredTile && this.hoveredTile !== tile) {
      if (
        this.hoveredTile.onHover &&
        typeof this.hoveredTile.onHover === "function"
      ) {
        this.hoveredTile.onHover(false);
      }
    }

    // 새 호버 적용 (선택 가능한 타일만)
    if (
      tile &&
      tile !== this.selectedTile &&
      !tile.isAnimating &&
      !tile.isDiscarded &&
      tile.mesh &&
      tile.mesh.userData.selectable &&
      tile.owner === "player0" // 인간 플레이어 패만
    ) {
      this.hoveredTile = tile;
      if (tile.onHover && typeof tile.onHover === "function") {
        tile.onHover(true);
      }

      // 호버 콜백
      if (this.onTileHover) {
        this.onTileHover(tile);
      }
    } else {
      this.hoveredTile = null;
    }

    // 커서 변경
    this.updateCursor(tile);
  }

  updateCursor(tile) {
    if (
      tile &&
      tile.mesh &&
      tile.mesh.userData.selectable &&
      tile.owner === "player0"
    ) {
      this.canvas.style.cursor = "pointer";
    } else {
      this.canvas.style.cursor = "default";
    }
  }

  // === 제스처 처리 ===

  startLongPressTimer() {
    this.cancelLongPressTimer();

    this.longPressTimer = setTimeout(() => {
      if (!this.isDragging && this.selectedTile) {
        this.handleLongPress(this.selectedTile);
      }
    }, this.settings.longPressTime);
  }

  cancelLongPressTimer() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  handleDoubleTap(tile) {
    console.log(`더블탭으로 타일 버리기: ${tile.toString()}`);
    this.discardTile(tile);

    if (this.onGestureDetected) {
      this.onGestureDetected("doubletap", tile);
    }
  }

  handleLongPress(tile) {
    console.log(`롱프레스: ${tile.toString()}`);

    // 롱프레스시 타일 정보 표시 등의 기능
    if (this.onGestureDetected) {
      this.onGestureDetected("longpress", tile);
    }
  }

  detectSwipeDirection() {
    const deltaX = this.touchCurrentPosition.x - this.touchStartPosition.x;
    const deltaY = this.touchCurrentPosition.y - this.touchStartPosition.y;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // 주요 방향 감지
    if (absX > absY) {
      // 수평 스와이프
      this.currentSwipeDirection = deltaX > 0 ? "right" : "left";
    } else {
      // 수직 스와이프
      this.currentSwipeDirection = deltaY > 0 ? "down" : "up";
    }
  }

  handleSwipe() {
    if (!this.selectedTile || !this.currentSwipeDirection) return;

    const tile = this.selectedTile;
    const direction = this.currentSwipeDirection;

    console.log(`스와이프 ${direction}: ${tile.toString()}`);

    // 위쪽 스와이프로 타일 버리기
    if (direction === "up") {
      this.discardTile(tile);
    }

    if (this.onGestureDetected) {
      this.onGestureDetected("swipe", tile, direction);
    }

    this.currentSwipeDirection = null;
  }

  // === 키보드 지원 ===

  setupKeyboardControls() {
    document.addEventListener("keydown", (event) => this.handleKeyDown(event));
  }

  handleKeyDown(event) {
    if (!this.isEnabled || !this.selectedTile) return;

    switch (event.code) {
      case "Space":
      case "Enter":
        event.preventDefault();
        this.discardTile(this.selectedTile);
        break;

      case "Escape":
        event.preventDefault();
        this.deselectCurrentTile();
        break;

      case "ArrowLeft":
        event.preventDefault();
        this.selectAdjacentTile("left");
        break;

      case "ArrowRight":
        event.preventDefault();
        this.selectAdjacentTile("right");
        break;
    }
  }

  selectAdjacentTile(direction) {
    // 손패에서 인접한 타일 선택 (게임 로직에서 구현 필요)
    if (this.onGestureDetected) {
      this.onGestureDetected("keyboard", this.selectedTile, direction);
    }
  }

  // === 진동 피드백 (모바일) ===

  vibrate(pattern = [50]) {
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }

  vibrateOnSelect() {
    this.vibrate([30]); // 짧은 진동
  }

  vibrateOnDiscard() {
    this.vibrate([50, 30, 50]); // 패턴 진동
  }

  // === 터치 컨트롤 설정 ===

  setEnabled(enabled) {
    this.isEnabled = enabled;

    if (!enabled) {
      this.deselectCurrentTile();
      this.updateHover(null);
      this.cancelLongPressTimer();
    }
  }

  setHoverEnabled(enabled) {
    this.settings.hoverEnabled = enabled;

    if (!enabled) {
      this.updateHover(null);
    }
  }

  setSensitivity(tapThreshold = 10, swipeThreshold = 50) {
    this.settings.tapThreshold = tapThreshold;
    this.settings.swipeThreshold = swipeThreshold;
  }

  setTimings(longPressTime = 500, doubleTapTime = 300) {
    this.settings.longPressTime = longPressTime;
    this.settings.doubleTapTime = doubleTapTime;
  }

  // === 멀티터치 지원 (향후 확장용) ===

  handleMultiTouch(event) {
    if (event.touches.length === 2) {
      // 핀치 줌 등의 제스처 처리
      this.handlePinchGesture(event);
    }
  }

  handlePinchGesture(event) {
    // 카메라 줌 등의 기능 (향후 구현)
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];

    const distance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
    );

    // 줌 로직
  }

  // === 디버그 및 정보 ===

  getControllerState() {
    return {
      isEnabled: this.isEnabled,
      selectedTile: this.selectedTile ? this.selectedTile.toString() : null,
      hoveredTile: this.hoveredTile ? this.hoveredTile.toString() : null,
      isDragging: this.isDragging,
      settings: this.settings,
    };
  }

  // === 정리 ===

  dispose() {
    // 이벤트 리스너 제거
    this.canvas.removeEventListener("touchstart", this.handleTouchStart);
    this.canvas.removeEventListener("touchmove", this.handleTouchMove);
    this.canvas.removeEventListener("touchend", this.handleTouchEnd);
    this.canvas.removeEventListener("touchcancel", this.handleTouchCancel);

    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("mouseleave", this.handleMouseLeave);

    this.canvas.removeEventListener("contextmenu", (e) => e.preventDefault());

    window.removeEventListener("blur", this.handleWindowBlur);

    // 타이머 정리
    this.cancelLongPressTimer();

    // 상태 초기화
    this.selectedTile = null;
    this.hoveredTile = null;
    this.isDragging = false;

    // 콜백 제거
    this.onTileSelected = null;
    this.onTileDiscarded = null;
    this.onTileHover = null;
    this.onGestureDetected = null;
  }
}
