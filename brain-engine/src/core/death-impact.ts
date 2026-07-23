// DeathImpact — 死亡影响系统
// 基于巴甫洛夫条件反射 + 情境恐惧记忆
// 论文参考: 海马体编码情境, 杏仁核介导恐惧, 前额叶调控消退

interface DeathRecord {
  pos: { x: number; y: number; z: number };
  cause: string;
  tick: number;
  intensity: number;
}

const GENERALIZATION_RADIUS = 40;     // 泛化半径(格)
const BASE_INTENSITY = 0.6;           // 单次死亡基础强度
const EXTINCTION_RATE = 0.0003;       // 每安全tick消退率
const SENSITIZATION_BOOST = 0.2;      // 每次额外死亡增量

const CAUSE_MAP: Record<string, string> = {
  'suffocation': 'suffocation',
  'fall': 'fall',
  'drowning': 'drowning',
  'fire': 'fire',
  'lava': 'fire',
  'mob': 'mob',
  'starvation': 'starvation',
  'void': 'void',
};

export class DeathImpact {
  private deaths: DeathRecord[] = [];
  private safeTicks = 0;
  private causeFear: Record<string, number> = {};

  recordDeath(pos: { x: number; y: number; z: number }, cause: string): void {
    const mapped = CAUSE_MAP[cause] || 'unknown';
    const baseIntensity = BASE_INTENSITY + (this.getDeathCount() * SENSITIZATION_BOOST);
    this.deaths.push({ pos, cause: mapped, tick: this.safeTicks, intensity: baseIntensity });
    this.safeTicks = 0;  // 重置安全计时
    this.causeFear[mapped] = (this.causeFear[mapped] || 0) + BASE_INTENSITY;
  }

  getDeathCount(): number {
    return this.deaths.length;
  }

  /** 计算指定位置的恐惧值 (基于距离泛化) */
  getFearAt(pos: { x: number; y: number; z: number }): number {
    let totalFear = 0;
    for (const death of this.deaths) {
      const dx = death.pos.x - pos.x;
      const dy = death.pos.y - pos.y;
      const dz = death.pos.z - pos.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (dist < GENERALIZATION_RADIUS) {
        const decay = 1 - (dist / GENERALIZATION_RADIUS);
        const extinctFactor = 1 - Math.min(1, this.safeTicks * EXTINCTION_RATE);
        totalFear += death.intensity * decay * extinctFactor;
      }
    }
    return Math.min(1, totalFear);
  }

  /** 安全tick: 恐惧逐渐消退 */
  tick(count: number = 1): void {
    this.safeTicks += count;
    // 消退: 每次安全tick, 死因恐惧缓慢下降
    for (const cause of Object.keys(this.causeFear)) {
      this.causeFear[cause] = Math.max(0, this.causeFear[cause] - count * EXTINCTION_RATE);
    }
  }

  /** 获取特定死因的恐惧值 */
  getCauseFear(cause: string): number {
    const mapped = CAUSE_MAP[cause] || cause;
    return this.causeFear[mapped] || 0;
  }

  /** 获取所有死亡位置 */
  getDeathPositions(): { x: number; y: number; z: number }[] {
    return this.deaths.map(d => d.pos);
  }

  /** 重置所有死亡记录 */
  reset(): void {
    this.deaths = [];
    this.safeTicks = 0;
    this.causeFear = {};
  }
}
