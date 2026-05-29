import { cellIntentOptions, createEmptyBlocks, createInitialState, demandForCellIntent } from '../data/planner-defaults';
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

  it('uses explicit cell demand scores before blocks are assigned', () => {
    const state = createInitialState();
    state.blocks = createEmptyBlocks();
    Object.values(state.cellDemands).forEach((demands) => demands.fill(0));
    state.cellDemands.mon[0] = 4;
    state.cellDemands.tue[0] = 1;

    expect(service.classifyCellDemand(4)).toBe('max');
    expect(service.classifyCellDemand(1)).toBe('low');
    expect(service.getDayKeywordScore(state, 'mon')).toBeGreaterThan(service.getDayKeywordScore(state, 'tue'));
  });

  it('provides swim-lane-specific intent variables', () => {
    expect(cellIntentOptions('Pace')).toEqual(['Rest', 'Slow', 'Moderate', 'Fast', 'Max', 'Game']);
    expect(cellIntentOptions('Work / rest')).toEqual(['-', 'Full rest', 'Long rest', 'Longer rest', 'Moderate rest', 'Short rest', 'Short + sharp']);
    expect(cellIntentOptions('Contact')).toContain('Full contact');
    expect(cellIntentOptions('S&C emphasis')).toContain('Power / speed');
    expect(demandForCellIntent('Slow')).toBe(1);
    expect(demandForCellIntent('Max')).toBe(4);
  });

  it('treats high recovery emphasis as lower athlete load', () => {
    expect(demandForCellIntent('High', 'Recovery emphasis')).toBe(1);
    expect(demandForCellIntent('Low', 'Recovery emphasis')).toBe(3);
  });

  it('starts a new plan without assigned training blocks', () => {
    const state = createInitialState();

    expect(Object.values(state.blocks).flat()).toEqual([]);
    expect(state.blockLabelPresets.length).toBeGreaterThan(0);
  });

  it('prioritizes coach-entered block AU over keyword-only day load', () => {
    const state = createInitialState();
    state.blocks.mon = [
      {
        id: 'strength',
        name: 'Lower-body strength emphasis',
        category: 'Strength',
        level: 'Medium',
        minutes: 40,
        demand: 7,
        tags: [],
        exposures: [],
        notes: '',
      },
    ];
    state.blocks.tue = [
      {
        id: 'contact',
        name: 'Full-contact competitive period',
        category: 'Contact',
        level: 'High',
        minutes: 28,
        demand: 9,
        tags: [],
        exposures: [],
        notes: '',
      },
    ];
    state.blocks.thu = [
      {
        id: 'speed',
        name: 'Short max speed exposure',
        category: 'Speed',
        level: 'Medium',
        minutes: 18,
        demand: 8,
        tags: [],
        exposures: [],
        notes: '',
      },
    ];
    const levels = service.getDayLevels(state);

    expect(service.getDayAu(state, 'mon')).toBe(280);
    expect(levels.mon).toBe('High');
    expect(levels.tue).toBe('High');
    expect(levels.thu).toBe('High');
  });

  it('colors block-bearing grid cells from block AU totals', () => {
    const state = createInitialState();
    state.blocks.mon = [
      {
        id: 'strength',
        name: 'Lower-body strength emphasis',
        category: 'Strength',
        level: 'Medium',
        minutes: 40,
        demand: 7,
        tags: [],
        exposures: [],
        notes: '',
      },
    ];
    state.blocks.tue = [
      {
        id: 'contact',
        name: 'Full-contact competitive period',
        category: 'Contact',
        level: 'High',
        minutes: 28,
        demand: 9,
        tags: [],
        exposures: [],
        notes: '',
      },
    ];
    state.blocks.thu = [
      {
        id: 'speed',
        name: 'Short max speed exposure',
        category: 'Speed',
        level: 'Medium',
        minutes: 18,
        demand: 8,
        tags: [],
        exposures: [],
        notes: '',
      },
    ];
    const levels = service.getBlockCellAuLevels(state);

    expect(levels['mon:S&C emphasis']).toBe('high');
    expect(levels['tue:Contact']).toBe('medium');
    expect(levels['thu:Speed exposure']).toBe('low');
  });

  it('summarizes stacked exposure flags across the week', () => {
    const state = createInitialState();
    state.blocks.mon = [
      {
        id: 'speed-primer',
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
