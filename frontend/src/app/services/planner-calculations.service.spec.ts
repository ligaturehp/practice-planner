import { createEmptyBlocks, createInitialState } from '../data/planner-defaults';
import { PlannerCalculationsService } from './planner-calculations.service';

describe('PlannerCalculationsService', () => {
  let service: PlannerCalculationsService;

  beforeEach(() => {
    service = new PlannerCalculationsService();
  });

  it('calculates AU as minutes times demand score', () => {
    expect(service.getBlockAu({ minutes: 28, demand: 9 })).toBe(252);
    expect(service.getBlockAu({ minutes: 18, demand: 8 })).toBe(144);
  });

  it('classifies demand keywords for empty planning cells', () => {
    expect(service.classifyCell('Recovery emphasis')).toBe('low');
    expect(service.classifyCell('Full contact')).toBe('high');
    expect(service.classifyCell('Game tempo')).toBe('max');
    expect(service.classifyCell('walk through')).toBe('neutral');
  });

  it('uses keyword fallback to rank days when no blocks exist', () => {
    const state = createInitialState();
    state.blocks = createEmptyBlocks();

    const levels = service.getDayLevels(state);

    expect(levels.fri).toBe('High');
    expect(service.getDayAu(state, 'fri')).toBe(0);
  });

  it('prioritizes coach-entered block AU over keyword-only day load', () => {
    const state = createInitialState();
    const levels = service.getDayLevels(state);

    expect(service.getDayAu(state, 'mon')).toBe(280);
    expect(levels.mon).toBe('High');
    expect(levels.tue).toBe('High');
    expect(levels.thu).toBe('High');
  });

  it('colors block-bearing grid cells from block AU totals', () => {
    const state = createInitialState();
    const levels = service.getBlockCellAuLevels(state);

    expect(levels['mon:S&C emphasis']).toBe('high');
    expect(levels['tue:Contact']).toBe('medium');
    expect(levels['thu:Speed exposure']).toBe('low');
  });

  it('summarizes stacked exposure flags across the week', () => {
    const state = createInitialState();
    state.blocks.wed = [
      {
        id: 'duplicate-speed',
        name: 'Speed primer',
        category: 'Speed',
        level: 'Low',
        minutes: 12,
        demand: 5,
        tags: [],
        exposures: ['Max sprint count'],
        notes: '',
      },
    ];

    expect(service.countExposures(state)['Max sprint count']).toBe(2);
    expect(service.getExposureWatch(state)).toBe('Max sprint count x2');
  });
});
