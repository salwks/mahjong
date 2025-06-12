// src/game/MahjongGame.js
import { MahjongTile } from "./MahjongTile.js";
import { MahjongPlayer } from "./MahjongPlayer.js";
import { HandEvaluator } from "./HandEvaluator.js";
import { YakuChecker } from "./YakuChecker.js";
import { MahjongAI } from "./MahjongAI.js";
import * as THREE from "three";

export class MahjongGame {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;

    // 게임 상태
    this.gameState = "waiting"; // 'waiting', 'playing', 'roundEnd', 'gameEnd'
    this.roundState = "dealing"; // 'dealing', 'playing', 'claiming', 'ending'

    // 게임 설정
    this.settings = {
      playerCount: 4,
      targetScore: 25000,
      startingScore: 25000,
      maxRounds: 8, // 동남서북 각 2국
      riichiBet: 1000,
      enableRedDora: true,
      enableKuitan: true, // 쿠이탄 허용
    };

    // 플레이어들
    this.players = [];
    this.humanPlayer = null;
    this.currentPlayerIndex = 0;
    this.dealerIndex = 0; // 동가

    // 게임 진행 정보
    this.currentWind = "east"; // 'east', 'south', 'west', 'north'
    this.roundNumber = 1;
    this.honba = 0; // 본장
    this.riichiBets = 0; // 리치봉
    this.gameWind = "east"; // 장풍

    // 패 관련
    this.wallTiles = []; // 패산
    this.deadWallTiles = []; // 왕패
    this.discardPiles = [[], [], [], []]; // 각 플레이어 버린패
    this.dora = []; // 도라 표시패
    this.uraDora = []; // 뒷도라

    // 게임 진행 상태
    this.remainingTiles = 70; // 남은 패수
    this.lastDiscardedTile = null;
    this.lastDiscardedBy = -1;
    this.canClaim = false; // 치/폰/깡 가능 여부
    this.claimTimer = null;

    // 특수 상황
    this.riichiDeclarations = []; // 리치 선언
    this.activeKans = []; // 깡 중

    // 시스템들
    this.handEvaluator = new HandEvaluator();
    this.yakuChecker = new YakuChecker();
    this.aiPlayers = [];

    // 콜백들
    this.onGameStateChanged = null;
    this.onPlayerTurn = null;
    this.onRoundEnd = null;
    this.onGameEnd = null;

    // 위치 설정
    this.setupPositions();
  }

  async init() {
    console.log("마작 게임 초기화 중...");

    // 플레이어들 생성
    this.createPlayers();

    // AI 플레이어들 초기화
    this.initializeAI();

    console.log("마작 게임 초기화 완료");
  }

  setupPositions() {
    // 플레이어 위치 (시계방향: 동남서북)
    this.playerPositions = [
      {
        // 동 (하단, 인간 플레이어)
        hand: { x: 0, y: 0.2, z: 4.5 },
        discard: { x: 0, y: 0.05, z: 1.5 },
        meld: { x: 3, y: 0.2, z: 4.5 },
        name: { x: 0, y: 0, z: 5.5 },
      },
      {
        // 남 (우측)
        hand: { x: 4.5, y: 0.2, z: 0 },
        discard: { x: 1.5, y: 0.05, z: 0 },
        meld: { x: 4.5, y: 0.2, z: -3 },
        name: { x: 5.5, y: 0, z: 0 },
      },
      {
        // 서 (상단)
        hand: { x: 0, y: 0.2, z: -4.5 },
        discard: { x: 0, y: 0.05, z: -1.5 },
        meld: { x: -3, y: 0.2, z: -4.5 },
        name: { x: 0, y: 0, z: -5.5 },
      },
      {
        // 북 (좌측)
        hand: { x: -4.5, y: 0.2, z: 0 },
        discard: { x: -1.5, y: 0.05, z: 0 },
        meld: { x: -4.5, y: 0.2, z: 3 },
        name: { x: -5.5, y: 0, z: 0 },
      },
    ];

    // 패산 위치
    this.wallPositions = {
      center: { x: 0, y: 0.1, z: 0 },
      east: { x: 0, y: 0.1, z: 3 },
      south: { x: 3, y: 0.1, z: 0 },
      west: { x: 0, y: 0.1, z: -3 },
      north: { x: -3, y: 0.1, z: 0 },
    };
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
    const difficulties = ["normal", "hard", "normal"]; // AI 난이도

    for (let i = 1; i < this.settings.playerCount; i++) {
      const ai = new MahjongAI(difficulties[i - 1], this);
      this.aiPlayers.push(ai);
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

    this.roundState = "dealing";
    this.currentPlayerIndex = this.dealerIndex;
    this.remainingTiles = 70;
    this.canClaim = false;
    this.lastDiscardedTile = null;
    this.lastDiscardedBy = -1;

    // 모든 타일 정리
    this.clearAllTiles();

    // 플레이어 상태 초기화
    this.players.forEach((player) => player.resetForNewRound());

    // 패 생성 및 섞기
    this.createAndShuffleTiles();

    // 초기 패 배분
    await this.dealInitialHands();

    // 도라 설정
    this.setupDora();

    // 게임 시작
    this.roundState = "playing";
    this.startPlayerTurn();

    this.updateGameState();
  }

  createAndShuffleTiles() {
    this.wallTiles = [];

    // 만수 (1-9, 각 4장)
    for (let num = 1; num <= 9; num++) {
      for (let copy = 0; copy < 4; copy++) {
        const tile = new MahjongTile(
          "man",
          num,
          this.sceneManager,
          new THREE.Vector3()
        );
        tile.owner = "wall";
        this.wallTiles.push(tile);
      }
    }

    // 통수 (1-9, 각 4장)
    for (let num = 1; num <= 9; num++) {
      for (let copy = 0; copy < 4; copy++) {
        const tile = new MahjongTile(
          "pin",
          num,
          this.sceneManager,
          new THREE.Vector3()
        );
        tile.owner = "wall";
        this.wallTiles.push(tile);
      }
    }

    // 삭수 (1-9, 각 4장)
    for (let num = 1; num <= 9; num++) {
      for (let copy = 0; copy < 4; copy++) {
        const tile = new MahjongTile(
          "sou",
          num,
          this.sceneManager,
          new THREE.Vector3()
        );
        tile.owner = "wall";
        this.wallTiles.push(tile);
      }
    }

    // 자패 (동남서북백발중, 각 4장)
    const honors = ["east", "south", "west", "north", "white", "green", "red"];
    honors.forEach((honor) => {
      for (let copy = 0; copy < 4; copy++) {
        const tile = new MahjongTile(
          "honor",
          honor,
          this.sceneManager,
          new THREE.Vector3()
        );
        tile.owner = "wall";
        this.wallTiles.push(tile);
      }
    });

    // 패 섞기 (Fisher-Yates shuffle)
    for (let i = this.wallTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.wallTiles[i], this.wallTiles[j]] = [
        this.wallTiles[j],
        this.wallTiles[i],
      ];
    }

    console.log(`총 ${this.wallTiles.length}장의 패 생성 및 섞기 완료`);
  }

  async dealInitialHands() {
    console.log("초기 패 배분 중...");

    // 왕패 14장 분리
    this.deadWallTiles = this.wallTiles.splice(-14);

    // 각 플레이어에게 13장씩 배분
    for (let round = 0; round < 3; round++) {
      for (
        let playerIndex = 0;
        playerIndex < this.settings.playerCount;
        playerIndex++
      ) {
        const player = this.players[playerIndex];

        // 4장씩 3번 (총 12장)
        for (let i = 0; i < 4; i++) {
          if (this.wallTiles.length === 0) break;

          const tile = this.wallTiles.shift();
          tile.owner = `player${playerIndex}`;
          player.hand.push(tile);
        }

        // 배분 애니메이션 대기
        await this.delay(100);
      }
    }

    // 마지막 1장씩 배분 (총 13장)
    for (
      let playerIndex = 0;
      playerIndex < this.settings.playerCount;
      playerIndex++
    ) {
      const player = this.players[playerIndex];

      if (this.wallTiles.length === 0) break;

      const tile = this.wallTiles.shift();
      tile.owner = `player${playerIndex}`;
      player.hand.push(tile);
    }

    // 동가(딜러)에게 추가 1장 (총 14장)
    if (this.wallTiles.length > 0) {
      const dealerTile = this.wallTiles.shift();
      dealerTile.owner = `player${this.dealerIndex}`;
      this.players[this.dealerIndex].hand.push(dealerTile);
      this.players[this.dealerIndex].lastDrawnTile = dealerTile;
    }

    // 손패 정렬 및 배치
    for (let i = 0; i < this.settings.playerCount; i++) {
      await this.arrangePlayerHand(i);
    }

    this.remainingTiles = this.wallTiles.length;
    console.log(`패 배분 완료. 남은 패: ${this.remainingTiles}장`);
  }

  async arrangePlayerHand(playerIndex) {
    const player = this.players[playerIndex];
    const position = this.playerPositions[playerIndex];

    // 패 정렬
    player.sortHand();

    // 시각적 배치
    if (playerIndex === 0) {
      // 인간 플레이어 - 앞면 보이기
      await this.arrangeHumanPlayerHand(player, position);
    } else {
      // AI 플레이어 - 뒷면 보이기
      await this.arrangeAIPlayerHand(player, position, playerIndex);
    }
  }

  async arrangeHumanPlayerHand(player, position) {
    const tileWidth = 0.6;
    const startX = position.hand.x - (player.hand.length * tileWidth) / 2;

    for (let i = 0; i < player.hand.length; i++) {
      const tile = player.hand[i];
      const x = startX + i * tileWidth;
      const y = position.hand.y;
      const z = position.hand.z;

      tile.setPosition(x, y, z, true);
      tile.setRotation(0, 0, 0, true);
      tile.flip(true, false); // 앞면 표시

      await this.delay(50);
    }
  }

  async arrangeAIPlayerHand(player, position, playerIndex) {
    const tileWidth = 0.6;
    let startX, startZ, rotationY;

    switch (playerIndex) {
      case 1: // 남 (우측)
        startZ = position.hand.z - (player.hand.length * tileWidth) / 2;
        rotationY = Math.PI / 2;
        break;
      case 2: // 서 (상단)
        startX = position.hand.x + (player.hand.length * tileWidth) / 2;
        rotationY = Math.PI;
        break;
      case 3: // 북 (좌측)
        startZ = position.hand.z + (player.hand.length * tileWidth) / 2;
        rotationY = -Math.PI / 2;
        break;
    }

    for (let i = 0; i < player.hand.length; i++) {
      const tile = player.hand[i];
      let x, z;

      switch (playerIndex) {
        case 1: // 남
          x = position.hand.x;
          z = startZ + i * tileWidth;
          break;
        case 2: // 서
          x = startX - i * tileWidth;
          z = position.hand.z;
          break;
        case 3: // 북
          x = position.hand.x;
          z = startZ - i * tileWidth;
          break;
      }

      tile.setPosition(x, position.hand.y, z, true);
      tile.setRotation(0, rotationY, 0, true);
      tile.flip(false, false); // 뒷면 표시

      await this.delay(30);
    }
  }

  setupDora() {
    if (this.deadWallTiles.length > 0) {
      // 도라 표시패 (왕패의 3번째)
      const doraIndicator = this.deadWallTiles[2];
      this.dora = [doraIndicator];

      // 도라 표시패 위치 설정
      doraIndicator.setPosition(2, 0.2, 2, true);
      doraIndicator.flip(true, true); // 앞면 표시

      console.log(`도라 표시패: ${doraIndicator.toString()}`);
    }
  }

  startPlayerTurn() {
    const currentPlayer = this.players[this.currentPlayerIndex];
    console.log(`${currentPlayer.name}의 턴`);

    if (this.onPlayerTurn) {
      this.onPlayerTurn(this.currentPlayerIndex);
    }

    if (currentPlayer.isHuman) {
      this.startHumanPlayerTurn();
    } else {
      this.startAIPlayerTurn();
    }
  }

  startHumanPlayerTurn() {
    const player = this.humanPlayer;

    // 쯔모 체크
    if (player.lastDrawnTile && this.handEvaluator.isWinningHand(player.hand)) {
      this.showTsumoOption();
    }

    // 깡 체크
    this.checkPossibleKan(player);

    // 리치 체크
    if (this.canDeclareRiichi(player)) {
      this.showRiichiOption();
    }

    console.log("인간 플레이어 턴: 패를 선택하여 버리세요");
  }

  async startAIPlayerTurn() {
    const playerIndex = this.currentPlayerIndex;
    const player = this.players[playerIndex];
    const ai = this.aiPlayers[playerIndex - 1];

    // AI 사고 시간
    await this.delay(ai.getThinkingTime());

    // AI 결정
    const decision = await ai.makeDecision(player, this.getGameState());

    if (decision.type === "tsumo") {
      this.handleTsumo(playerIndex);
    } else if (decision.type === "kan") {
      this.handleKan(playerIndex, decision.tiles);
    } else if (decision.type === "riichi") {
      this.handleRiichi(playerIndex, decision.discardTile);
    } else if (decision.type === "discard") {
      this.handleDiscard(playerIndex, decision.tile);
    }
  }

  // === 플레이어 액션 처리 ===

  onTileSelected(tile) {
    if (this.currentPlayerIndex !== 0 || this.roundState !== "playing") return;

    console.log(`타일 선택됨: ${tile.toString()}`);
  }

  onTileDiscarded(tile) {
    if (this.currentPlayerIndex !== 0 || this.roundState !== "playing") return;

    const player = this.humanPlayer;
    const tileIndex = player.hand.indexOf(tile);

    if (tileIndex === -1) {
      console.log("손패에 없는 타일입니다");
      return;
    }

    this.handleDiscard(0, tile);
  }

  async handleDiscard(playerIndex, tile) {
    const player = this.players[playerIndex];
    const position = this.playerPositions[playerIndex];

    // 손패에서 제거
    const tileIndex = player.hand.indexOf(tile);
    if (tileIndex === -1) return;

    player.hand.splice(tileIndex, 1);
    player.lastDrawnTile = null;

    // 버린패 더미에 추가
    this.discardPiles[playerIndex].push(tile);

    // 버린 위치 계산
    const discardCount = this.discardPiles[playerIndex].length;
    const row = Math.floor((discardCount - 1) / 6);
    const col = (discardCount - 1) % 6;

    const discardX = position.discard.x + (col - 2.5) * 0.6;
    const discardZ = position.discard.z + row * 0.7;
    const discardPosition = new THREE.Vector3(
      discardX,
      position.discard.y,
      discardZ
    );

    // 버리기 애니메이션
    tile.discard(discardPosition, () => {
      console.log(`${player.name}이 ${tile.toString()}을 버렸습니다`);
    });

    // 상태 업데이트
    this.lastDiscardedTile = tile;
    this.lastDiscardedBy = playerIndex;

    // 손패 재정렬
    await this.arrangePlayerHand(playerIndex);

    // 다른 플레이어들의 치/폰/깡/론 체크
    await this.checkClaimOptions();

    // 클레임이 없으면 다음 턴
    if (!this.canClaim) {
      this.nextTurn();
    }
  }

  async checkClaimOptions() {
    if (!this.lastDiscardedTile) return;

    const discardedTile = this.lastDiscardedTile;
    const discardedBy = this.lastDiscardedBy;
    const claimOptions = {};

    // 각 플레이어별로 클레임 옵션 체크
    for (let i = 0; i < this.settings.playerCount; i++) {
      if (i === discardedBy) continue; // 버린 플레이어는 제외

      const player = this.players[i];
      const options = {};

      // 론 체크
      if (this.handEvaluator.canWin(player.hand, discardedTile)) {
        options.ron = true;
      }

      // 폰 체크 (같은 패 2장)
      if (this.canPon(player, discardedTile)) {
        options.pon = true;
      }

      // 깡 체크 (같은 패 3장)
      if (this.canKan(player, discardedTile)) {
        options.kan = true;
      }

      // 치 체크 (다음 턴 플레이어만 가능)
      const nextPlayerIndex = (discardedBy + 1) % this.settings.playerCount;
      if (i === nextPlayerIndex && this.canChi(player, discardedTile)) {
        options.chi = this.getChiOptions(player, discardedTile);
      }

      if (Object.keys(options).length > 0) {
        claimOptions[i] = options;
      }
    }

    // 클레임 옵션이 있으면 처리
    if (Object.keys(claimOptions).length > 0) {
      this.canClaim = true;
      await this.handleClaimOptions(claimOptions);
    }
  }

  async handleClaimOptions(claimOptions) {
    // 우선순위: 론 > 폰/깡 > 치

    // 1. 론 체크 (가장 높은 우선순위)
    for (const [playerIndex, options] of Object.entries(claimOptions)) {
      if (options.ron) {
        if (this.players[playerIndex].isHuman) {
          this.showRonOption();
          return;
        } else {
          // AI 론 결정
          const ai = this.aiPlayers[parseInt(playerIndex) - 1];
          const shouldRon = await ai.shouldClaim("ron", this.lastDiscardedTile);
          if (shouldRon) {
            await this.handleRon(parseInt(playerIndex));
            return;
          }
        }
      }
    }

    // 2. 폰/깡 체크
    for (const [playerIndex, options] of Object.entries(claimOptions)) {
      if (options.pon || options.kan) {
        if (this.players[playerIndex].isHuman) {
          this.showPonKanOptions(options);
          return;
        } else {
          // AI 폰/깡 결정
          const ai = this.aiPlayers[parseInt(playerIndex) - 1];
          if (
            options.kan &&
            (await ai.shouldClaim("kan", this.lastDiscardedTile))
          ) {
            await this.handleKan(parseInt(playerIndex), [
              this.lastDiscardedTile,
            ]);
            return;
          } else if (
            options.pon &&
            (await ai.shouldClaim("pon", this.lastDiscardedTile))
          ) {
            await this.handlePon(parseInt(playerIndex));
            return;
          }
        }
      }
    }

    // 3. 치 체크 (다음 턴 플레이어)
    const nextPlayerIndex =
      (this.lastDiscardedBy + 1) % this.settings.playerCount;
    if (claimOptions[nextPlayerIndex] && claimOptions[nextPlayerIndex].chi) {
      if (this.players[nextPlayerIndex].isHuman) {
        this.showChiOptions(claimOptions[nextPlayerIndex].chi);
        return;
      } else {
        // AI 치 결정
        const ai = this.aiPlayers[nextPlayerIndex - 1];
        const chiOption = await ai.shouldClaim("chi", this.lastDiscardedTile);
        if (chiOption) {
          await this.handleChi(nextPlayerIndex, chiOption);
          return;
        }
      }
    }

    // 아무도 클레임하지 않음
    this.canClaim = false;
  }

  // === 멜드 처리 ===

  canPon(player, tile) {
    let count = 0;
    for (const handTile of player.hand) {
      if (handTile.equals(tile)) {
        count++;
      }
    }
    return count >= 2;
  }

  canKan(player, tile) {
    let count = 0;
    for (const handTile of player.hand) {
      if (handTile.equals(tile)) {
        count++;
      }
    }
    return count >= 3;
  }

  canChi(player, tile) {
    if (tile.type === "honor") return false; // 자패는 치 불가

    return this.getChiOptions(player, tile).length > 0;
  }

  getChiOptions(player, tile) {
    if (tile.type === "honor") return [];

    const options = [];
    const tileNum = tile.number;

    // 123 형태 (버린 패가 1)
    if (
      tileNum <= 7 &&
      this.hasSequenceTiles(player, tile.type, tileNum + 1, tileNum + 2)
    ) {
      options.push([tileNum, tileNum + 1, tileNum + 2]);
    }

    // 123 형태 (버린 패가 2)
    if (
      tileNum >= 2 &&
      tileNum <= 8 &&
      this.hasSequenceTiles(player, tile.type, tileNum - 1, tileNum + 1)
    ) {
      options.push([tileNum - 1, tileNum, tileNum + 1]);
    }

    // 123 형태 (버린 패가 3)
    if (
      tileNum >= 3 &&
      this.hasSequenceTiles(player, tile.type, tileNum - 2, tileNum - 1)
    ) {
      options.push([tileNum - 2, tileNum - 1, tileNum]);
    }

    return options;
  }

  hasSequenceTiles(player, type, num1, num2) {
    let found1 = false,
      found2 = false;

    for (const tile of player.hand) {
      if (tile.type === type && tile.number === num1) found1 = true;
      if (tile.type === type && tile.number === num2) found2 = true;
    }

    return found1 && found2;
  }

  async handlePon(playerIndex) {
    const player = this.players[playerIndex];
    const claimedTile = this.lastDiscardedTile;

    console.log(`${player.name}이 ${claimedTile.toString()}로 폰`);

    // 손패에서 같은 패 2장 찾아서 제거
    const sameTiles = [];
    for (let i = player.hand.length - 1; i >= 0; i--) {
      if (player.hand[i].equals(claimedTile) && sameTiles.length < 2) {
        sameTiles.push(player.hand.splice(i, 1)[0]);
      }
    }

    // 멜드 생성 (클레임한 패 + 손패 2장)
    const meld = [claimedTile, ...sameTiles];
    player.melds.push(meld);

    // 멜드 위치에 배치
    await this.arrangeMeld(playerIndex, meld);

    // 현재 턴 플레이어로 변경
    this.currentPlayerIndex = playerIndex;
    this.canClaim = false;

    // 손패 재정렬
    await this.arrangePlayerHand(playerIndex);

    // 턴 시작 (폰한 플레이어가 바로 버려야 함)
    this.startPlayerTurn();
  }

  async handleChi(playerIndex, chiOption) {
    const player = this.players[playerIndex];
    const claimedTile = this.lastDiscardedTile;

    console.log(`${player.name}이 ${claimedTile.toString()}로 치`);

    // 치에 필요한 나머지 2장 찾아서 제거
    const neededTiles = chiOption.filter((num) => num !== claimedTile.number);
    const usedTiles = [claimedTile];

    for (const neededNum of neededTiles) {
      for (let i = player.hand.length - 1; i >= 0; i--) {
        const tile = player.hand[i];
        if (tile.type === claimedTile.type && tile.number === neededNum) {
          usedTiles.push(player.hand.splice(i, 1)[0]);
          break;
        }
      }
    }

    // 순서대로 정렬
    usedTiles.sort((a, b) => a.number - b.number);
    player.melds.push(usedTiles);

    // 멜드 위치에 배치
    await this.arrangeMeld(playerIndex, usedTiles);

    // 현재 턴 플레이어로 변경
    this.currentPlayerIndex = playerIndex;
    this.canClaim = false;

    // 손패 재정렬
    await this.arrangePlayerHand(playerIndex);

    // 턴 시작
    this.startPlayerTurn();
  }

  async handleKan(playerIndex, kanTiles) {
    const player = this.players[playerIndex];
    console.log(`${player.name}이 깡`);

    // 깡 처리 (대명깡/암깡/가깡)
    // 여기서는 간단히 대명깡만 구현
    if (kanTiles.length === 1) {
      // 대명깡 - 손패에서 같은 패 3장 찾기
      const claimedTile = kanTiles[0];
      const sameTiles = [claimedTile];

      for (let i = player.hand.length - 1; i >= 0; i--) {
        if (player.hand[i].equals(claimedTile) && sameTiles.length < 4) {
          sameTiles.push(player.hand.splice(i, 1)[0]);
        }
      }

      player.melds.push(sameTiles);
      await this.arrangeMeld(playerIndex, sameTiles);
    }

    // 깡 후 왕패에서 1장 보충
    if (this.deadWallTiles.length > 0) {
      const newTile = this.deadWallTiles.pop();
      newTile.owner = `player${playerIndex}`;
      player.hand.push(newTile);
      player.lastDrawnTile = newTile;
    }

    // 현재 턴 플레이어로 변경
    this.currentPlayerIndex = playerIndex;
    this.canClaim = false;

    // 손패 재정렬
    await this.arrangePlayerHand(playerIndex);

    // 턴 시작
    this.startPlayerTurn();
  }

  async arrangeMeld(playerIndex, meld) {
    const position = this.playerPositions[playerIndex];
    const meldIndex = this.players[playerIndex].melds.length - 1;

    for (let i = 0; i < meld.length; i++) {
      const tile = meld[i];
      const x = position.meld.x + meldIndex * 2 + i * 0.6;
      const y = position.meld.y;
      const z = position.meld.z;

      tile.moveToMeld(new THREE.Vector3(x, y, z), new THREE.Euler(0, 0, 0));

      // 멜드는 모두 앞면 표시
      tile.flip(true, true);
    }
  }

  // === 화료 처리 ===

  async handleTsumo(playerIndex) {
    const player = this.players[playerIndex];
    console.log(`${player.name} 쯔모!`);

    const winInfo = this.evaluateWin(player, player.lastDrawnTile, true);
    await this.endRound("tsumo", playerIndex, winInfo);
  }

  async handleRon(playerIndex) {
    const player = this.players[playerIndex];
    console.log(`${player.name} 론!`);

    const winInfo = this.evaluateWin(player, this.lastDiscardedTile, false);
    await this.endRound("ron", playerIndex, winInfo);
  }

  evaluateWin(player, winTile, isTsumo) {
    const conditions = {
      isTsumo: isTsumo,
      isRiichi: player.isRiichi,
      isDealer: this.currentPlayerIndex === this.dealerIndex,
      playerWind: player.wind,
      roundWind: this.gameWind,
      dora: this.dora,
      uraDora: player.isRiichi ? this.uraDora : [],
      remainingTiles: this.remainingTiles,
      honba: this.honba,
    };

    const yakuList = this.yakuChecker.checkAllYaku(
      player.hand,
      winTile,
      conditions
    );
    const score = this.calculateScore(yakuList, conditions);

    return {
      yakuList: yakuList,
      score: score,
      han: yakuList.reduce((total, yaku) => total + yaku.han, 0),
      fu: this.calculateFu(player.hand, winTile, conditions),
    };
  }

  calculateScore(yakuList, conditions) {
    const totalHan = yakuList.reduce((total, yaku) => total + yaku.han, 0);

    // 기본 점수 계산 (간단화)
    let baseScore = 0;

    if (totalHan >= 13) {
      // 역만
      baseScore = 32000;
    } else if (totalHan >= 11) {
      // 삼배만
      baseScore = 24000;
    } else if (totalHan >= 8) {
      // 배만
      baseScore = 16000;
    } else if (totalHan >= 6) {
      // 한박만
      baseScore = 12000;
    } else if (totalHan >= 5) {
      // 만관
      baseScore = 8000;
    } else {
      // 일반적인 점수 계산
      baseScore = Math.min(8000, Math.pow(2, totalHan + 2) * 100);
    }

    // 친/자 배수 적용
    if (conditions.isDealer) {
      baseScore = Math.floor(baseScore * 1.5);
    }

    // 본장 점수 추가
    baseScore += conditions.honba * 300;

    return Math.ceil(baseScore / 100) * 100; // 100점 단위로 올림
  }

  calculateFu(hand, winTile, conditions) {
    // 부 계산 (간단화)
    let fu = 20; // 기본 부

    // 멘젠 쯔모 +2
    if (conditions.isTsumo && hand.length === 14) fu += 2;

    // 문젠론 +10
    if (!conditions.isTsumo && hand.length === 14) fu += 10;

    return Math.ceil(fu / 10) * 10; // 10부 단위로 올림
  }

  // === 리치 처리 ===

  canDeclareRiichi(player) {
    if (player.isRiichi || player.score < this.settings.riichiBet) return false;
    if (player.melds.length > 0) return false; // 멘젠이 아님

    return this.handEvaluator.isTenpai(player.hand);
  }

  async handleRiichi(playerIndex, discardTile) {
    const player = this.players[playerIndex];

    console.log(`${player.name} 리치!`);

    player.isRiichi = true;
    player.score -= this.settings.riichiBet;
    this.riichiBets += this.settings.riichiBet;

    // 선언한 패 버리기
    await this.handleDiscard(playerIndex, discardTile);
  }

  // === 턴 관리 ===

  nextTurn() {
    // 패산에서 1장 뽑기
    if (this.wallTiles.length === 0) {
      this.handleGameDraw();
      return;
    }

    this.currentPlayerIndex =
      (this.currentPlayerIndex + 1) % this.settings.playerCount;
    const currentPlayer = this.players[this.currentPlayerIndex];

    // 새 패 뽑기
    const newTile = this.wallTiles.shift();
    newTile.owner = `player${this.currentPlayerIndex}`;
    currentPlayer.hand.push(newTile);
    currentPlayer.lastDrawnTile = newTile;

    this.remainingTiles = this.wallTiles.length;

    // 손패 재정렬
    this.arrangePlayerHand(this.currentPlayerIndex);

    // 턴 시작
    this.startPlayerTurn();

    this.updateGameState();
  }

  async handleGameDraw() {
    console.log("유국 (패산 고갈)");
    await this.endRound("draw", -1, null);
  }

  async endRound(result, winnerIndex, winInfo) {
    this.roundState = "ending";

    if (result === "tsumo" || result === "ron") {
      console.log(`${this.players[winnerIndex].name} 승리!`);

      // 점수 계산 및 이동
      this.distributeScores(result, winnerIndex, winInfo);

      // 연장 판정
      if (winnerIndex === this.dealerIndex) {
        this.honba++;
      } else {
        this.nextDealer();
      }
    } else if (result === "draw") {
      // 텐파이 체크
      const tenpaiPlayers = this.checkTenpaiPlayers();

      if (tenpaiPlayers.includes(this.dealerIndex)) {
        this.honba++;
      } else {
        this.nextDealer();
      }
    }

    // 게임 종료 조건 체크
    if (this.checkGameEnd()) {
      this.endGame();
    } else {
      // 다음 국
      await this.delay(3000);
      await this.startNewRound();
    }
  }

  distributeScores(result, winnerIndex, winInfo) {
    const winner = this.players[winnerIndex];
    const score = winInfo.score;

    if (result === "tsumo") {
      // 쯔모 - 모든 플레이어가 지불
      const eachPayment = Math.floor(score / 3);

      for (let i = 0; i < this.settings.playerCount; i++) {
        if (i !== winnerIndex) {
          this.players[i].score -= eachPayment;
          winner.score += eachPayment;
        }
      }
    } else if (result === "ron") {
      // 론 - 버린 플레이어만 지불
      this.players[this.lastDiscardedBy].score -= score;
      winner.score += score;
    }

    // 리치봉 지급
    winner.score += this.riichiBets;
    this.riichiBets = 0;

    console.log(`점수 변동: ${winner.name} +${score}점`);
  }

  nextDealer() {
    this.dealerIndex = (this.dealerIndex + 1) % this.settings.playerCount;
    this.honba = 0;

    // 국수 진행
    if (this.dealerIndex === 0) {
      if (this.currentWind === "east") {
        this.currentWind = "south";
        this.roundNumber = 1;
      } else if (this.currentWind === "south") {
        this.currentWind = "west";
        this.roundNumber = 1;
      } else if (this.currentWind === "west") {
        this.currentWind = "north";
        this.roundNumber = 1;
      } else {
        // 게임 종료
        this.endGame();
        return;
      }
    } else {
      this.roundNumber++;
    }
  }

  checkGameEnd() {
    // 누군가 0점 이하
    if (this.players.some((player) => player.score <= 0)) {
      return true;
    }

    // 서4국 종료
    if (this.currentWind === "north" && this.roundNumber > 4) {
      return true;
    }

    return false;
  }

  checkTenpaiPlayers() {
    const tenpaiPlayers = [];

    for (let i = 0; i < this.settings.playerCount; i++) {
      const player = this.players[i];
      if (this.handEvaluator.isTenpai(player.hand)) {
        tenpaiPlayers.push(i);
      }
    }

    return tenpaiPlayers;
  }

  endGame() {
    this.gameState = "gameEnd";

    // 최종 순위 계산
    const rankings = [...this.players]
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({
        rank: index + 1,
        name: player.name,
        score: player.score,
      }));

    console.log("게임 종료!");
    console.log("최종 순위:", rankings);

    if (this.onGameEnd) {
      this.onGameEnd(rankings);
    }
  }

  // === UI 관련 ===

  showTsumoOption() {
    // UI에 쯔모 버튼 활성화
    const tsumoBtn = document.getElementById("btn-tsumo");
    if (tsumoBtn) {
      tsumoBtn.disabled = false;
      tsumoBtn.onclick = () => this.handleTsumo(0);
    }
  }

  showRonOption() {
    // UI에 론 버튼 활성화
    const ronBtn = document.getElementById("btn-ron");
    if (ronBtn) {
      ronBtn.disabled = false;
      ronBtn.onclick = () => this.handleRon(0);
    }
  }

  showRiichiOption() {
    // UI에 리치 버튼 활성화
    const riichiBtn = document.getElementById("btn-riichi");
    if (riichiBtn) {
      riichiBtn.disabled = false;
      // 리치는 버릴 패를 선택해야 하므로 플래그만 설정
      riichiBtn.onclick = () => {
        this.humanPlayer.wantToRiichi = true;
        console.log("리치를 선언합니다. 버릴 패를 선택하세요.");
      };
    }
  }

  showPonKanOptions(options) {
    if (options.pon) {
      const ponBtn = document.getElementById("btn-pon");
      if (ponBtn) {
        ponBtn.disabled = false;
        ponBtn.onclick = () => this.handlePon(0);
      }
    }

    if (options.kan) {
      const kanBtn = document.getElementById("btn-kan");
      if (kanBtn) {
        kanBtn.disabled = false;
        kanBtn.onclick = () => this.handleKan(0, [this.lastDiscardedTile]);
      }
    }

    // 타이머 설정 (5초 후 자동으로 패스)
    this.claimTimer = setTimeout(() => {
      this.canClaim = false;
      this.nextTurn();
    }, 5000);
  }

  showChiOptions(chiOptions) {
    const chiBtn = document.getElementById("btn-chi");
    if (chiBtn) {
      chiBtn.disabled = false;
      chiBtn.onclick = () => {
        // 첫 번째 치 옵션 사용 (실제로는 선택 UI 필요)
        this.handleChi(0, chiOptions[0]);
      };
    }

    // 타이머 설정
    this.claimTimer = setTimeout(() => {
      this.canClaim = false;
      this.nextTurn();
    }, 5000);
  }

  updateGameState() {
    // UI 업데이트
    this.updateScoreDisplay();
    this.updateGameStatusDisplay();
    this.updateButtonStates();

    if (this.onGameStateChanged) {
      this.onGameStateChanged(this.getGameState());
    }
  }

  updateScoreDisplay() {
    const scoreElements = [
      "score-east",
      "score-south",
      "score-west",
      "score-north",
    ];

    for (let i = 0; i < this.settings.playerCount; i++) {
      const element = document.getElementById(scoreElements[i]);
      if (element) {
        element.textContent = this.players[i].score.toLocaleString();
      }
    }
  }

  updateGameStatusDisplay() {
    const roundElement = document.getElementById("round-number");
    const tilesElement = document.getElementById("remaining-tiles");
    const doraElement = document.getElementById("dora-indicator");

    if (roundElement) {
      roundElement.textContent = `${this.roundNumber}`;
    }

    if (tilesElement) {
      tilesElement.textContent = this.remainingTiles;
    }

    if (doraElement && this.dora.length > 0) {
      doraElement.textContent = this.dora[0].toString();
    }
  }

  updateButtonStates() {
    // 모든 버튼 비활성화
    const buttons = [
      "btn-riichi",
      "btn-tsumo",
      "btn-ron",
      "btn-chi",
      "btn-pon",
      "btn-kan",
    ];
    buttons.forEach((btnId) => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.disabled = true;
        btn.onclick = null;
      }
    });

    // 클레임 타이머 정리
    if (this.claimTimer) {
      clearTimeout(this.claimTimer);
      this.claimTimer = null;
    }
  }

  // === 유틸리티 ===

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

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // === 게임 제어 ===

  pause() {
    this.gameState = "paused";
    console.log("게임 일시정지");
  }

  resume() {
    if (this.gameState === "paused") {
      this.gameState = "playing";
      console.log("게임 재개");
    }
  }

  update() {
    // 매 프레임마다 호출되는 업데이트 함수
    // 현재는 특별한 처리 없음
  }

  // === 디버그 및 치트 ===

  getDebugInfo() {
    return {
      gameState: this.getGameState(),
      humanPlayerHand: this.humanPlayer
        ? this.humanPlayer.hand.map((tile) => tile.toString())
        : [],
      wallTilesCount: this.wallTiles.length,
      deadWallTilesCount: this.deadWallTiles.length,
      currentPlayer: this.players[this.currentPlayerIndex].name,
    };
  }

  // 치트: 특정 패를 손패에 추가
  addTileToHand(playerIndex, type, number) {
    if (playerIndex >= 0 && playerIndex < this.players.length) {
      const tile = new MahjongTile(
        type,
        number,
        this.sceneManager,
        new THREE.Vector3()
      );
      tile.owner = `player${playerIndex}`;
      this.players[playerIndex].hand.push(tile);
      this.arrangePlayerHand(playerIndex);
    }
  }

  // 치트: 특정 플레이어를 텐파이로 만들기
  makeTenpai(playerIndex) {
    if (playerIndex >= 0 && playerIndex < this.players.length) {
      const player = this.players[playerIndex];

      // 간단한 텐파이 손패 생성 (123만, 456통, 789삭, 동동 + 대기패)
      player.hand.forEach((tile) => tile.dispose());
      player.hand = [];

      // 123만
      for (let i = 1; i <= 3; i++) {
        const tile = new MahjongTile(
          "man",
          i,
          this.sceneManager,
          new THREE.Vector3()
        );
        tile.owner = `player${playerIndex}`;
        player.hand.push(tile);
      }

      // 456통
      for (let i = 4; i <= 6; i++) {
        const tile = new MahjongTile(
          "pin",
          i,
          this.sceneManager,
          new THREE.Vector3()
        );
        tile.owner = `player${playerIndex}`;
        player.hand.push(tile);
      }

      // 789삭
      for (let i = 7; i <= 9; i++) {
        const tile = new MahjongTile(
          "sou",
          i,
          this.sceneManager,
          new THREE.Vector3()
        );
        tile.owner = `player${playerIndex}`;
        player.hand.push(tile);
      }

      // 동동동
      for (let i = 0; i < 3; i++) {
        const tile = new MahjongTile(
          "honor",
          "east",
          this.sceneManager,
          new THREE.Vector3()
        );
        tile.owner = `player${playerIndex}`;
        player.hand.push(tile);
      }

      // 1개 더 (13장)
      const tile = new MahjongTile(
        "man",
        1,
        this.sceneManager,
        new THREE.Vector3()
      );
      tile.owner = `player${playerIndex}`;
      player.hand.push(tile);

      this.arrangePlayerHand(playerIndex);
      console.log(`${player.name}을 텐파이로 설정했습니다.`);
    }
  }

  // === 정리 ===

  dispose() {
    // 모든 타일 정리
    this.clearAllTiles();

    // AI 정리
    this.aiPlayers.forEach((ai) => {
      if (ai.dispose) ai.dispose();
    });

    // 타이머 정리
    if (this.claimTimer) {
      clearTimeout(this.claimTimer);
    }

    // 콜백 제거
    this.onGameStateChanged = null;
    this.onPlayerTurn = null;
    this.onRoundEnd = null;
    this.onGameEnd = null;

    console.log("마작 게임 정리 완료");
  }
}
