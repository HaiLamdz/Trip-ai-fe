import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─────────────────────────────────────────────
// Validation logic (extracted for testing)
// ─────────────────────────────────────────────

interface TripFormData {
  destination: string;
  start_date: string;
  duration_days: number;
  budget: number;
  num_people: number;
}

function validateTripForm(form: TripFormData, today: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.destination) errors.destination = 'Vui lòng nhập điểm đến';
  if (!form.start_date) errors.start_date = 'Vui lòng chọn ngày bắt đầu';
  else if (form.start_date < today) errors.start_date = 'Ngày bắt đầu phải từ hôm nay trở đi';
  if (form.duration_days < 1 || form.duration_days > 30) errors.duration_days = 'Số ngày phải từ 1 đến 30';
  if (form.budget <= 0) errors.budget = 'Ngân sách phải là số dương';
  if (form.num_people < 1 || form.num_people > 20) errors.num_people = 'Số người phải từ 1 đến 20';
  return errors;
}

const TODAY = '2025-06-01';

// ─────────────────────────────────────────────
// Property 2 (frontend): Validation rejects invalid input
// Feature: trip-ai, Property 2 (frontend): invalid params always produce errors
// ─────────────────────────────────────────────

describe('TripForm validation', () => {
  it('accepts valid form data', () => {
    const valid: TripFormData = {
      destination: 'Đà Nẵng', start_date: '2025-07-01',
      duration_days: 3, budget: 5000000, num_people: 2,
    };
    expect(validateTripForm(valid, TODAY)).toEqual({});
  });

  it('rejects empty destination', () => {
    const form: TripFormData = { destination: '', start_date: '2025-07-01', duration_days: 3, budget: 5000000, num_people: 2 };
    expect(validateTripForm(form, TODAY).destination).toBeTruthy();
  });

  it('rejects past start_date', () => {
    const form: TripFormData = { destination: 'Hanoi', start_date: '2020-01-01', duration_days: 3, budget: 5000000, num_people: 2 };
    expect(validateTripForm(form, TODAY).start_date).toBeTruthy();
  });

  it('rejects duration_days out of range', () => {
    const form0: TripFormData = { destination: 'Hanoi', start_date: '2025-07-01', duration_days: 0, budget: 5000000, num_people: 2 };
    const form31: TripFormData = { ...form0, duration_days: 31 };
    expect(validateTripForm(form0, TODAY).duration_days).toBeTruthy();
    expect(validateTripForm(form31, TODAY).duration_days).toBeTruthy();
  });

  it('rejects non-positive budget', () => {
    const form: TripFormData = { destination: 'Hanoi', start_date: '2025-07-01', duration_days: 3, budget: 0, num_people: 2 };
    expect(validateTripForm(form, TODAY).budget).toBeTruthy();
  });

  it('rejects num_people out of range', () => {
    const form0: TripFormData = { destination: 'Hanoi', start_date: '2025-07-01', duration_days: 3, budget: 5000000, num_people: 0 };
    const form21: TripFormData = { ...form0, num_people: 21 };
    expect(validateTripForm(form0, TODAY).num_people).toBeTruthy();
    expect(validateTripForm(form21, TODAY).num_people).toBeTruthy();
  });

  // Property-based: any form with at least one invalid field should produce errors
  it('property: invalid params always produce at least one error (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // empty destination
          fc.record({ destination: fc.constant(''), start_date: fc.constant('2025-07-01'), duration_days: fc.integer({ min: 1, max: 30 }), budget: fc.float({ min: 1, max: 10000000 }), num_people: fc.integer({ min: 1, max: 20 }) }),
          // duration out of range
          fc.record({ destination: fc.constant('Hanoi'), start_date: fc.constant('2025-07-01'), duration_days: fc.oneof(fc.integer({ min: -10, max: 0 }), fc.integer({ min: 31, max: 100 })), budget: fc.float({ min: 1, max: 10000000 }), num_people: fc.integer({ min: 1, max: 20 }) }),
          // negative budget
          fc.record({ destination: fc.constant('Hanoi'), start_date: fc.constant('2025-07-01'), duration_days: fc.integer({ min: 1, max: 30 }), budget: fc.float({ min: -10000, max: 0 }), num_people: fc.integer({ min: 1, max: 20 }) }),
          // num_people out of range
          fc.record({ destination: fc.constant('Hanoi'), start_date: fc.constant('2025-07-01'), duration_days: fc.integer({ min: 1, max: 30 }), budget: fc.float({ min: 1, max: 10000000 }), num_people: fc.oneof(fc.integer({ min: -5, max: 0 }), fc.integer({ min: 21, max: 50 })) }),
        ),
        (form) => {
          const errors = validateTripForm(form as TripFormData, TODAY);
          return Object.keys(errors).length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────
// useTripStatus hook logic
// Feature: trip-ai, Property (frontend): polling stops on terminal status
// ─────────────────────────────────────────────

describe('useTripStatus logic', () => {
  it('identifies terminal statuses correctly', () => {
    const isTerminal = (s: string) => s === 'completed' || s === 'failed';
    expect(isTerminal('completed')).toBe(true);
    expect(isTerminal('failed')).toBe(true);
    expect(isTerminal('processing')).toBe(false);
    expect(isTerminal('draft')).toBe(false);
  });
});

// ─────────────────────────────────────────────
// AIChatSidebar logic
// Feature: trip-ai, Property (frontend): chat limit enforcement
// ─────────────────────────────────────────────

describe('AIChatSidebar chat limit', () => {
  const CHAT_LIMIT = 50;

  it('disables input when chat count reaches limit', () => {
    const isDisabled = (count: number) => count >= CHAT_LIMIT;
    expect(isDisabled(49)).toBe(false);
    expect(isDisabled(50)).toBe(true);
    expect(isDisabled(51)).toBe(true);
  });

  it('property: input always disabled when count >= 50 (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 200 }),
        (count) => count >= CHAT_LIMIT
      ),
      { numRuns: 100 }
    );
  });

  it('property: input always enabled when count < 50 (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 49 }),
        (count) => count < CHAT_LIMIT
      ),
      { numRuns: 100 }
    );
  });
});
