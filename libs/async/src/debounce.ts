/**
 * A debounce function ensures that a function is not called too frequently.
 * It only allows the function to be executed after a specified delay has passed since the last call.
 * @param func The function to debounce.
 * @param wait The delay before the function is called.
 */
export function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null;

    return function (...args: Parameters<T>) {
        if (timeout !== null) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
}
