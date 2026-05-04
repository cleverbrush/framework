import {
    type QueryKey,
    useMutation,
    useQueryClient
} from '@tanstack/react-query';
import { useRef } from 'react';
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
    const pendingCount = useRef(0);

    return useMutation<TData, WebError, TArgs>({
        mutationFn,
        onMutate: async (args: TArgs) => {
            pendingCount.current++;
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
            pendingCount.current--;
            if (pendingCount.current === 0) {
                // Cancel any background GET that may have snuck in (e.g. from a
                // window-focus refetch) and potentially cached an intermediate
                // server state, then trigger the definitive invalidation.
                queryClient
                    .cancelQueries({ queryKey })
                    .then(() => queryClient.invalidateQueries({ queryKey }));
                onSettled?.(data, error, args);
            }
        }
    });
}
