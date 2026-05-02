import {
    type QueryKey,
    useMutation,
    useQueryClient
} from '@tanstack/react-query';
import type { WebError } from '../errors.js';

export interface OptimisticMutationConfig<TData, TArgs> {
    queryKey: QueryKey;
    optimisticUpdate: (oldData: TData | undefined, args: TArgs) => TData;
    onSuccess?: (data: TData, args: TArgs) => void;
    onError?: (error: WebError, args: TArgs) => void;
    onSettled?: (
        data: TData | undefined,
        error: WebError | null,
        args: TArgs
    ) => void;
}

export function useOptimisticMutation<TData, TArgs>(
    mutationFn: (args: TArgs) => Promise<TData>,
    config: OptimisticMutationConfig<TData, TArgs>
) {
    const queryClient = useQueryClient();
    const { queryKey, optimisticUpdate, onSuccess, onError, onSettled } =
        config;

    return useMutation<TData, WebError, TArgs>({
        mutationFn,
        onMutate: async (args: TArgs) => {
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<TData>(queryKey);
            queryClient.setQueryData<TData>(queryKey, (old: unknown) =>
                optimisticUpdate(old as TData | undefined, args)
            );
            return { previous };
        },
        onError: (error: WebError, args: TArgs, context: unknown) => {
            const ctx = context as { previous?: TData } | undefined;
            if (ctx?.previous !== undefined) {
                queryClient.setQueryData<TData>(queryKey, ctx.previous);
            }
            onError?.(error, args);
        },
        onSuccess: (data: TData, args: TArgs) => {
            onSuccess?.(data, args);
        },
        onSettled: (
            data: TData | undefined,
            error: WebError | null,
            args: TArgs
        ) => {
            queryClient.invalidateQueries({ queryKey });
            onSettled?.(data, error, args);
        }
    });
}
