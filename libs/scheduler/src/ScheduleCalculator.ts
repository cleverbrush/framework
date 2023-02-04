import { Schedule } from './types.js';

const MS_IN_DAY = 1000 * 60 * 60 * 24;
const MS_IN_WEEK = MS_IN_DAY * 7;

const getDayOfWeek = (date: Date) => {
    const res = date.getUTCDay();
    if (res === 0) return 7;
    return res;
};

const getNumberOfDaysInMonth = (date: Date) => {
    return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 0, 0, 0, 0)
    ).getDate();
};

export class ScheduleCalculator {
    #schedule: Schedule;
    #currentDate = new Date();
    #hour = 9;
    #minute = 0;
    #maxRepeat = -1;
    #repeatCount = 0;

    #hasNext = false;
    #next: Date | undefined;

    constructor(schedule: Schedule) {
        if (!schedule) throw new Error('schedule is required');
        this.#schedule = { ...schedule };

        if (typeof schedule.startsOn !== 'undefined') {
            this.#currentDate = schedule.startsOn;
        } else {
            this.#schedule.startsOn = new Date();
            this.#currentDate = this.#schedule.startsOn;
        }

        if (schedule.every !== 'minute') {
            if (typeof schedule.hour === 'number') {
                this.#hour = schedule.hour;
            }

            if (typeof schedule.minute === 'number') {
                this.#minute = schedule.minute;
            }

            if (
                schedule.every === 'day' &&
                new Date(
                    Date.UTC(
                        this.#currentDate.getUTCFullYear(),
                        this.#currentDate.getUTCMonth(),
                        this.#currentDate.getUTCDate(),
                        this.#hour,
                        this.#minute,
                        0,
                        0
                    )
                ).getTime() < this.#currentDate.getTime()
            ) {
                const date = new Date(
                    Date.UTC(
                        this.#currentDate.getUTCFullYear(),
                        this.#currentDate.getUTCMonth(),
                        this.#currentDate.getUTCDate() + 1,
                        this.#hour,
                        this.#minute,
                        0,
                        0
                    )
                );
                this.#currentDate = date;
            }
        }

        if (typeof schedule.maxOccurences === 'number') {
            this.#maxRepeat = schedule.maxOccurences;
        }

        const next = this.#getNext();

        if (typeof next !== 'undefined') {
            this.#next = next;
            this.#hasNext = true;
        }

        let leftToSkip =
            typeof this.#schedule.skipFirst === 'number'
                ? this.#schedule.skipFirst
                : 0;

        while (leftToSkip-- > 0 && this.#hasNext) {
            this.next();
        }
    }

    #getNext(): Date | undefined {
        let candidate: Date | null = null;
        let dayOfWeek: number;

        switch (this.#schedule.every) {
            case 'minute':
                candidate =
                    this.#repeatCount === 0
                        ? this.#schedule.startsOn
                        : new Date(
                              Date.UTC(
                                  this.#currentDate.getUTCFullYear(),
                                  this.#currentDate.getUTCMonth(),
                                  this.#currentDate.getUTCDate(),
                                  this.#currentDate.getUTCHours(),
                                  this.#currentDate.getUTCMinutes() +
                                      this.#schedule.interval,
                                  this.#currentDate.getUTCSeconds(),
                                  this.#currentDate.getUTCMilliseconds()
                              )
                          );
                break;
            case 'day':
                {
                    const date = new Date(
                        this.#currentDate.getTime() +
                            MS_IN_DAY *
                                (this.#repeatCount === 0
                                    ? 0
                                    : this.#schedule.interval - 1)
                    );

                    candidate = new Date(
                        Date.UTC(
                            date.getUTCFullYear(),
                            date.getUTCMonth(),
                            date.getUTCDate(),
                            this.#hour,
                            this.#minute,
                            0,
                            0
                        )
                    );
                }
                break;
            case 'week':
                {
                    let date = this.#currentDate;

                    do {
                        let found = false;
                        dayOfWeek = getDayOfWeek(date);
                        if (Number.isNaN(dayOfWeek)) return;
                        for (let i = 0; i < 7 - dayOfWeek + 1; i++) {
                            date = new Date(
                                date.getTime() + (i == 0 ? 0 : MS_IN_DAY)
                            );
                            if (
                                this.#schedule.endsOn &&
                                date > this.#schedule.endsOn
                            ) {
                                return;
                            }
                            if (
                                this.#schedule.dayOfWeek.includes(
                                    getDayOfWeek(date)
                                )
                            ) {
                                const dateWithTime = new Date(
                                    Date.UTC(
                                        date.getUTCFullYear(),
                                        date.getUTCMonth(),
                                        date.getUTCDate(),
                                        this.#hour,
                                        this.#minute,
                                        0,
                                        0
                                    )
                                );
                                if (dateWithTime > this.#schedule.startsOn) {
                                    candidate = dateWithTime;
                                    found = true;
                                    break;
                                }
                            }
                        }

                        if (found) break;

                        date = new Date(
                            date.getTime() +
                                MS_IN_DAY +
                                (this.#repeatCount == 0
                                    ? 0
                                    : (this.#schedule.interval - 1) *
                                      MS_IN_WEEK)
                        );
                    } while (
                        (this.#schedule.endsOn &&
                            date <= this.#schedule.endsOn) ||
                        !this.#schedule.endsOn
                    );
                }
                break;
            case 'month':
                {
                    let dateTime;
                    const cDate = this.#currentDate;
                    let iteration = 0;
                    do {
                        const date =
                            this.#schedule.day === 'last'
                                ? getNumberOfDaysInMonth(
                                      new Date(
                                          Date.UTC(
                                              cDate.getUTCFullYear(),
                                              cDate.getUTCMonth() +
                                                  iteration *
                                                      (this.#repeatCount === 0
                                                          ? 1
                                                          : this.#schedule
                                                                .interval),
                                              1,
                                              0,
                                              0,
                                              0,
                                              0
                                          )
                                      )
                                  )
                                : (this.#schedule.day as number);
                        dateTime = new Date(
                            Date.UTC(
                                cDate.getUTCFullYear(),
                                cDate.getUTCMonth() +
                                    iteration *
                                        (this.#repeatCount === 0
                                            ? 1
                                            : this.#schedule.interval),
                                date,
                                this.#hour,
                                this.#minute,
                                0,
                                0
                            )
                        );
                        iteration++;
                    } while (
                        dateTime < this.#schedule.startsOn ||
                        dateTime <= this.#currentDate
                    );
                    candidate = dateTime;
                }
                break;
            case 'year':
                {
                    let dateTime;
                    const cDate = this.#currentDate;
                    let iteration = 0;
                    do {
                        const date =
                            this.#schedule.day === 'last'
                                ? getNumberOfDaysInMonth(
                                      new Date(
                                          Date.UTC(
                                              cDate.getUTCFullYear() +
                                                  iteration *
                                                      (this.#repeatCount === 0
                                                          ? 1
                                                          : this.#schedule
                                                                .interval),
                                              this.#schedule.month - 1,
                                              1,
                                              0,
                                              0,
                                              0,
                                              0
                                          )
                                      )
                                  )
                                : (this.#schedule.day as number);
                        dateTime = new Date(
                            Date.UTC(
                                cDate.getUTCFullYear() +
                                    iteration *
                                        (this.#repeatCount === 0
                                            ? 1
                                            : this.#schedule.interval),
                                this.#schedule.month - 1,
                                date,
                                this.#hour,
                                this.#minute,
                                0,
                                0
                            )
                        );
                        iteration++;
                    } while (
                        dateTime < this.#schedule.startsOn ||
                        dateTime <= this.#currentDate
                    );
                    candidate = dateTime;
                }
                break;
            default:
                throw new Error('unknown schedule type');
        }

        if (!candidate) return;

        if (
            typeof this.#schedule.endsOn !== 'undefined' &&
            candidate > this.#schedule.endsOn
        ) {
            return;
        }

        return candidate;
    }

    public hasNext(span?: number): boolean {
        if (!this.#hasNext) {
            return false;
        }

        if (typeof span !== 'number') return this.#hasNext;

        if (!this.#next) return false;
        return this.#next.getTime() - new Date().getTime() <= span;
    }

    public next(): {
        date: Date;
        index: number;
    } {
        if (!this.#hasNext) throw new Error('schedule is over');

        const result = this.#next as Date;

        this.#currentDate = new Date(
            result.getTime() +
                (['day', 'week'].includes(this.#schedule.every) ? MS_IN_DAY : 0)
        );

        this.#repeatCount++;
        const next = this.#getNext();

        this.#next = next as Date;
        this.#hasNext = typeof next !== 'undefined';

        if (this.#maxRepeat > 0 && this.#repeatCount >= this.#maxRepeat) {
            this.#next = undefined;
            this.#hasNext = false;
        }

        return {
            date: result,
            index: this.#repeatCount
        };
    }
}
