// src/game/YakuChecker.js
export class YakuChecker {
  constructor() {
    // 역만 리스트
    this.yakuman = [
      "kokushimusou",
      "suuankou",
      "daisangen",
      "shousuushii",
      "daisuushii",
      "tsuuiisou",
      "chinroutou",
      "ryuuiisou",
      "chuuren",
      "suukantsu",
    ];

    // 자패 정의
    this.honorTiles = {
      winds: ["east", "south", "west", "north"],
      dragons: ["white", "green", "red"],
    };

    // 말단패 (야오규패)
    this.terminalHonors = [
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
    ];
  }

  // 모든 역 체크 (메인 함수)
  checkAllYaku(hand, winTile, conditions) {
    const yakuList = [];
    const allTiles = [...hand, winTile];

    // 역만 체크 (우선)
    const yakumanList = this.checkYakuman(allTiles, winTile, conditions);
    if (yakumanList.length > 0) {
      return yakumanList; // 역만이 있으면 다른 역은 무시
    }

    // 일반 역들 체크
    yakuList.push(...this.checkBasicYaku(allTiles, winTile, conditions));
    yakuList.push(...this.checkSequenceYaku(allTiles, conditions));
    yakuList.push(...this.checkValueYaku(allTiles, conditions));
    yakuList.push(...this.checkSituationalYaku(conditions));
    yakuList.push(...this.checkDoraYaku(allTiles, conditions));

    return yakuList.filter((yaku) => yaku !== null);
  }

  // === 역만 체크 ===

  checkYakuman(tiles, winTile, conditions) {
    const yakuList = [];

    // 국사무쌍
    if (this.checkKokushimusou(tiles)) {
      yakuList.push({ name: "국사무쌍", han: 13, isYakuman: true });
    }

    // 사암각
    if (this.checkSuuankou(tiles, winTile, conditions.isTsumo)) {
      yakuList.push({ name: "사암각", han: 13, isYakuman: true });
    }

    // 대삼원
    if (this.checkDaisangen(tiles)) {
      yakuList.push({ name: "대삼원", han: 13, isYakuman: true });
    }

    // 소사희
    if (this.checkShousuushii(tiles)) {
      yakuList.push({ name: "소사희", han: 13, isYakuman: true });
    }

    // 대사희
    if (this.checkDaisuushii(tiles)) {
      yakuList.push({ name: "대사희", han: 26, isYakuman: true }); // 더블 역만
    }

    // 자일색
    if (this.checkTsuuiisou(tiles)) {
      yakuList.push({ name: "자일색", han: 13, isYakuman: true });
    }

    // 청노두
    if (this.checkChinroutou(tiles)) {
      yakuList.push({ name: "청노두", han: 13, isYakuman: true });
    }

    // 녹일색
    if (this.checkRyuuiisou(tiles)) {
      yakuList.push({ name: "녹일색", han: 13, isYakuman: true });
    }

    // 구련보등
    if (this.checkChuuren(tiles, winTile)) {
      yakuList.push({ name: "구련보등", han: 13, isYakuman: true });
    }

    // 사깡자
    if (this.checkSuukantsu(conditions)) {
      yakuList.push({ name: "사깡자", han: 13, isYakuman: true });
    }

    return yakuList;
  }

  checkKokushimusou(tiles) {
    const requiredTiles = this.terminalHonors;
    const tileKeys = tiles.map((tile) => `${tile.type}_${tile.number}`);
    const uniqueTiles = [...new Set(tileKeys)];

    if (uniqueTiles.length !== 13) return false;

    // 모든 필수 패가 있는지 체크
    for (const required of requiredTiles) {
      if (!uniqueTiles.includes(required)) return false;
    }

    // 한 종류만 2장, 나머지는 1장씩
    const counts = {};
    for (const key of tileKeys) {
      counts[key] = (counts[key] || 0) + 1;
    }

    const countValues = Object.values(counts);
    return (
      countValues.filter((c) => c === 2).length === 1 &&
      countValues.filter((c) => c === 1).length === 12
    );
  }

  checkSuuankou(tiles, winTile, isTsumo) {
    if (!isTsumo) return false; // 쯔모만 가능

    const melds = this.extractMelds(tiles);
    if (!melds || melds.triplets.length < 4) return false;

    // 4개의 암각자가 있어야 함
    return melds.triplets.length === 4;
  }

  checkDaisangen(tiles) {
    const dragons = this.honorTiles.dragons;
    let dragonTriplets = 0;

    for (const dragon of dragons) {
      if (this.countTiles(tiles, "honor", dragon) >= 3) {
        dragonTriplets++;
      }
    }

    return dragonTriplets === 3;
  }

  checkShousuushii(tiles) {
    const winds = this.honorTiles.winds;
    let windTriplets = 0;
    let windPairs = 0;

    for (const wind of winds) {
      const count = this.countTiles(tiles, "honor", wind);
      if (count >= 3) windTriplets++;
      else if (count === 2) windPairs++;
    }

    return windTriplets === 3 && windPairs === 1;
  }

  checkDaisuushii(tiles) {
    const winds = this.honorTiles.winds;
    let windTriplets = 0;

    for (const wind of winds) {
      if (this.countTiles(tiles, "honor", wind) >= 3) {
        windTriplets++;
      }
    }

    return windTriplets === 4;
  }

  checkTsuuiisou(tiles) {
    // 자일색 - 자패만으로 구성
    return tiles.every((tile) => tile.type === "honor");
  }

  checkChinroutou(tiles) {
    // 청노두 - 1, 9패만으로 구성
    return tiles.every(
      (tile) =>
        tile.type !== "honor" && (tile.number === 1 || tile.number === 9)
    );
  }

  checkRyuuiisou(tiles) {
    // 녹일색 - 삭수 2,3,4,6,8 + 발만으로 구성
    const allowedTiles = [
      "sou_2",
      "sou_3",
      "sou_4",
      "sou_6",
      "sou_8",
      "honor_green",
    ];

    return tiles.every((tile) => {
      const key = `${tile.type}_${tile.number}`;
      return allowedTiles.includes(key);
    });
  }

  checkChuuren(tiles, winTile) {
    // 구련보등 - 같은 수패로 1112345678999 + 임의 1장
    if (tiles.length !== 14) return false;

    const suits = ["man", "pin", "sou"];

    for (const suit of suits) {
      const suitTiles = tiles.filter((tile) => tile.type === suit);
      if (suitTiles.length === 14) {
        // 해당 수패만으로 구성되었는지 확인
        const pattern = [3, 1, 1, 1, 1, 1, 1, 1, 3]; // 1112345678999
        const counts = new Array(9).fill(0);

        for (const tile of suitTiles) {
          counts[tile.number - 1]++;
        }

        // 패턴 매칭 (1장 추가된 상태)
        let extraCount = 0;
        for (let i = 0; i < 9; i++) {
          if (counts[i] > pattern[i]) {
            extraCount += counts[i] - pattern[i];
          } else if (counts[i] < pattern[i]) {
            return false;
          }
        }

        return extraCount === 1;
      }
    }

    return false;
  }

  checkSuukantsu(conditions) {
    // 사깡자 - 4개의 깡이 있는지 체크
    return conditions.kantsu && conditions.kantsu.length === 4;
  }

  // === 기본 역 체크 ===

  checkBasicYaku(tiles, winTile, conditions) {
    const yakuList = [];

    // 리치
    if (conditions.isRiichi) {
      yakuList.push({ name: "리치", han: 1 });
    }

    // 일발 (리치 후 첫 바퀴에 화료)
    if (conditions.isRiichi && conditions.isIppatsu) {
      yakuList.push({ name: "일발", han: 1 });
    }

    // 쯔모
    if (conditions.isTsumo) {
      yakuList.push({ name: "쯔모", han: 1 });
    }

    // 탄야오 (2~8 수패만)
    if (this.checkTanyao(tiles)) {
      yakuList.push({ name: "탄야오", han: 1 });
    }

    // 핀후
    if (this.checkPinfu(tiles, winTile, conditions)) {
      yakuList.push({ name: "핀후", han: 1 });
    }

    // 평화
    if (this.checkHeiwa(tiles)) {
      yakuList.push({ name: "평화", han: 1 });
    }

    return yakuList;
  }

  checkTanyao(tiles) {
    return tiles.every(
      (tile) => tile.type !== "honor" && tile.number >= 2 && tile.number <= 8
    );
  }

  checkPinfu(tiles, winTile, conditions) {
    if (conditions.melds && conditions.melds.length > 0) return false; // 멘젠만

    const melds = this.extractMelds(tiles);
    if (!melds) return false;

    // 모든 멘츠가 순자여야 함
    if (melds.triplets.length > 0) return false;

    // 머리가 역패가 아니어야 함
    const pair = melds.pair;
    if (this.isValueTile(pair, conditions)) return false;

    // 양면 대기여야 함
    return this.isRyanmenWait(tiles, winTile);
  }

  checkHeiwa(tiles) {
    // 간단한 평화 체크 (핀후와 유사)
    const melds = this.extractMelds(tiles);
    return melds && melds.sequences.length === 4;
  }

  // === 순자 관련 역 ===

  checkSequenceYaku(tiles, conditions) {
    const yakuList = [];

    // 이페코 (같은 순자 2개)
    if (this.checkIipeikou(tiles)) {
      yakuList.push({ name: "이페코", han: 1 });
    }

    // 료페코 (같은 순자 2쌍)
    if (this.checkRyanpeikou(tiles)) {
      yakuList.push({ name: "료페코", han: 3 });
    }

    // 삼색동순
    if (this.checkSanshokudoujun(tiles)) {
      yakuList.push({ name: "삼색동순", han: conditions.isOpen ? 1 : 2 });
    }

    // 일기통관
    if (this.checkIkkitsuukan(tiles)) {
      yakuList.push({ name: "일기통관", han: conditions.isOpen ? 1 : 2 });
    }

    return yakuList;
  }

  checkIipeikou(tiles) {
    const sequences = this.findSequences(tiles);
    const sequenceKeys = sequences.map((seq) => seq.join(""));

    // 중복된 순자가 있는지 체크
    const uniqueSequences = [...new Set(sequenceKeys)];
    return uniqueSequences.length < sequences.length;
  }

  checkRyanpeikou(tiles) {
    const sequences = this.findSequences(tiles);
    if (sequences.length !== 4) return false;

    const sequenceKeys = sequences.map((seq) => seq.join(""));
    const counts = {};

    for (const key of sequenceKeys) {
      counts[key] = (counts[key] || 0) + 1;
    }

    // 2쌍의 중복 순자가 있어야 함
    const duplicatePairs = Object.values(counts).filter((count) => count === 2);
    return duplicatePairs.length === 2;
  }

  checkSanshokudoujun(tiles) {
    const sequences = this.findSequencesByType(tiles);

    // 같은 숫자 순자가 3개 수패에 모두 있는지 체크
    for (let start = 1; start <= 7; start++) {
      const pattern = [start, start + 1, start + 2];
      const hasMan = sequences.man.some((seq) =>
        this.arraysEqual(seq, pattern)
      );
      const hasPin = sequences.pin.some((seq) =>
        this.arraysEqual(seq, pattern)
      );
      const hasSou = sequences.sou.some((seq) =>
        this.arraysEqual(seq, pattern)
      );

      if (hasMan && hasPin && hasSou) return true;
    }

    return false;
  }

  checkIkkitsuukan(tiles) {
    const sequences = this.findSequencesByType(tiles);

    // 123, 456, 789가 같은 수패에 모두 있는지 체크
    const suits = ["man", "pin", "sou"];

    for (const suit of suits) {
      const suitSequences = sequences[suit];
      const has123 = suitSequences.some((seq) =>
        this.arraysEqual(seq, [1, 2, 3])
      );
      const has456 = suitSequences.some((seq) =>
        this.arraysEqual(seq, [4, 5, 6])
      );
      const has789 = suitSequences.some((seq) =>
        this.arraysEqual(seq, [7, 8, 9])
      );

      if (has123 && has456 && has789) return true;
    }

    return false;
  }

  // === 가치패 관련 역 ===

  checkValueYaku(tiles, conditions) {
    const yakuList = [];

    // 역패 (자풍, 장풍, 삼원패)
    const valueYaku = this.checkValueTiles(tiles, conditions);
    yakuList.push(...valueYaku);

    // 삼색동각
    if (this.checkSanshokudoukou(tiles)) {
      yakuList.push({ name: "삼색동각", han: 2 });
    }

    // 삼암각
    if (this.checkSanankou(tiles, conditions)) {
      yakuList.push({ name: "삼암각", han: 2 });
    }

    // 대삼원/소삼원
    const sangenYaku = this.checkSangenYaku(tiles);
    if (sangenYaku) yakuList.push(sangenYaku);

    // 대사희/소사희
    const suushiiYaku = this.checkSuushiiYaku(tiles);
    if (suushiiYaku) yakuList.push(suushiiYaku);

    // 혼노두
    if (this.checkHonroutou(tiles)) {
      yakuList.push({ name: "혼노두", han: 2 });
    }

    // 순전대
    if (this.checkJunchan(tiles)) {
      yakuList.push({ name: "순전대", han: conditions.isOpen ? 2 : 3 });
    }

    return yakuList;
  }

  checkValueTiles(tiles, conditions) {
    const yakuList = [];

    // 자풍패
    if (conditions.playerWind) {
      const playerWindCount = this.countTiles(
        tiles,
        "honor",
        conditions.playerWind
      );
      if (playerWindCount >= 3) {
        yakuList.push({ name: `자풍 ${conditions.playerWind}`, han: 1 });
      }
    }

    // 장풍패
    if (conditions.roundWind) {
      const roundWindCount = this.countTiles(
        tiles,
        "honor",
        conditions.roundWind
      );
      if (roundWindCount >= 3) {
        yakuList.push({ name: `장풍 ${conditions.roundWind}`, han: 1 });
      }
    }

    // 삼원패
    const dragons = ["white", "green", "red"];
    for (const dragon of dragons) {
      const dragonCount = this.countTiles(tiles, "honor", dragon);
      if (dragonCount >= 3) {
        yakuList.push({ name: `역패 ${dragon}`, han: 1 });
      }
    }

    return yakuList;
  }

  checkSanshokudoukou(tiles) {
    // 같은 숫자의 각자가 3개 수패에 모두 있는지
    for (let num = 1; num <= 9; num++) {
      const manCount = this.countTiles(tiles, "man", num);
      const pinCount = this.countTiles(tiles, "pin", num);
      const souCount = this.countTiles(tiles, "sou", num);

      if (manCount >= 3 && pinCount >= 3 && souCount >= 3) {
        return true;
      }
    }
    return false;
  }

  checkSanankou(tiles, conditions) {
    const melds = this.extractMelds(tiles);
    if (!melds) return false;

    // 암각자 3개 (멘젠에서만 카운트)
    return !conditions.isOpen && melds.triplets.length >= 3;
  }

  checkSangenYaku(tiles) {
    const dragons = ["white", "green", "red"];
    let dragonTriplets = 0;
    let dragonPairs = 0;

    for (const dragon of dragons) {
      const count = this.countTiles(tiles, "honor", dragon);
      if (count >= 3) dragonTriplets++;
      else if (count === 2) dragonPairs++;
    }

    if (dragonTriplets === 3) {
      return { name: "대삼원", han: 13, isYakuman: true };
    } else if (dragonTriplets === 2 && dragonPairs === 1) {
      return { name: "소삼원", han: 2 };
    }

    return null;
  }

  checkSuushiiYaku(tiles) {
    const winds = ["east", "south", "west", "north"];
    let windTriplets = 0;
    let windPairs = 0;

    for (const wind of winds) {
      const count = this.countTiles(tiles, "honor", wind);
      if (count >= 3) windTriplets++;
      else if (count === 2) windPairs++;
    }

    if (windTriplets === 4) {
      return { name: "대사희", han: 26, isYakuman: true };
    } else if (windTriplets === 3 && windPairs === 1) {
      return { name: "소사희", han: 13, isYakuman: true };
    }

    return null;
  }

  checkHonroutou(tiles) {
    // 혼노두 - 1, 9, 자패만으로 구성
    return tiles.every(
      (tile) => tile.type === "honor" || tile.number === 1 || tile.number === 9
    );
  }

  checkJunchan(tiles) {
    // 순전대 - 모든 멘츠와 머리에 1 또는 9가 포함
    const melds = this.extractMelds(tiles);
    if (!melds) return false;

    // 자패가 있으면 안됨
    if (tiles.some((tile) => tile.type === "honor")) return false;

    // 모든 멘츠에 1 또는 9가 포함되어야 함
    const allMelds = [...melds.sequences, ...melds.triplets, [melds.pair]];

    return allMelds.every((meld) =>
      meld.some((tile) => tile.number === 1 || tile.number === 9)
    );
  }

  // === 상황 역 ===

  checkSituationalYaku(conditions) {
    const yakuList = [];

    // 영상개화
    if (conditions.isRinshan) {
      yakuList.push({ name: "영상개화", han: 1 });
    }

    // 창깡
    if (conditions.isChankan) {
      yakuList.push({ name: "창깡", han: 1 });
    }

    // 해저로월
    if (conditions.isHaitei) {
      yakuList.push({ name: "해저로월", han: 1 });
    }

    // 하저로어
    if (conditions.isHoutei) {
      yakuList.push({ name: "하저로어", han: 1 });
    }

    // 더블리치
    if (conditions.isDoubleRiichi) {
      yakuList.push({ name: "더블리치", han: 2 });
    }

    // 천화 (동가 첫 패로 화료)
    if (conditions.isTenhou) {
      yakuList.push({ name: "천화", han: 13, isYakuman: true });
    }

    // 지화 (자가 첫 뽑기로 화료)
    if (conditions.isChiihou) {
      yakuList.push({ name: "지화", han: 13, isYakuman: true });
    }

    return yakuList;
  }

  // === 도라 ===

  checkDoraYaku(tiles, conditions) {
    const yakuList = [];
    let totalDora = 0;

    // 도라
    if (conditions.dora && conditions.dora.length > 0) {
      for (const doraIndicator of conditions.dora) {
        const doraTile = this.getDoraFromIndicator(doraIndicator);
        const doraCount = this.countMatchingTiles(tiles, doraTile);
        totalDora += doraCount;
      }
    }

    // 뒷도라 (리치시에만)
    if (
      conditions.isRiichi &&
      conditions.uraDora &&
      conditions.uraDora.length > 0
    ) {
      for (const uraDoraIndicator of conditions.uraDora) {
        const uraDoraTile = this.getDoraFromIndicator(uraDoraIndicator);
        const uraDoraCount = this.countMatchingTiles(tiles, uraDoraTile);
        totalDora += uraDoraCount;
      }
    }

    // 적도라 (빨간 5)
    if (conditions.enableRedDora) {
      const redDoraCount = this.countRedDora(tiles);
      totalDora += redDoraCount;
    }

    if (totalDora > 0) {
      yakuList.push({ name: "도라", han: totalDora });
    }

    return yakuList;
  }

  getDoraFromIndicator(indicator) {
    if (indicator.type === "honor") {
      const winds = ["east", "south", "west", "north"];
      const dragons = ["white", "green", "red"];

      if (winds.includes(indicator.number)) {
        const index = winds.indexOf(indicator.number);
        const nextIndex = (index + 1) % 4;
        return { type: "honor", number: winds[nextIndex] };
      } else if (dragons.includes(indicator.number)) {
        const index = dragons.indexOf(indicator.number);
        const nextIndex = (index + 1) % 3;
        return { type: "honor", number: dragons[nextIndex] };
      }
    } else {
      const nextNumber = indicator.number === 9 ? 1 : indicator.number + 1;
      return { type: indicator.type, number: nextNumber };
    }

    return indicator;
  }

  countRedDora(tiles) {
    let count = 0;
    for (const tile of tiles) {
      if (tile.isRed && tile.number === 5) {
        count++;
      }
    }
    return count;
  }

  // === 유틸리티 함수들 ===

  countTiles(tiles, type, number) {
    return tiles.filter((tile) => tile.type === type && tile.number === number)
      .length;
  }

  countMatchingTiles(tiles, targetTile) {
    return tiles.filter(
      (tile) =>
        tile.type === targetTile.type && tile.number === targetTile.number
    ).length;
  }

  extractMelds(tiles) {
    // 간단한 멘츠 추출 (실제로는 HandEvaluator에서 가져와야 함)
    const sequences = this.findSequences(tiles);
    const triplets = this.findTriplets(tiles);
    const pair = this.findPair(tiles);

    return {
      sequences: sequences,
      triplets: triplets,
      pair: pair,
    };
  }

  findSequences(tiles) {
    const sequences = [];
    const tileCounts = {};

    // 수패별로 카운트
    for (const tile of tiles) {
      if (tile.type !== "honor") {
        const key = `${tile.type}_${tile.number}`;
        tileCounts[key] = (tileCounts[key] || 0) + 1;
      }
    }

    // 순자 찾기
    const suits = ["man", "pin", "sou"];
    for (const suit of suits) {
      for (let start = 1; start <= 7; start++) {
        const keys = [
          `${suit}_${start}`,
          `${suit}_${start + 1}`,
          `${suit}_${start + 2}`,
        ];

        const minCount = Math.min(...keys.map((key) => tileCounts[key] || 0));
        for (let i = 0; i < minCount; i++) {
          sequences.push([start, start + 1, start + 2]);
          // 카운트에서 차감
          keys.forEach((key) => tileCounts[key]--);
        }
      }
    }

    return sequences;
  }

  findSequencesByType(tiles) {
    const result = { man: [], pin: [], sou: [] };
    const sequences = this.findSequences(tiles);

    // 수패별로 분류 (실제 구현에서는 더 정교하게 해야 함)
    return result;
  }

  findTriplets(tiles) {
    const triplets = [];
    const tileCounts = {};

    for (const tile of tiles) {
      const key = `${tile.type}_${tile.number}`;
      tileCounts[key] = (tileCounts[key] || 0) + 1;
    }

    for (const [key, count] of Object.entries(tileCounts)) {
      if (count >= 3) {
        const [type, number] = key.split("_");
        triplets.push({
          type,
          number: type === "honor" ? number : parseInt(number),
        });
      }
    }

    return triplets;
  }

  findPair(tiles) {
    const tileCounts = {};

    for (const tile of tiles) {
      const key = `${tile.type}_${tile.number}`;
      tileCounts[key] = (tileCounts[key] || 0) + 1;
    }

    for (const [key, count] of Object.entries(tileCounts)) {
      if (count === 2) {
        const [type, number] = key.split("_");
        return { type, number: type === "honor" ? number : parseInt(number) };
      }
    }

    return null;
  }

  isValueTile(tile, conditions) {
    if (!tile) return false;

    // 삼원패는 항상 역패
    if (
      tile.type === "honor" &&
      ["white", "green", "red"].includes(tile.number)
    ) {
      return true;
    }

    // 자풍패
    if (tile.type === "honor" && tile.number === conditions.playerWind) {
      return true;
    }

    // 장풍패
    if (tile.type === "honor" && tile.number === conditions.roundWind) {
      return true;
    }

    return false;
  }

  isRyanmenWait(tiles, winTile) {
    // 간단한 양면 대기 체크
    if (winTile.type === "honor") return false;

    const num = winTile.number;
    if (num === 1 || num === 9) return false; // 변짱

    // 실제로는 더 복잡한 로직이 필요
    return true;
  }

  arraysEqual(a, b) {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  // 총 한 수 계산
  calculateTotalHan(yakuList) {
    return yakuList.reduce((total, yaku) => total + yaku.han, 0);
  }

  // 역 이름을 한국어로 반환
  getYakuNameKorean(yakuName) {
    const nameMap = {
      riichi: "리치",
      ippatsu: "일발",
      tsumo: "쯔모",
      tanyao: "탄야오",
      pinfu: "핀후",
      iipeikou: "이페코",
      ryanpeikou: "료페코",
      sanshokudoujun: "삼색동순",
      ikkitsuukan: "일기통관",
      kokushimusou: "국사무쌍",
      suuankou: "사암각",
      daisangen: "대삼원",
      shousuushii: "소사희",
      daisuushii: "대사희",
      tsuuiisou: "자일색",
      chinroutou: "청노두",
      ryuuiisou: "녹일색",
      chuuren: "구련보등",
      suukantsu: "사깡자",
    };

    return nameMap[yakuName] || yakuName;
  }
}
