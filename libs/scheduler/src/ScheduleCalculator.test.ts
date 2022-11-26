import { ScheduleCalculator } from './ScheduleCalculator.js';

test('day - 1', () => {
    const calculator = new ScheduleCalculator({
        every: 'day',
        interval: 2,
        startsOn: new Date(Date.UTC(2022, 9, 12, 21, 0, 0, 0)),
        endsOn: new Date(Date.UTC(2022, 11, 12, 0, 0, 0, 0)),
        maxOccurences: 10
    });

    const results = [
        new Date(Date.UTC(2022, 9, 13, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 15, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 17, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 19, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 21, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 23, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 25, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 27, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 29, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 31, 9, 0, 0, 0))
    ];

    for (let i = 0; i < results.length; i++) {
        expect(calculator.hasNext()).toEqual(true);
        expect(calculator.next().date.getTime()).toEqual(results[i].getTime());
    }

    expect(calculator.hasNext()).toEqual(false);
});

test('day - 2', () => {
    const calculator = new ScheduleCalculator({
        every: 'day',
        interval: 1,
        startsOn: new Date(Date.UTC(2022, 9, 12, 8, 0, 0, 0))
    });

    const results = [
        new Date(Date.UTC(2022, 9, 12, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 13, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 14, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 15, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 16, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 17, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 18, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 19, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 20, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 21, 9, 0, 0, 0))
    ];

    for (let i = 0; i < results.length; i++) {
        expect(calculator.hasNext()).toEqual(true);
        expect(calculator.next().date.getTime()).toEqual(results[i].getTime());
    }

    expect(calculator.hasNext()).toEqual(true);
});

test('day - 3', () => {
    const calculator = new ScheduleCalculator({
        every: 'day',
        interval: 1,
        startsOn: new Date(Date.UTC(2022, 9, 12, 8, 0, 0, 0)),
        endsOn: new Date(Date.UTC(2022, 9, 14, 12, 0, 0, 0))
    });

    const results = [
        new Date(Date.UTC(2022, 9, 12, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 13, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 14, 9, 0, 0, 0))
    ];

    for (let i = 0; i < results.length; i++) {
        expect(calculator.hasNext()).toEqual(true);
        expect(calculator.next().date.getTime()).toEqual(results[i].getTime());
    }

    expect(calculator.hasNext()).toEqual(false);
});

test('day - 4', () => {
    const calculator = new ScheduleCalculator({
        every: 'day',
        interval: 2,
        startsOn: new Date(Date.UTC(2022, 9, 12, 21, 0, 0, 0)),
        endsOn: new Date(Date.UTC(2022, 11, 12, 0, 0, 0, 0)),
        skipFirst: 2,
        maxOccurences: 10
    });

    const results = [
        new Date(Date.UTC(2022, 9, 17, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 19, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 21, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 23, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 25, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 27, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 29, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 31, 9, 0, 0, 0))
    ];

    for (let i = 0; i < results.length; i++) {
        const hasNext = calculator.hasNext();
        expect(hasNext).toEqual(true);
        const next = calculator.next();
        expect(next.date.getTime()).toEqual(results[i].getTime());
    }

    expect(calculator.hasNext()).toEqual(false);
});

test('day - 5', () => {
    const calculator = new ScheduleCalculator({
        startsOn: new Date('2022-10-29T00:14:37.396Z'),
        hour: 9,
        minute: 0,
        every: 'day',
        interval: 3,
        maxOccurences: 1
    });

    const results = [new Date(Date.UTC(2022, 9, 29, 9, 0, 0, 0))];

    for (let i = 0; i < results.length; i++) {
        expect(calculator.hasNext()).toEqual(true);
        expect(calculator.next().date.getTime()).toEqual(results[i].getTime());
    }

    expect(calculator.hasNext()).toEqual(false);
});

test('week - 1', () => {
    const calculator = new ScheduleCalculator({
        every: 'week',
        interval: 1,
        dayOfWeek: [1, 2],
        startsOn: new Date(Date.UTC(2022, 8, 7, 8, 0, 0, 0)),
        endsOn: new Date(Date.UTC(2022, 11, 12, 0, 0, 0, 0)),
        maxOccurences: 10
    });

    const results = [
        new Date(Date.UTC(2022, 8, 12, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 8, 13, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 8, 19, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 8, 20, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 8, 26, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 8, 27, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 3, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 4, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 10, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 9, 11, 9, 0, 0, 0))
    ];

    for (let i = 0; i < results.length; i++) {
        expect(calculator.hasNext()).toEqual(true);
        expect(calculator.next().date.getTime()).toEqual(results[i].getTime());
    }

    expect(calculator.hasNext()).toEqual(false);
});

test('week - 2', () => {
    const calculator = new ScheduleCalculator({
        every: 'week',
        interval: 2,
        dayOfWeek: [1, 2],
        startsOn: new Date(Date.UTC(2022, 8, 7, 8, 0, 0, 0)),
        maxOccurences: 3
    });

    const results = [
        new Date(Date.UTC(2022, 8, 12, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 8, 13, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 8, 26, 9, 0, 0, 0))
    ];

    for (let i = 0; i < results.length; i++) {
        expect(calculator.hasNext()).toEqual(true);
        expect(calculator.next().date.getTime()).toEqual(results[i].getTime());
    }

    expect(calculator.hasNext()).toEqual(false);
});

test('week - 3', () => {
    const calculator = new ScheduleCalculator({
        every: 'week',
        interval: 1,
        dayOfWeek: [2],
        startsOn: new Date(Date.UTC(2022, 8, 13, 11, 0, 0, 0)),
        endsOn: new Date(Date.UTC(2022, 8, 27, 0, 0, 0, 0))
    });

    const results = [new Date(Date.UTC(2022, 8, 20, 9, 0, 0, 0))];

    for (let i = 0; i < results.length; i++) {
        expect(calculator.hasNext()).toEqual(true);
        expect(calculator.next().date.getTime()).toEqual(results[i].getTime());
    }

    expect(calculator.hasNext()).toEqual(false);
});

test('month - 1', () => {
    const calculator = new ScheduleCalculator({
        every: 'month',
        day: 1,
        interval: 1,
        startsOn: new Date(Date.UTC(2022, 9, 12, 21, 0, 0, 0)),
        endsOn: new Date(Date.UTC(2023, 11, 12, 0, 0, 0, 0)),
        maxOccurences: 10
    });

    const results = [
        new Date(Date.UTC(2022, 10, 1, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 11, 1, 9, 0, 0, 0)),
        new Date(Date.UTC(2023, 0, 1, 9, 0, 0, 0)),
        new Date(Date.UTC(2023, 1, 1, 9, 0, 0, 0)),
        new Date(Date.UTC(2023, 2, 1, 9, 0, 0, 0)),
        new Date(Date.UTC(2023, 3, 1, 9, 0, 0, 0)),
        new Date(Date.UTC(2023, 4, 1, 9, 0, 0, 0)),
        new Date(Date.UTC(2023, 5, 1, 9, 0, 0, 0)),
        new Date(Date.UTC(2023, 6, 1, 9, 0, 0, 0)),
        new Date(Date.UTC(2023, 7, 1, 9, 0, 0, 0))
    ];

    for (let i = 0; i < results.length; i++) {
        expect(calculator.hasNext()).toEqual(true);
        const next = calculator.next().date;
        expect(next.getTime()).toEqual(results[i].getTime());
    }

    expect(calculator.hasNext()).toEqual(false);
});

test('month - 2', () => {
    const calculator = new ScheduleCalculator({
        every: 'month',
        day: 2,
        interval: 2,
        startsOn: new Date(Date.UTC(2022, 9, 12, 21, 0, 0, 0)),
        endsOn: new Date(Date.UTC(2023, 6, 1, 0, 0, 0, 0))
    });

    const results = [
        new Date(Date.UTC(2022, 10, 2, 9, 0, 0, 0)),
        new Date(Date.UTC(2023, 0, 2, 9, 0, 0, 0)),
        new Date(Date.UTC(2023, 2, 2, 9, 0, 0, 0)),
        new Date(Date.UTC(2023, 4, 2, 9, 0, 0, 0))
    ];

    for (let i = 0; i < results.length; i++) {
        expect(calculator.hasNext()).toEqual(true);
        const next = calculator.next().date;
        expect(next.getTime()).toEqual(results[i].getTime());
    }

    expect(calculator.hasNext()).toEqual(false);
});

test('month - 3', () => {
    const calculator = new ScheduleCalculator({
        every: 'month',
        day: 'last',
        interval: 1,
        startsOn: new Date(Date.UTC(2022, 9, 12, 21, 0, 0, 0)),
        maxOccurences: 4
    });

    const results = [
        new Date(Date.UTC(2022, 9, 31, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 10, 30, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 11, 31, 9, 0, 0, 0)),
        new Date(Date.UTC(2023, 0, 31, 9, 0, 0, 0))
    ];

    for (let i = 0; i < results.length; i++) {
        expect(calculator.hasNext()).toEqual(true);
        const next = calculator.next().date;
        expect(next.getTime()).toEqual(results[i].getTime());
    }

    expect(calculator.hasNext()).toEqual(false);
});

test('month - 4', () => {
    const calculator = new ScheduleCalculator({
        every: 'month',
        day: 'last',
        interval: 3,
        startsOn: new Date(Date.UTC(2022, 9, 31, 0, 0, 0, 0)),
        maxOccurences: 3
    });

    const results = [
        new Date(Date.UTC(2022, 9, 31, 9, 0, 0, 0)),
        new Date(Date.UTC(2023, 0, 31, 9, 0, 0, 0)),
        new Date(Date.UTC(2023, 3, 30, 9, 0, 0, 0))
    ];

    for (let i = 0; i < results.length; i++) {
        expect(calculator.hasNext()).toEqual(true);
        const next = calculator.next().date;
        expect(next.getTime()).toEqual(results[i].getTime());
    }

    expect(calculator.hasNext()).toEqual(false);
});

test('month - 5', () => {
    const calculator = new ScheduleCalculator({
        every: 'month',
        day: 'last',
        interval: 1,
        startsOn: new Date(Date.UTC(2022, 9, 31, 0, 0, 0, 0)),
        endsOn: new Date(Date.UTC(2023, 4, 1, 0, 0, 0, 0))
    });

    const results = [
        new Date(Date.UTC(2022, 9, 31, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 10, 30, 9, 0, 0, 0)),
        new Date(Date.UTC(2022, 11, 31, 9, 0, 0, 0)),
        new Date(Date.UTC(2023, 0, 31, 9, 0, 0, 0)),
        new Date(Date.UTC(2023, 1, 28, 9, 0, 0, 0)),
        new Date(Date.UTC(2023, 2, 31, 9, 0, 0, 0)),
        new Date(Date.UTC(2023, 3, 30, 9, 0, 0, 0))
    ];

    for (let i = 0; i < results.length; i++) {
        expect(calculator.hasNext()).toEqual(true);
        const next = calculator.next().date;
        expect(next.getTime()).toEqual(results[i].getTime());
    }

    expect(calculator.hasNext()).toEqual(false);
});

test('year - 1', () => {
    const calculator = new ScheduleCalculator({
        every: 'year',
        day: 4,
        month: 3,
        interval: 1,
        startsOn: new Date(Date.UTC(2022, 0, 1, 0, 0, 0, 0)),
        endsOn: new Date(Date.UTC(2025, 4, 1, 0, 0, 0, 0))
    });

    const results = [
        new Date(Date.UTC(2022, 2, 4, 9, 0, 0, 0)),
        new Date(Date.UTC(2023, 2, 4, 9, 0, 0, 0)),
        new Date(Date.UTC(2024, 2, 4, 9, 0, 0, 0)),
        new Date(Date.UTC(2025, 2, 4, 9, 0, 0, 0))
    ];

    for (let i = 0; i < results.length; i++) {
        expect(calculator.hasNext()).toEqual(true);
        const next = calculator.next().date;
        expect(next.getTime()).toEqual(results[i].getTime());
    }

    expect(calculator.hasNext()).toEqual(false);
});

test('year - 2', () => {
    const calculator = new ScheduleCalculator({
        every: 'year',
        day: 4,
        month: 3,
        interval: 2,
        startsOn: new Date(Date.UTC(2022, 0, 1, 0, 0, 0, 0)),
        endsOn: new Date(Date.UTC(2025, 4, 1, 0, 0, 0, 0))
    });

    const results = [
        new Date(Date.UTC(2022, 2, 4, 9, 0, 0, 0)),
        new Date(Date.UTC(2024, 2, 4, 9, 0, 0, 0))
    ];

    for (let i = 0; i < results.length; i++) {
        expect(calculator.hasNext()).toEqual(true);
        const next = calculator.next().date;
        expect(next.getTime()).toEqual(results[i].getTime());
    }

    expect(calculator.hasNext()).toEqual(false);
});

test('minute - 1', () => {
    const calculator = new ScheduleCalculator({
        every: 'minute',
        interval: 1,
        startsOn: new Date(Date.UTC(2022, 0, 1, 0, 0, 0, 0)),
        maxOccurences: 20
    });

    const results = [
        new Date(Date.UTC(2022, 0, 1, 0, 0, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 1, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 2, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 3, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 4, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 5, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 6, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 7, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 8, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 9, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 10, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 11, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 12, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 13, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 14, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 15, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 16, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 17, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 18, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 19, 0, 0))
    ];

    for (let i = 0; i < results.length; i++) {
        expect(calculator.hasNext()).toEqual(true);
        const next = calculator.next().date;
        expect(next.getTime()).toEqual(results[i].getTime());
    }

    expect(calculator.hasNext()).toEqual(false);
});

test('minute - 2', () => {
    const calculator = new ScheduleCalculator({
        every: 'minute',
        interval: 20,
        startsOn: new Date(Date.UTC(2022, 0, 1, 0, 0, 0, 0)),
        maxOccurences: 5
    });

    const results = [
        new Date(Date.UTC(2022, 0, 1, 0, 0, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 20, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 40, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 1, 0, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 1, 20, 0, 0))
    ];

    for (let i = 0; i < results.length; i++) {
        expect(calculator.hasNext()).toEqual(true);
        const next = calculator.next().date;
        expect(next.getTime()).toEqual(results[i].getTime());
    }

    expect(calculator.hasNext()).toEqual(false);
});

test('minute - 3', () => {
    const calculator = new ScheduleCalculator({
        every: 'minute',
        interval: 20,
        startsOn: new Date(Date.UTC(2022, 0, 1, 0, 0, 0, 0)),
        endsOn: new Date(Date.UTC(2022, 0, 1, 3, 0, 0, 0))
    });

    const results = [
        new Date(Date.UTC(2022, 0, 1, 0, 0, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 20, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 0, 40, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 1, 0, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 1, 20, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 1, 40, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 2, 0, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 2, 20, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 2, 40, 0, 0)),
        new Date(Date.UTC(2022, 0, 1, 3, 0, 0, 0))
    ];

    for (let i = 0; i < results.length; i++) {
        expect(calculator.hasNext()).toEqual(true);
        const next = calculator.next().date;
        expect(next.getTime()).toEqual(results[i].getTime());
    }

    expect(calculator.hasNext()).toEqual(false);
});
