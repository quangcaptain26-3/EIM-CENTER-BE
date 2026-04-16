export class ProgramEntity {
  id!: string;
  code!: 'KINDY' | 'STARTERS' | 'MOVERS' | 'FLYERS';
  name!: string;
  defaultFee!: number;
  totalSessions!: number;
  levelOrder!: number;
  isActive!: boolean;

  constructor(partial: Partial<ProgramEntity>) {
    Object.assign(this, partial);
  }

  getNextLevelCode(): string | null {
    const levels = ['KINDY', 'STARTERS', 'MOVERS', 'FLYERS'];
    const currentIndex = levels.indexOf(this.code);
    
    if (currentIndex === -1 || currentIndex === levels.length - 1) {
      return null;
    }
    return levels[currentIndex + 1];
  }
}
