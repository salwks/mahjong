// src/game/MahjongGame.js (업데이트된 버전)
import { MahjongTile } from "./MahjongTile.js";
import { MahjongPlayer } from "./MahjongPlayer.js";
import { HandEvaluator } from "./HandEvaluator.js";
import { YakuChecker } from "./YakuChecker.js";
import { MahjongAI } from "./MahjongAI.js";
import * as THREE from "three";
import { gsap } from "gsap";

export class MahjongGame {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;

    // 게임 상태
    this.gameState = "waiting"; // 'waiting', 'playing', 'roundEnd', 'gameEnd'
    this.roundState = "ready"; // 'ready', 'playing', 'claiming', 'ending'

    // 게임 설정
    this.settings = {
      playerCount: 4,
      targetScore: 25000,
      startingScore: 25000,
      maxRounds: 8,
      riichiBet: 1000,
      enableRedDora: true,
      enableKuitan: true,
    };

    // 플레이어들
    this.players = [];
    this.humanPlayer = null;
    this.currentPlayerIndex = 0;
    this.dealerIndex = 0;

    // 게임 진행 정보
    this.currentWind = "east";
    this.roundNumber = 1;
    this.honba = 0;
    this.riichiBets = 0;
    this.gameWind = "east";
    this.turnCount = 0;

    // 패 관련
    this.wallTiles = [];
    this.deadWallTiles = [];
    this.discardPiles = [[], [], [], []];
    this.dora = [];
    this.uraDora = [];

    // 게임 진행 상태
    this.remainingTiles = 70;
    this.lastDiscardedTile = null;
    this.lastDiscardedBy = -1;
    this.canClaim = false;
    this.claimTimer = null;

    // 특수 상황
    this.riichiDeclarations = [];
    this.activeKans = [];

    // 시스템들
    this.handEvaluator = new HandEvaluator();
    this.yakuChecker = new YakuChecker();
    this.aiPlayers = [];

    // 콜백들
    this.onGameStateChanged = null;
    this.onPlayerTurn = null;
    this.onRoundEnd = null;
    this.onGameEnd = null;
    this.onTileDiscarded = null;

    // 애니메이션 관리
    this.activeTweens = new Set();

    // 위치 설정
    this.setupPositions();
  }

  async init() {
    console.log("마작 게임 초기화 중...");

    // 플레이어들 생성
    this.createPlayers();

    // AI 플레이어들 초기화
    this.initializeAI();

    // 초기 패산 생성
    this.createInitialWall();

    console.log("마작 게임 초기화 완료");
  }

  setupPositions() {
    // 플레이어 위치 (시계방향: 동남서북)
    this.playerPositions = [
      {
        // 동 (하단, 인간 플레이어)
        hand: { x: 0, y: 0.35, z: 4.8 },
        discard: { x: 0, y: 0.05, z: 1.5 },
        meld: { x: 3, y: 0.35, z: 4.8 },
        name: { x: 0, y: 0, z: 5.5 },
      },
      {
        // 남 (우측)
        hand: { x: 4.8, y: 0.35, z: 0 },
        discard: { x: 1.5, y: 0.05, z: 0 },
        meld: { x: 4.8, y: 0.35, z: -3 },
        name: { x: 5.5, y: 0, z: 0 },
      },
      {
        // 서 (상단)
        hand: { x: 0, y: 0.35, z: -4.8 },
        discard: { x: 0, y: 0.05, z: -1.5 },
        meld: { x: -3, y: 0.35, z: -4.8 },
        name: { x: 0, y: 0, z: -5.5 },
      },
      {
        // 북 (좌측)
        hand: { x: -4.8, y: 0.35, z: 0 },
        discard: { x: -1.5, y: 0.05, z: 0 },
        meld: { x: -4.8, y: 0.35, z: 3 },
        name: { x: -5.5, y: 0, z: 0 },
      },
    ];
  }

  createPlayers() {
    const winds = ["east", "south", "west", "north"];
    const aiNames = ["AI 남", "AI 서", "AI 북"];

    for (let i = 0; i < this.settings.playerCount; i++) {
      const isHuman = i === 0;
      const name = isHuman ? "플레이어" : aiNames[i - 1];
      const wind = winds[i];

      const player = new MahjongPlayer(i, isHuman, name, wind);
      player.score = this.settings.startingScore;
      player.position = this.playerPositions[i];

      this.players.push(player);

      if (isHuman) {
        this.humanPlayer = player;
      }
    }
  }

  initializeAI() {
    const difficulties = ["normal", "hard", "normal"];

    for (let i = 1; i < this.settings.playerCount; i++) {
      const ai = new MahjongAI(difficulties[i - 1], this);
      this.aiPlayers.push(ai);
    }
  }

  createInitialWall() {
    this.wallTiles = [];

    // 136장의 패 생성 (마작 표준)
    const tileTypes = [
      // 만수 (각 4장씩)
      ...Array(4)
        .fill()
        .flatMap(() =>
          Array.from({ length: 9 }, (_, i) => ({ type: "man", number: i + 1 }))
        ),
      // 통수 (각 4장씩)
      ...Array(4)
        .fill()
        .flatMap(() =>
          Array.from({ length: 9 }, (_, i) => ({ type: "pin", number: i + 1 }))
        ),
      // 삭수 (각 4장씩)
      ...Array(4)
        .fill()
        .flatMap(() =>
          Array.from({ length: 9 }, (_, i) => ({ type: "sou", number: i + 1 }))
        ),
      // 자패 (각 4장씩)
      ...Array(4)
        .fill()
        .flatMap(() => [
          { type: "honor", number: "east" },
          { type: "honor", number: "south" },
          { type: "honor", number: "west" },
          { type: "honor", number: "north" },
          { type: "honor", number: "white" },
          { type: "honor", number: "green" },
          { type: "honor", number: "red" },
        ]),
    ];

    // 화면 밖에 패들을 생성
    tileTypes.forEach((tileData, index) => {
      const tile = new MahjongTile(
        tileData.type,
        tileData.number,
        this.sceneManager,
        new THREE.Vector3(-20, 0.2, 0) // 화면 밖
      );

      tile.owner = "wall";
      tile.flip(false, false);

      this.wallTiles.push(tile);
    });

    // 배열 섞기
    this.shuffleArray(this.wallTiles);

    console.log(`패산 생성 완료: ${this.wallTiles.length}장`);
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  async startNewGame() {
    console.log("새 게임 시작");

    this.gameState = "playing";
    this.currentWind = "east";
    this.roundNumber = 1;
    this.dealerIndex = 0;
    this.honba = 0;
    this.riichiBets = 0;

    // 플레이어 점수 초기화
    this.players.forEach((player) => {
      player.score = this.settings.startingScore;
      player.resetForNewGame();
    });

    await this.startNewRound();
  }

  async startNewRound() {
    console.log(`${this.currentWind} ${this.roundNumber}국 시작`);

    this.roundState = "ready";
    this.currentPlayerIndex = this.dealerIndex;
    this.remainingTiles = 70;
    this.canClaim = false;
    this.lastDiscardedTile = null;
    this.lastDiscardedBy = -1;
    this.turnCount = 0;

    // 플레이어 상태 초기화
    this.players.forEach((player) => player.resetForNewRound());

    // 각 플레이어에게 임시로 14장씩 배분 (배분 애니메이션 없이)
    await this.distributeInitialHands();

    // 게임 시작
    this.roundState = "playing";
    this.startPlayerTurn();

    this.updateGameState();
  }

  async distributeInitialHands() {
    // 각 플레이어에게 14장씩 즉시 배분
    for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
      const player = this.players[playerIndex];
      const tilesForPlayer = [];

      // 14장 할당
      for (let i = 0; i < 14; i++) {
        if (this.wallTiles.length === 0) break;

        const tile = this.wallTiles.shift();
        tile.owner = `player${playerIndex}`;
        tilesForPlayer.push(tile);
      }

      player.hand = tilesForPlayer;

      // 위치 배치
      await this.arrangePlayerHand(playerIndex);
    }

    this.remainingTiles = this.wallTiles.length;
    console.log(`손패 배분 완료. 남은 패: ${this.remainingTiles}장`);
  }

  async arrangePlayerHand(playerIndex) {
    const player = this.players[playerIndex];
    const position = this.playerPositions[playerIndex];

    // 패 정렬
    player.sortHand();

    if (playerIndex === 0) {
      // 인간 플레이어 - 앞면 보이기
      await this.arrangeHumanPlayerHand(player, position);
    } else {
      // AI 플레이어 - 뒷면 보이기
      await this.arrangeAIPlayerHand(player, position, playerIndex);
    }
  }

  async arrangeHumanPlayerHand(player, position) {
    const tileWidth = 0.55;
    const startX = position.hand.x - (player.hand.length * tileWidth) / 2;

    const arrangePromises = player.hand.map((tile, i) => {
      const x = startX + i * tileWidth;
      const y = position.hand.y;
      const z = position.hand.z;

      return new Promise(resolve => {
        gsap.timeline()
          .to(tile.mesh.position, {
            duration: 0.3,
            x: x,
            y: y,
            z: z,
            ease: "power2.out"
          })
          .to(tile.mesh.rotation, {
            duration: 0.3,
            x: 0,
            y: 0,
            z: 0,
            ease: "power2.out"
          }, 0)
          .call(() => {
          tile.flip(true, true, 0.3); // 앞면으로 뒤집기
          resolve();
        }, [], 0.5);
    });

    // 3단계: 버린패 더미 재정렬
    await this.reorganizeDiscardPile(playerIndex);
  }

  getThrowPosition(playerIndex) {
    const basePositions = [
      { x: 0, z: 1.5 },   // 플레이어 -> 중앙 위쪽
      { x: -1.5, z: 0 },  // 남 -> 중앙 왼쪽
      { x: 0, z: -1.5 },  // 서 -> 중앙 아래쪽
      { x: 1.5, z: 0 }    // 북 -> 중앙 오른쪽
    ];

    const pos = basePositions[playerIndex];
    return new THREE.Vector3(
      pos.x + (Math.random() - 0.5) * 0.5,
      0.1,
      pos.z + (Math.random() - 0.5) * 0.5
    );
  }

  getDiscardPosition(playerIndex, discardIndex) {
    const tileWidth = 0.5;
    const tilesPerRow = 6;
    const row = Math.floor(discardIndex / tilesPerRow);
    const col = discardIndex % tilesPerRow;

    switch (playerIndex) {
      case 0: // 플레이어 (하단 중앙에서 위로)
        return new THREE.Vector3(
          (col - (tilesPerRow - 1) / 2) * tileWidth,
          0.05,
          1.5 + row * 0.4
        );
      case 1: // AI 남 (우측 중앙에서 왼쪽으로)
        return new THREE.Vector3(
          1.5 - row * 0.4,
          0.05,
          (col - (tilesPerRow - 1) / 2) * tileWidth
        );
      case 2: // AI 서 (상단 중앙에서 아래로)
        return new THREE.Vector3(
          -(col - (tilesPerRow - 1) / 2) * tileWidth,
          0.05,
          -1.5 - row * 0.4
        );
      case 3: // AI 북 (좌측 중앙에서 오른쪽으로)
        return new THREE.Vector3(
          -1.5 + row * 0.4,
          0.05,
          -(col - (tilesPerRow - 1) / 2) * tileWidth
        );
    }
  }

  async reorganizeDiscardPile(playerIndex) {
    const discardPile = this.discardPiles[playerIndex];
    
    const reorganizePromises = discardPile.map((tile, index) => {
      const correctPosition = this.getDiscardPosition(playerIndex, index);
      
      return new Promise(resolve => {
        gsap.timeline()
          .to(tile.mesh.position, {
            duration: 0.3,
            x: correctPosition.x,
            y: correctPosition.y,
            z: correctPosition.z,
            ease: "power2.out"
          })
          .to(tile.mesh.rotation, {
            duration: 0.3,
            x: 0,
            y: 0,
            z: 0,
            ease: "power2.out"
          }, 0)
          .call(() => resolve(), [], 0.3);
      });
    });

    await Promise.all(reorganizePromises);
  }

  nextTurn() {
    // 다음 플레이어로 턴 넘기기
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 4;

    // 새 패 뽑기
    if (this.wallTiles.length > 0) {
      const newTile = this.wallTiles.shift();
      newTile.owner = `player${this.currentPlayerIndex}`;
      this.players[this.currentPlayerIndex].hand.push(newTile);
      this.players[this.currentPlayerIndex].lastDrawnTile = newTile;

      this.remainingTiles = this.wallTiles.length;

      // 새 패 위치로 이동
      this.arrangePlayerHand(this.currentPlayerIndex).then(() => {
        this.startPlayerTurn();
      });

      this.updateGameState();
    } else {
      // 패산이 다 떨어지면 유국
      this.handleGameDraw();
    }
  }

  async handleGameDraw() {
    console.log("유국 (패산 고갈)");
    this.gameState = "roundEnd";
    
    if (this.onRoundEnd) {
      this.onRoundEnd({ type: "draw", reason: "wall_exhausted" });
    }
  }

  // === 게임 상태 관리 ===

  updateGameState() {
    if (this.onGameStateChanged) {
      this.onGameStateChanged(this.getGameState());
    }
  }

  getGameState() {
    return {
      gameState: this.gameState,
      roundState: this.roundState,
      currentPlayerIndex: this.currentPlayerIndex,
      dealerIndex: this.dealerIndex,
      currentWind: this.currentWind,
      roundNumber: this.roundNumber,
      honba: this.honba,
      riichiBets: this.riichiBets,
      remainingTiles: this.remainingTiles,
      lastDiscardedTile: this.lastDiscardedTile,
      lastDiscardedBy: this.lastDiscardedBy,
      canClaim: this.canClaim,
      dora: this.dora,
      turnCount: this.turnCount,
      players: this.players.map((player) => ({
        name: player.name,
        score: player.score,
        isRiichi: player.isRiichi,
        handCount: player.hand.length,
        meldCount: player.melds.length,
        discardCount: this.discardPiles[player.index].length,
      })),
    };
  }

  getDebugInfo() {
    return {
      gameState: this.getGameState(),
      humanPlayerHand: this.humanPlayer
        ? this.humanPlayer.hand.map((tile) => tile.toString())
        : [],
      wallTilesCount: this.wallTiles.length,
      currentPlayer: this.players[this.currentPlayerIndex].name,
      discardCounts: this.discardPiles.map(pile => pile.length),
    };
  }

  // === 이벤트 핸들러 ===

  // 외부에서 호출되는 타일 버리기 핸들러
  onTileDiscarded = (tile) => {
    if (this.currentPlayerIndex !== 0 || this.gameState !== "playing") {
      console.log("플레이어 턴이 아닙니다");
      return;
    }

    if (!this.humanPlayer.hand.includes(tile)) {
      console.log("손패에 없는 타일입니다");
      return;
    }

    this.handleDiscard(0, tile);
  }

  // === 유틸리티 ===

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  clearAllTiles() {
    // 모든 타일 제거
    [...this.wallTiles, ...this.deadWallTiles, ...this.dora].forEach((tile) => {
      if (tile && tile.dispose) tile.dispose();
    });

    this.players.forEach((player, index) => {
      [...player.hand, ...player.melds.flat()].forEach((tile) => {
        if (tile && tile.dispose) tile.dispose();
      });
      this.discardPiles[index].forEach((tile) => {
        if (tile && tile.dispose) tile.dispose();
      });
    });

    // 배열 초기화
    this.wallTiles = [];
    this.deadWallTiles = [];
    this.dora = [];
    this.uraDora = [];
    this.discardPiles = [[], [], [], []];
  }

  update() {
    // 매 프레임마다 호출되는 업데이트 함수
    // 현재는 특별한 처리 없음
  }

  dispose() {
    // AI 정리
    this.aiPlayers.forEach((ai) => {
      if (ai.dispose) ai.dispose();
    });

    // 타이머 정리
    if (this.claimTimer) {
      clearTimeout(this.claimTimer);
    }

    // 모든 타일 정리
    this.clearAllTiles();

    // 콜백 제거
    this.onGameStateChanged = null;
    this.onPlayerTurn = null;
    this.onRoundEnd = null;
    this.onGameEnd = null;
    this.onTileDiscarded = null;

    console.log("마작 게임 정리 완료");
  }
}(() => {
            tile.flip(true, false); // 앞면 표시
            resolve();
          }, [], 0.3);
      });
    });

    await Promise.all(arrangePromises);
  }

  async arrangeAIPlayerHand(player, position, playerIndex) {
    const tileWidth = 0.55;
    let rotationY;

    switch (playerIndex) {
      case 1: rotationY = Math.PI / 2; break;    // 남 (우측)
      case 2: rotationY = Math.PI; break;        // 서 (상단)
      case 3: rotationY = -Math.PI / 2; break;   // 북 (좌측)
    }

    const arrangePromises = player.hand.map((tile, i) => {
      let x, z;
      const startOffset = -(player.hand.length * tileWidth) / 2;

      switch (playerIndex) {
        case 1: // 남
          x = position.hand.x;
          z = startOffset + i * tileWidth;
          break;
        case 2: // 서
          x = -startOffset - i * tileWidth;
          z = position.hand.z;
          break;
        case 3: // 북
          x = position.hand.x;
          z = -startOffset - i * tileWidth;
          break;
      }

      return new Promise(resolve => {
        gsap.timeline()
          .to(tile.mesh.position, {
            duration: 0.3,
            x: x,
            y: position.hand.y,
            z: z,
            ease: "power2.out"
          })
          .to(tile.mesh.rotation, {
            duration: 0.3,
            x: 0,
            y: rotationY,
            z: 0,
            ease: "power2.out"
          }, 0)
          .call(() => {
            tile.flip(false, false); // 뒷면 표시
            resolve();
          }, [], 0.3);
      });
    });

    await Promise.all(arrangePromises);
  }

  startPlayerTurn() {
    console.log(`${this.players[this.currentPlayerIndex].name}의 턴`);
    this.turnCount++;

    if (this.onPlayerTurn) {
      this.onPlayerTurn(this.currentPlayerIndex);
    }

    if (this.currentPlayerIndex === 0) {
      this.startHumanPlayerTurn();
    } else {
      this.startAIPlayerTurn();
    }
  }

  startHumanPlayerTurn() {
    const player = this.humanPlayer;
    console.log("인간 플레이어 턴: 패를 선택하여 버리세요");
  }

  async startAIPlayerTurn() {
    const playerIndex = this.currentPlayerIndex;
    const player = this.players[playerIndex];

    // AI 사고 시간
    await this.delay(1000 + Math.random() * 1500);

    // AI가 랜덤하게 패 선택하여 버리기
    if (player.hand.length > 0) {
      const randomIndex = Math.floor(Math.random() * player.hand.length);
      const tileToDiscard = player.hand[randomIndex];

      await this.handleDiscard(playerIndex, tileToDiscard);
    }
  }

  async handleDiscard(playerIndex, tile) {
    const player = this.players[playerIndex];

    // 손패에서 제거
    const tileIndex = player.hand.indexOf(tile);
    if (tileIndex === -1) return;

    player.hand.splice(tileIndex, 1);
    player.lastDrawnTile = null;

    // 버린패 더미에 추가
    this.discardPiles[playerIndex].push(tile);

    // 마작룰에 맞는 버리기 처리
    await this.handleTileDiscard(playerIndex, tile);

    // 손패 재정렬
    await this.arrangePlayerHand(playerIndex);

    // 상태 업데이트
    this.lastDiscardedTile = tile;
    this.lastDiscardedBy = playerIndex;

    // 클레임 체크 (간소화)
    await this.delay(500);

    // 다음 턴
    this.nextTurn();
  }

  async handleTileDiscard(playerIndex, tile) {
    // 1단계: 패를 중앙으로 버리는 애니메이션
    const throwPosition = this.getThrowPosition(playerIndex);
    
    await new Promise(resolve => {
      const startPos = tile.mesh.position.clone();
      const endPos = throwPosition.clone();
      const midPos = new THREE.Vector3(
        (startPos.x + endPos.x) / 2,
        Math.max(startPos.y, endPos.y) + 1.5,
        (startPos.z + endPos.z) / 2
      );

      gsap.timeline()
        .to(tile.mesh.position, {
          duration: 0.4,
          x: midPos.x,
          y: midPos.y,
          z: midPos.z,
          ease: "power2.out"
        })
        .to(tile.mesh.rotation, {
          duration: 0.8,
          x: Math.PI / 2 + (Math.random() - 0.5) * 0.4,
          y: Math.random() * Math.PI * 2,
          z: (Math.random() - 0.5) * 0.4,
          ease: "power2.out"
        }, 0)
        .to(tile.mesh.position, {
          duration: 0.4,
          x: endPos.x,
          y: endPos.y,
          z: endPos.z,
          ease: "power2.in"
        })
        .call(() => resolve(), [], 0.8);
    });

    // 2단계: 정렬된 위치로 이동
    const finalPosition = this.getDiscardPosition(
      playerIndex,
      this.discardPiles[playerIndex].length - 1
    );

    await new Promise(resolve => {
      gsap.timeline()
        .to(tile.mesh.position, {
          duration: 0.5,
          x: finalPosition.x,
          y: finalPosition.y,
          z: finalPosition.z,
          ease: "power2.out"
        })
        .to(tile.mesh.rotation, {
          duration: 0.5,
          x: 0,
          y: 0,
          z: 0,
          ease: "power2.out"
        }, 0)
        .call(() => {
          tile.flip(true, true, 0.3); // 앞면으로 뒤집기
          resolve();
        }, [], 0.5);
    });