// src/game/HandEvaluator.js
export class HandEvaluator {
  constructor() {
    // 특수역 패턴 (국사무쌍, 칠대자 등)
    this.specialHands = {
      kokushi: [
        "man_1",
        "man_9",
        "pin_1",
        "pin_9",
        "sou_1",
        "sou_9",
        "honor_east",
        "honor_south",
        "honor_west",
        "honor_north",
        "honor_white",
        "honor_green",
        "honor_red",
      ],
    };
  }

  // 화료 가능한지 체크 (메인 함수)
  isWinningHand(hand, winTile = null) {
    const allTiles = winTile ? [...hand, winTile] : hand;

    if (allTiles.length !== 14) return false;

    return (
      this.checkSpecialHands(allTiles) || this.checkBasicWinPattern(allTiles)
    );
  }

  // 론 가능한지 체크
  canWin(hand, discardedTile) {
    return this.isWinningHand(hand, discardedTile);
  }

  // 텐파이인지 체크
  isTenpai(hand) {
    if (hand.length !== 13) return false;

    // 모든 가능한 패를 시도해보기
    const allPossibleTiles = this.getAllPossibleTiles();

    for (const testTile of allPossibleTiles) {
      if (this.isWinningHand(hand, testTile)) {
        return true;
      }
    }

    return false;
  }

  // 텐파이시 대기패 목록 반환
  getWaitingTiles(hand) {
    if (hand.length !== 13) return [];

    const waitingTiles = [];
    const allPossibleTiles = this.getAllPossibleTiles();

    for (const testTile of allPossibleTiles) {
      if (this.isWinningHand(hand, testTile)) {
        waitingTiles.push(testTile);
      }
    }

    return waitingTiles;
  }

  // 특수역 체크 (국사무쌍, 칠대자 등)
  checkSpecialHands(tiles) {
    return (
      this.checkKokushimusou(tiles) ||
      this.checkChitoitsu(tiles) ||
      this.checkThirteenOrphans(tiles)
    );
  }

  // 국사무쌍 체크
  checkKokushimusou(tiles) {
    const tileKeys = tiles.map((tile) => this.getTileKey(tile));
    const kokushiTiles = this.specialHands.kokushi;

    // 13종류의 요구패가 모두 있는지 체크
    const uniqueTiles = [...new Set(tileKeys)];

    if (uniqueTiles.length !== 13) return false;

    // 모든 패가 요구패에 포함되는지 체크
    for (const tileKey of uniqueTiles) {
      if (!kokushiTiles.includes(tileKey)) {
        return false;
      }
    }

    // 머리패 체크 (한 종류가 2장)
    const tileCounts = {};
    for (const tileKey of tileKeys) {
      tileCounts[tileKey] = (tileCounts[tileKey] || 0) + 1;
    }

    let pairCount = 0;
    for (const count of Object.values(tileCounts)) {
      if (count === 2) pairCount++;
      else if (count !== 1) return false;
    }

    return pairCount === 1;
  }

  // 칠대자 체크
  checkChitoitsu(tiles) {
    if (tiles.length !== 14) return false;

    const tileCounts = {};
    for (const tile of tiles) {
      const key = this.getTileKey(tile);
      tileCounts[key] = (tileCounts[key] || 0) + 1;
    }

    // 정확히 7개의 다른 패가 각각 2장씩
    const counts = Object.values(tileCounts);
    return counts.length === 7 && counts.every((count) => count === 2);
  }

  // 13요구 (국사의 다른 이름)
  checkThirteenOrphans(tiles) {
    return this.checkKokushimusou(tiles);
  }

  // 기본 화료형 체크 (4멘츠 1작두)
  checkBasicWinPattern(tiles) {
    if (tiles.length !== 14) return false;

    const sortedTiles = this.sortTiles([...tiles]);

    // 모든 가능한 머리(작두) 후보를 시도
    for (let i = 0; i < sortedTiles.length - 1; i++) {
      if (this.tilesEqual(sortedTiles[i], sortedTiles[i + 1])) {
        const remainingTiles = [...sortedTiles];
        remainingTiles.splice(i + 1, 1);
        remainingTiles.splice(i, 1);

        if (this.checkAllMelds(remainingTiles)) {
          return true;
        }
      }
    }

    return false;
  }

  // 모든 멘츠가 올바른지 체크
  checkAllMelds(tiles) {
    if (tiles.length === 0) return true;
    if (tiles.length % 3 !== 0) return false;

    const sortedTiles = this.sortTiles([...tiles]);

    // 각자(같은 패 3장) 우선 체크
    if (
      sortedTiles.length >= 3 &&
      this.tilesEqual(sortedTiles[0], sortedTiles[1]) &&
      this.tilesEqual(sortedTiles[1], sortedTiles[2])
    ) {
      const remaining = sortedTiles.slice(3);
      return this.checkAllMelds(remaining);
    }

    // 순자(연속 3장) 체크
    if (
      sortedTiles.length >= 3 &&
      this.canFormSequence(sortedTiles[0], sortedTiles)
    ) {
      const firstTile = sortedTiles[0];
      const remaining = [...sortedTiles];

      // 순자를 구성하는 3장 제거
      this.removeSequenceTiles(remaining, firstTile);

      return this.checkAllMelds(remaining);
    }

    return false;
  }

  // 순자를 만들 수 있는지 체크
  canFormSequence(firstTile, tiles) {
    if (firstTile.type === "honor") return false;
    if (firstTile.number > 7) return false;

    const secondTile = { type: firstTile.type, number: firstTile.number + 1 };
    const thirdTile = { type: firstTile.type, number: firstTile.number + 2 };

    const hasSecond = tiles.some((tile) => this.tilesEqual(tile, secondTile));
    const hasThird = tiles.some((tile) => this.tilesEqual(tile, thirdTile));

    return hasSecond && hasThird;
  }

  // 순자 구성 패들을 배열에서 제거
  removeSequenceTiles(tiles, firstTile) {
    const targetTiles = [
      firstTile,
      { type: firstTile.type, number: firstTile.number + 1 },
      { type: firstTile.type, number: firstTile.number + 2 },
    ];

    for (const targetTile of targetTiles) {
      const index = tiles.findIndex((tile) =>
        this.tilesEqual(tile, targetTile)
      );
      if (index !== -1) {
        tiles.splice(index, 1);
      }
    }
  }

  // 모든 가능한 패 타일 생성
  getAllPossibleTiles() {
    const tiles = [];

    // 수패 (만수, 통수, 삭수)
    ["man", "pin", "sou"].forEach((type) => {
      for (let num = 1; num <= 9; num++) {
        tiles.push({ type, number: num });
      }
    });

    // 자패
    ["east", "south", "west", "north", "white", "green", "red"].forEach(
      (honor) => {
        tiles.push({ type: "honor", number: honor });
      }
    );

    return tiles;
  }

  // 패 정렬
  sortTiles(tiles) {
    return tiles.sort((a, b) => this.compareTiles(a, b));
  }

  // 패 비교 (정렬용)
  compareTiles(a, b) {
    const typeOrder = { man: 0, pin: 1, sou: 2, honor: 3 };

    if (a.type !== b.type) {
      return typeOrder[a.type] - typeOrder[b.type];
    }

    if (a.type === "honor") {
      const honorOrder = {
        east: 0,
        south: 1,
        west: 2,
        north: 3,
        white: 4,
        green: 5,
        red: 6,
      };
      return honorOrder[a.number] - honorOrder[b.number];
    } else {
      return a.number - b.number;
    }
  }

  // 패 동일성 체크
  tilesEqual(a, b) {
    return a.type === b.type && a.number === b.number;
  }

  // 패를 고유 키로 변환
  getTileKey(tile) {
    return `${tile.type}_${tile.number}`;
  }

  // 손패 분석 (멘츠 구성 분석)
  analyzeHand(hand) {
    const analysis = {
      pairs: [], // 대자 (같은 패 2장)
      triplets: [], // 각자 (같은 패 3장)
      sequences: [], // 순자 (연속 3장)
      isolated: [], // 고립패
      partialSequences: [], // 양면, 간짱, 변짱
      isComplete: false,
      isTenpai: false,
      waitingTiles: [],
    };

    const tileCounts = this.countTiles(hand);

    // 대자와 각자 찾기
    for (const [tileKey, count] of Object.entries(tileCounts)) {
      const tile = this.keyToTile(tileKey);

      if (count >= 3) {
        analysis.triplets.push(tile);
      } else if (count === 2) {
        analysis.pairs.push(tile);
      }
    }

    // 순자 찾기
    analysis.sequences = this.findSequences(hand);

    // 고립패 찾기
    analysis.isolated = this.findIsolatedTiles(hand);

    // 부분 순자 찾기 (텐파이 판정용)
    analysis.partialSequences = this.findPartialSequences(hand);

    // 완성형 체크
    analysis.isComplete = this.isWinningHand(hand);

    // 텐파이 체크
    analysis.isTenpai = this.isTenpai(hand);
    if (analysis.isTenpai) {
      analysis.waitingTiles = this.getWaitingTiles(hand);
    }

    return analysis;
  }

  // 패 개수 세기
  countTiles(tiles) {
    const counts = {};
    for (const tile of tiles) {
      const key = this.getTileKey(tile);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }

  // 키를 타일 객체로 변환
  keyToTile(key) {
    const [type, number] = key.split("_");
    return {
      type,
      number: type === "honor" ? number : parseInt(number),
    };
  }

  // 순자 찾기
  findSequences(tiles) {
    const sequences = [];
    const tileCounts = this.countTiles(tiles);
    const processedKeys = new Set();

    for (const [tileKey, count] of Object.entries(tileCounts)) {
      if (processedKeys.has(tileKey)) continue;

      const tile = this.keyToTile(tileKey);
      if (tile.type === "honor" || tile.number > 7) continue;

      const secondKey = `${tile.type}_${tile.number + 1}`;
      const thirdKey = `${tile.type}_${tile.number + 2}`;

      if (tileCounts[secondKey] && tileCounts[thirdKey]) {
        sequences.push([tile.number, tile.number + 1, tile.number + 2]);
        processedKeys.add(tileKey);
        processedKeys.add(secondKey);
        processedKeys.add(thirdKey);
      }
    }

    return sequences;
  }

  // 고립패 찾기
  findIsolatedTiles(tiles) {
    const isolated = [];
    const tileCounts = this.countTiles(tiles);

    for (const [tileKey, count] of Object.entries(tileCounts)) {
      const tile = this.keyToTile(tileKey);

      if (count === 1 && this.isIsolated(tile, tileCounts)) {
        isolated.push(tile);
      }
    }

    return isolated;
  }

  // 패가 고립되어 있는지 체크
  isIsolated(tile, tileCounts) {
    if (tile.type === "honor") return true;

    // 인접한 패들이 있는지 체크
    for (let offset = -2; offset <= 2; offset++) {
      if (offset === 0) continue;

      const adjacentNum = tile.number + offset;
      if (adjacentNum >= 1 && adjacentNum <= 9) {
        const adjacentKey = `${tile.type}_${adjacentNum}`;
        if (tileCounts[adjacentKey]) {
          return false;
        }
      }
    }

    return true;
  }

  // 부분 순자 찾기 (양면, 간짱, 변짱)
  findPartialSequences(tiles) {
    const partials = [];
    const tileCounts = this.countTiles(tiles);

    for (const [tileKey, count] of Object.entries(tileCounts)) {
      const tile = this.keyToTile(tileKey);
      if (tile.type === "honor") continue;

      // 양면 대기 (12, 23, 34, ..., 89)
      if (tile.number <= 8) {
        const nextKey = `${tile.type}_${tile.number + 1}`;
        if (tileCounts[nextKey]) {
          partials.push({
            type: "ryanmen",
            tiles: [tile.number, tile.number + 1],
            waiting:
              tile.number === 1
                ? [tile.number + 2]
                : tile.number === 8
                ? [tile.number - 1]
                : [tile.number - 1, tile.number + 2],
          });
        }
      }

      // 간짱 대기 (13, 24, 35, ...)
      if (tile.number <= 7) {
        const gapKey = `${tile.type}_${tile.number + 2}`;
        if (tileCounts[gapKey]) {
          partials.push({
            type: "kanchan",
            tiles: [tile.number, tile.number + 2],
            waiting: [tile.number + 1],
          });
        }
      }
    }

    return partials;
  }

  // 대기패 종류 분석
  analyzeWaitingPattern(hand) {
    if (!this.isTenpai(hand)) return null;

    const waitingTiles = this.getWaitingTiles(hand);
    const patterns = [];

    for (const waitTile of waitingTiles) {
      const testHand = [...hand, waitTile];
      const winPattern = this.getWinPattern(testHand);

      if (winPattern) {
        patterns.push({
          waitingTile: waitTile,
          pattern: winPattern,
        });
      }
    }

    return {
      waitingTiles: waitingTiles,
      patterns: patterns,
      waitType: this.classifyWaitType(patterns),
    };
  }

  // 화료형 패턴 분석
  getWinPattern(tiles) {
    if (!this.isWinningHand(tiles)) return null;

    if (this.checkSpecialHands(tiles)) {
      if (this.checkKokushimusou(tiles)) return "kokushi";
      if (this.checkChitoitsu(tiles)) return "chitoitsu";
    }

    return "regular"; // 일반형 (4멘츠 1작두)
  }

  // 대기 타입 분류
  classifyWaitType(patterns) {
    if (patterns.length === 0) return "none";
    if (patterns.length === 1) return "tanki"; // 단기

    const waitTiles = patterns.map((p) => p.waitingTile);

    // 연속된 숫자인지 체크
    if (waitTiles.length === 2) {
      const [a, b] = waitTiles.sort((x, y) => x.number - y.number);
      if (a.type === b.type && b.number - a.number === 1) {
        return "ryanmen"; // 양면
      } else if (a.type === b.type && b.number - a.number === 2) {
        return "kanchan"; // 간짱
      }
    }

    return "multiple"; // 복합 대기
  }

  // 향후 확장을 위한 고급 분석 함수들

  // 샨텐 수 계산 (화료까지 필요한 패 교체 횟수)
  calculateShanten(hand) {
    if (this.isWinningHand(hand)) return -1; // 이미 화료
    if (this.isTenpai(hand)) return 0; // 텐파이

    // 간단한 샨텐 계산 (정확한 계산은 매우 복잡함)
    const analysis = this.analyzeHand(hand);

    let completeMelds = analysis.triplets.length + analysis.sequences.length;
    let pairs = analysis.pairs.length;
    let partials = analysis.partialSequences.length;

    // 대략적인 샨텐 수 계산
    let shanten = 8 - completeMelds * 2 - pairs - partials;

    return Math.max(1, shanten);
  }

  // 유효패 계산 (텐파이로 가는데 도움이 되는 패)
  getUsefulTiles(hand) {
    const useful = [];
    const allTiles = this.getAllPossibleTiles();

    for (const testTile of allTiles) {
      const testHand = [...hand, testTile];

      if (testHand.length > 14) {
        // 1장을 버리고 텐파이가 되는지 체크
        for (let i = 0; i < testHand.length; i++) {
          const reducedHand = [...testHand];
          reducedHand.splice(i, 1);

          if (this.isTenpai(reducedHand)) {
            useful.push(testTile);
            break;
          }
        }
      }
    }

    return useful;
  }

  // 디버그용 손패 출력
  handToString(tiles) {
    return tiles
      .map((tile) => {
        if (tile.type === "honor") {
          const honorNames = {
            east: "동",
            south: "남",
            west: "서",
            north: "북",
            white: "백",
            green: "발",
            red: "중",
          };
          return honorNames[tile.number] || tile.number;
        } else {
          const typeNames = { man: "만", pin: "통", sou: "삭" };
          return `${tile.number}${typeNames[tile.type]}`;
        }
      })
      .join(" ");
  }
}
