// src/game/MahjongPlayer.js (수정된 버전)
export class MahjongPlayer {
  constructor(index, isHuman, name, wind) {
    this.index = index;
    this.isHuman = isHuman;
    this.name = name;
    this.wind = wind; // 'east', 'south', 'west', 'north'

    // 게임 상태
    this.score = 25000; // 시작 점수
    this.hand = []; // 손패 (13장 또는 14장)
    this.melds = []; // 멜드 (치/폰/깡으로 만든 조합)
    this.discardPile = []; // 버린패들 (참조용, 실제는 게임에서 관리)

    // 특수 상태
    this.isRiichi = false;
    this.richiTurn = -1; // 리치 선언한 턴
    this.lastDrawnTile = null; // 마지막에 뽑은 패
    this.isTenpai = false;
    this.waitingTiles = []; // 대기패 목록

    // 게임 진행 상태
    this.position = null; // 3D 위치 정보
    this.isDealer = false; // 동가 여부
    this.consecutiveWins = 0; // 연속 승리 횟수

    // AI/UI 관련
    this.wantToRiichi = false; // 리치 선언 의사
    this.claimDecision = null; // 치/폰/깡 결정
    this.thinkingTime = 1000; // AI 사고 시간

    // 통계
    this.stats = {
      handsPlayed: 0,
      wins: 0,
      tsumos: 0,
      rons: 0,
      riichis: 0,
      averageScore: 0,
      bestHand: null,
    };
  }

  // === 손패 관리 ===

  // 손패 정렬
  sortHand() {
    this.hand.sort((a, b) => a.compare(b));
  }

  // 손패에 패 추가
  addTile(tile) {
    tile.owner = `player${this.index}`;
    this.hand.push(tile);
    this.lastDrawnTile = tile;

    // 정렬은 필요시에만 (성능 최적화)
    if (this.isHuman) {
      this.sortHand();
    }
  }

  // 손패에서 패 제거
  removeTile(tile) {
    const index = this.hand.indexOf(tile);
    if (index !== -1) {
      this.hand.splice(index, 1);

      if (this.lastDrawnTile === tile) {
        this.lastDrawnTile = null;
      }

      return tile;
    }
    return null;
  }

  // 특정 타입/번호의 패 찾기
  findTiles(type, number) {
    return this.hand.filter(
      (tile) => tile.type === type && tile.number === number
    );
  }

  // 같은 패 개수 세기
  countTile(type, number) {
    return this.hand.filter(
      (tile) => tile.type === type && tile.number === number
    ).length;
  }

  // 손패를 문자열로 변환 (디버그용)
  handToString() {
    return this.hand.map((tile) => tile.toString()).join(" ");
  }

  // === 손패 배치 (수정된 버전) ===

  async arrangeHand(sceneManager) {
    // 패 정렬
    this.sortHand();

    if (this.isHuman) {
      await this.arrangeHumanHand();
    } else {
      await this.arrangeAIHand();
    }
  }

  async arrangeHumanHand() {
    const tileWidth = 0.55;
    const baseX = -(this.hand.length * tileWidth) / 2;
    const baseY = 0.35;
    const baseZ = 4.8;

    const arrangePromises = this.hand.map((tile, i) => {
      const x = baseX + i * tileWidth;
      const y = baseY;
      const z = baseZ;

      // 인간 플레이어 패는 선택 가능하도록 설정
      tile.mesh.userData.selectable = true;

      return tile.arrangeInHand(
        { x, y, z },
        { x: 0, y: 0, z: 0 }, // 앞면
        true, // 인간 플레이어는 앞면
        i * 0.05 // 지연시간
      );
    });

    await Promise.all(arrangePromises);
  }

  async arrangeAIHand() {
    const tileWidth = 0.55;
    let baseX, baseY, baseZ, rotationY;

    // 올바른 마작 방향 (각 플레이어를 기준으로 자신을 향하도록)
    switch (this.index) {
      case 1: // South (우측) - 중앙(플레이어)을 바라봄
        baseX = 4.8;
        baseY = 0.35;
        baseZ = -(this.hand.length * tileWidth) / 2; // 수정: 중앙을 향하도록
        rotationY = Math.PI / 2; // 수정: 중앙을 바라봄
        break;
      case 2: // West (상단) - 중앙(플레이어)을 바라봄
        baseX = (this.hand.length * tileWidth) / 2;
        baseY = 0.35;
        baseZ = -4.8;
        rotationY = 0; // 수정: 중앙을 바라봄 (플레이어와 같은 방향)
        break;
      case 3: // North (좌측) - 중앙(플레이어)을 바라봄
        baseX = -4.8;
        baseY = 0.35;
        baseZ = (this.hand.length * tileWidth) / 2; // 수정: 중앙을 향하도록
        rotationY = -Math.PI / 2; // 수정: 중앙을 바라봄
        break;
    }

    const arrangePromises = this.hand.map((tile, i) => {
      let x, z;

      switch (this.index) {
        case 1: // South (우측)
          x = baseX;
          z = baseZ + i * tileWidth;
          break;
        case 2: // West (상단)
          x = baseX - i * tileWidth;
          z = baseZ;
          break;
        case 3: // North (좌측)
          x = baseX;
          z = baseZ - i * tileWidth;
          break;
      }

      // AI 플레이어 패는 선택 불가능하도록 설정
      tile.mesh.userData.selectable = false;

      return tile.arrangeInHand(
        { x, y: baseY, z },
        { x: 0, y: rotationY, z: 0 },
        false, // AI는 뒷면
        i * 0.03 // 지연시간
      );
    });

    await Promise.all(arrangePromises);
  }

  // === 멜드 관리 ===

  // 멜드 추가 (치/폰/깡)
  addMeld(meld, type = "unknown") {
    const meldInfo = {
      tiles: meld,
      type: type, // 'chi', 'pon', 'kan', 'ankan'
      from: -1, // 어느 플레이어로부터 받았는지
      turn: -1, // 언제 만들었는지
      isConcealed: type === "ankan", // 암깡 여부
    };

    this.melds.push(meldInfo);

    console.log(
      `${this.name}: ${type} 멜드 추가 - ${meld
        .map((t) => t.toString())
        .join(" ")}`
    );
  }

  // 치 가능한지 체크
  canChi(discardedTile) {
    if (discardedTile.type === "honor") return false;

    const options = this.getChiOptions(discardedTile);
    return options.length > 0;
  }

  // 치 옵션들 반환
  getChiOptions(discardedTile) {
    const options = [];
    const tileNum = discardedTile.number;
    const tileType = discardedTile.type;

    // 123 형태 (버린 패가 1)
    if (tileNum <= 7) {
      const has2 = this.countTile(tileType, tileNum + 1) > 0;
      const has3 = this.countTile(tileType, tileNum + 2) > 0;
      if (has2 && has3) {
        options.push([tileNum, tileNum + 1, tileNum + 2]);
      }
    }

    // 123 형태 (버린 패가 2)
    if (tileNum >= 2 && tileNum <= 8) {
      const has1 = this.countTile(tileType, tileNum - 1) > 0;
      const has3 = this.countTile(tileType, tileNum + 1) > 0;
      if (has1 && has3) {
        options.push([tileNum - 1, tileNum, tileNum + 1]);
      }
    }

    // 123 형태 (버린 패가 3)
    if (tileNum >= 3) {
      const has1 = this.countTile(tileType, tileNum - 2) > 0;
      const has2 = this.countTile(tileType, tileNum - 1) > 0;
      if (has1 && has2) {
        options.push([tileNum - 2, tileNum - 1, tileNum]);
      }
    }

    return options;
  }

  // 폰 가능한지 체크
  canPon(discardedTile) {
    return this.countTile(discardedTile.type, discardedTile.number) >= 2;
  }

  // 대명깡 가능한지 체크
  canKan(discardedTile) {
    return this.countTile(discardedTile.type, discardedTile.number) >= 3;
  }

  // 암깡 가능한 패들 반환
  getAnkanOptions() {
    const options = [];
    const tileCounts = {};

    // 손패의 각 패 종류별 개수 세기
    for (const tile of this.hand) {
      const key = `${tile.type}_${tile.number}`;
      tileCounts[key] = (tileCounts[key] || 0) + 1;
    }

    // 4장인 패들 찾기
    for (const [key, count] of Object.entries(tileCounts)) {
      if (count === 4) {
        const [type, number] = key.split("_");
        const tiles = this.findTiles(
          type,
          type === "honor" ? number : parseInt(number)
        );
        options.push(tiles);
      }
    }

    return options;
  }

  // 가깡 가능한지 체크 (기존 폰에 1장 추가)
  getKakanOptions() {
    const options = [];

    for (const meld of this.melds) {
      if (meld.type === "pon" && meld.tiles.length === 3) {
        const meldTile = meld.tiles[0];
        if (this.countTile(meldTile.type, meldTile.number) > 0) {
          options.push({
            meld: meld,
            tile: this.findTiles(meldTile.type, meldTile.number)[0],
          });
        }
      }
    }

    return options;
  }

  // === 게임 상태 관리 ===

  // 리치 선언
  declareRiichi(turn) {
    if (this.isRiichi || this.score < 1000) return false;
    if (this.melds.length > 0) return false; // 멘젠이 아님

    this.isRiichi = true;
    this.richiTurn = turn;
    this.score -= 1000;

    console.log(`${this.name} 리치 선언! (${turn}턴)`);
    this.stats.riichis++;

    return true;
  }

  // 텐파이 상태 업데이트
  updateTenpaiStatus(handEvaluator) {
    this.isTenpai = handEvaluator.isTenpai(this.hand);

    if (this.isTenpai) {
      this.waitingTiles = handEvaluator.getWaitingTiles(this.hand);
      console.log(
        `${this.name} 텐파이! 대기패: ${this.waitingTiles
          .map((t) => t.toString())
          .join(", ")}`
      );
    } else {
      this.waitingTiles = [];
    }
  }

  // 화료 처리
  win(winType, winTile, yakuInfo) {
    this.stats.wins++;
    if (winType === "tsumo") {
      this.stats.tsumos++;
    } else {
      this.stats.rons++;
    }

    const scoreGain = yakuInfo.score;
    this.score += scoreGain;
    this.consecutiveWins++;

    // 최고 점수 손패 기록
    if (!this.stats.bestHand || yakuInfo.han > this.stats.bestHand.han) {
      this.stats.bestHand = {
        hand: this.hand.map((t) => t.toString()),
        winTile: winTile.toString(),
        yakuList: yakuInfo.yakuList,
        han: yakuInfo.han,
        score: scoreGain,
        type: winType,
      };
    }

    console.log(`${this.name} ${winType}! +${scoreGain}점 (${yakuInfo.han}한)`);
  }

  // === AI 지원 함수들 ===

  // 버릴 후보 패들 반환
  getDiscardCandidates() {
    if (this.isRiichi) {
      // 리치 후에는 쯔모패만 버릴 수 있음
      return this.lastDrawnTile ? [this.lastDrawnTile] : [];
    }

    // 일반적으로는 모든 손패가 후보
    return [...this.hand];
  }

  // 안전패 판정 (다른 플레이어가 론할 가능성이 낮은 패)
  getSafeTiles(gameState) {
    const safeTiles = [];

    for (const tile of this.hand) {
      if (this.isSafeTile(tile, gameState)) {
        safeTiles.push(tile);
      }
    }

    return safeTiles;
  }

  // 개별 패의 안전도 판정
  isSafeTile(tile, gameState) {
    // 이미 4장이 모두 보인 패는 안전
    const visibleCount = this.countVisibleTiles(tile, gameState);
    if (visibleCount >= 4) return true;

    // 리치 플레이어가 버린 패는 비교적 안전
    for (let i = 0; i < gameState.players.length; i++) {
      const player = gameState.players[i];
      if (player.isRiichi) {
        const discards = gameState.discardPiles[i];
        if (discards.some((t) => t.equals(tile))) {
          return true;
        }
      }
    }

    // 말단패 (1, 9, 자패)는 비교적 안전
    if (tile.type === "honor" || tile.number === 1 || tile.number === 9) {
      return true;
    }

    return false;
  }

  // 보이는 패 개수 세기
  countVisibleTiles(targetTile, gameState) {
    let count = 0;

    // 모든 플레이어의 버린패 체크
    for (const discardPile of gameState.discardPiles) {
      count += discardPile.filter((tile) => tile.equals(targetTile)).length;
    }

    // 모든 플레이어의 멜드 체크
    for (const player of gameState.players) {
      for (const meld of player.melds) {
        count += meld.tiles.filter((tile) => tile.equals(targetTile)).length;
      }
    }

    // 도라 표시패도 체크
    if (gameState.dora) {
      count += gameState.dora.filter((tile) => tile.equals(targetTile)).length;
    }

    return count;
  }

  // 유효패 점수 계산 (이 패를 얻었을 때의 이득)
  calculateTileValue(tile, handEvaluator) {
    const testHand = [...this.hand, tile];

    // 즉시 화료 가능한가?
    if (handEvaluator.isWinningHand(testHand)) {
      return 1000; // 매우 높은 점수
    }

    // 텐파이가 되는가?
    if (handEvaluator.isTenpai(testHand)) {
      return 100;
    }

    // 샨텐 수가 줄어드는가?
    const currentShanten = handEvaluator.calculateShanten(this.hand);
    const newShanten = handEvaluator.calculateShanten(testHand);

    if (newShanten < currentShanten) {
      return 50;
    }

    // 멘츠나 타츠(대자, 양면 등)가 만들어지는가?
    return this.calculateMeldValue(tile);
  }

  // 멘츠/타츠 가치 계산
  calculateMeldValue(newTile) {
    let value = 0;

    // 대자가 되는가?
    const sameCount = this.countTile(newTile.type, newTile.number);
    if (sameCount === 1) value += 10; // 대자 완성
    if (sameCount === 2) value += 30; // 각자 완성

    // 순자 가능성이 생기는가?
    if (newTile.type !== "honor") {
      value += this.calculateSequenceValue(newTile);
    }

    return value;
  }

  // 순자 가치 계산
  calculateSequenceValue(tile) {
    let value = 0;
    const type = tile.type;
    const num = tile.number;

    // 양면 타츠가 되는가?
    if (num >= 2 && num <= 8) {
      if (this.countTile(type, num - 1) > 0) value += 15; // 좌측 연결
      if (this.countTile(type, num + 1) > 0) value += 15; // 우측 연결
    }

    // 간짱 타츠가 되는가?
    if (num >= 3 && num <= 7) {
      if (this.countTile(type, num - 2) > 0) value += 10; // 2칸 아래와 연결
      if (this.countTile(type, num + 2) > 0) value += 10; // 2칸 위와 연결
    }

    return value;
  }

  // === 라운드/게임 관리 ===

  // 새 라운드 시작시 초기화
  resetForNewRound() {
    this.hand = [];
    this.melds = [];
    this.isRiichi = false;
    this.richiTurn = -1;
    this.lastDrawnTile = null;
    this.isTenpai = false;
    this.waitingTiles = [];
    this.wantToRiichi = false;
    this.claimDecision = null;

    this.stats.handsPlayed++;
  }

  // 새 게임 시작시 초기화
  resetForNewGame() {
    this.resetForNewRound();
    this.score = 25000;
    this.consecutiveWins = 0;
    this.isDealer = this.index === 0;

    // 통계 초기화
    this.stats = {
      handsPlayed: 0,
      wins: 0,
      tsumos: 0,
      rons: 0,
      riichis: 0,
      averageScore: 0,
      bestHand: null,
    };
  }

  // 딜러 설정
  setAsDealer(isDealer) {
    this.isDealer = isDealer;
    if (isDealer) {
      console.log(`${this.name}이 동가가 되었습니다.`);
    }
  }

  // === 유틸리티 ===

  // 플레이어 상태 요약
  getStatus() {
    return {
      name: this.name,
      index: this.index,
      isHuman: this.isHuman,
      wind: this.wind,
      score: this.score,
      handCount: this.hand.length,
      meldCount: this.melds.length,
      isRiichi: this.isRiichi,
      isTenpai: this.isTenpai,
      isDealer: this.isDealer,
      waitingTiles: this.waitingTiles.map((t) => t.toString()),
    };
  }

  // 점수 변동
  changeScore(amount, reason = "") {
    const oldScore = this.score;
    this.score += amount;

    console.log(
      `${this.name} 점수 변동: ${oldScore} → ${this.score} (${
        amount > 0 ? "+" : ""
      }${amount}) ${reason}`
    );

    // 마이너스 점수 방지
    if (this.score < 0) {
      console.warn(`${this.name}의 점수가 음수가 되었습니다: ${this.score}`);
    }
  }

  // 통계 업데이트
  updateStats() {
    this.stats.averageScore =
      this.stats.handsPlayed > 0 ? this.score / this.stats.handsPlayed : 0;
  }

  // 현재 손패의 가치 추정
  estimateHandValue(handEvaluator) {
    if (handEvaluator.isWinningHand(this.hand)) {
      return 1000; // 이미 화료
    }

    if (this.isTenpai) {
      return 500 + this.waitingTiles.length * 50; // 텐파이 + 대기패 수
    }

    const shanten = handEvaluator.calculateShanten(this.hand);
    return Math.max(0, 400 - shanten * 100); // 샨텐이 적을수록 높은 점수
  }

  // 디버그 정보 출력
  debugInfo() {
    console.log(`=== ${this.name} 디버그 정보 ===`);
    console.log(`점수: ${this.score}`);
    console.log(`손패 (${this.hand.length}장): ${this.handToString()}`);
    console.log(`멜드: ${this.melds.length}개`);
    console.log(`리치: ${this.isRiichi ? "O" : "X"}`);
    console.log(`텐파이: ${this.isTenpai ? "O" : "X"}`);
    if (this.isTenpai) {
      console.log(
        `대기패: ${this.waitingTiles.map((t) => t.toString()).join(", ")}`
      );
    }
    console.log(
      `통계: 승리 ${this.stats.wins}회, 리치 ${this.stats.riichis}회`
    );
  }

  // 메모리 정리
  dispose() {
    // 손패의 3D 객체들 정리
    this.hand.forEach((tile) => {
      if (tile.dispose) tile.dispose();
    });

    // 멜드의 3D 객체들 정리
    this.melds.forEach((meld) => {
      meld.tiles.forEach((tile) => {
        if (tile.dispose) tile.dispose();
      });
    });

    this.hand = [];
    this.melds = [];
    this.position = null;
  }
}
