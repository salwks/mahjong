// src/graphics/SceneManager.js (PlayerGroupManager 추가)
import * as THREE from "three";
import { PlayerGroupManager } from "./PlayerGroupManager.js";

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // 텍스처 캐시
    this.tileTextures = {};
    
    // 플레이어 그룹 관리자 추가
    this.playerGroupManager = null;

    this.setupRenderer();
    this.setupCamera();
    this.setupLighting();
    this.setupEnvironment();
  }

  async init() {
    // 텍스처 생성
    await this.createTileTextures();

    // 플레이어 그룹 관리자 초기화
    this.playerGroupManager = new PlayerGroupManager(this);
    console.log("✓ PlayerGroupManager 초기화 완료");

    // 리사이즈 처리
    this.onWindowResize();

    console.log("✓ SceneManager 초기화 완료");
  }