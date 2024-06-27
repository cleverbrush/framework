/**
 * A throttle function ensures that a function is not called more frequently than a specified interval.
 * It allows the function to be called at most once every specified delay.
 * @param func The function to throttle.
 * @param limit The minimum delay between function calls.
 */
export function throttle<T extends (...args: any[]) => void>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let lastCall = 0;

    return function (...args: Parameters<T>) {
        const now = Date.now();

        if (now - lastCall >= limit) {
            lastCall = now;
            func(...args);
        }
    };
}
