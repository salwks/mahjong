// src/game/MahjongAI.js
export class MahjongAI {
  constructor(difficulty = "normal", game = null) {
    this.difficulty = difficulty; // 'easy', 'normal', 'hard', 'expert'
    this.game = game;

    // 난이도별 설정
    this.settings = this.getDifficultySettings(difficulty);

    // AI 상태
    this.thinkingTime = this.settings.baseThinkingTime;
    this.lastDecision = null;
    this.strategy = null;

    // 기억/추론 시스템
    this.memory = {
      discardedTiles: new Map(), // 플레이어별 버린 패 기록
      dangerousTiles: new Set(), // 위험한 패들
      safeTiles: new Set(), // 안전한 패들
      playerTendencies: new Map(), // 플레이어별 성향
      gamePhase: "early", // 'early', 'middle', 'late'
    };

    // 전략 가중치
    this.weights = {
      efficiency: this.settings.efficiency,
      safety: this.settings.safety,
      aggression: this.settings.aggression,
      defense: this.settings.defense,
      riichiTendency: this.settings.riichiTendency,
      meldTendency: this.settings.meldTendency,
    };
  }

  // 난이도별 설정
  getDifficultySettings(difficulty) {
    const settings = {
      easy: {
        baseThinkingTime: 800,
        efficiency: 0.3,
        safety: 0.2,
        aggression: 0.6,
        defense: 0.3,
        riichiTendency: 0.4,
        meldTendency: 0.7,
        errorRate: 0.3,
        lookahead: 1,
      },
      normal: {
        baseThinkingTime: 1200,
        efficiency: 0.6,
        safety: 0.5,
        aggression: 0.5,
        defense: 0.5,
        riichiTendency: 0.6,
        meldTendency: 0.5,
        errorRate: 0.15,
        lookahead: 2,
      },
      hard: {
        baseThinkingTime: 1800,
        efficiency: 0.8,
        safety: 0.7,
        aggression: 0.4,
        defense: 0.7,
        riichiTendency: 0.7,
        meldTendency: 0.3,
        errorRate: 0.05,
        lookahead: 3,
      },
      expert: {
        baseThinkingTime: 2500,
        efficiency: 0.95,
        safety: 0.9,
        aggression: 0.3,
        defense: 0.9,
        riichiTendency: 0.8,
        meldTendency: 0.2,
        errorRate: 0.01,
        lookahead: 4,
      },
    };

    return settings[difficulty] || settings.normal;
  }

  // 메인 의사결정 함수
  async makeDecision(player, gameState) {
    // 게임 상황 분석
    this.analyzeGameState(gameState);
    this.updateMemory(gameState);

    // 사고 시간 시뮬레이션
    await this.think();

    // 가능한 액션들 평가
    const actions = this.generatePossibleActions(player, gameState);
    const bestAction = this.evaluateActions(actions, player, gameState);
  }
}
