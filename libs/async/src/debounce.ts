/**
 * A debounce function ensures that a function is not called too frequently.
 * It only allows the function to be executed after a specified delay has passed since the last call.
 * @param func The function to debounce.
 * @param wait The delay before the function is called.
 */
export function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number,
    opts: {
        /**
         * Whether the function should be called immediately. Default is `false`.
         * If `true`, the function will be called immediately and then debounced.
         * If the function is called multiple times during the timeout, it will only be called once.
         */
        immediate?: boolean;
    } = { immediate: false }
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null;
    let initialCall = true;

    return function (...args: Parameters<T>) {
        if (opts.immediate && initialCall) {
            initialCall = false;
            func(...args);
            return;
        }

        if (timeout !== null) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
}
