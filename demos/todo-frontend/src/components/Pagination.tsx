import { Button, Flex, Text } from '@radix-ui/themes';

type PaginationProps = {
    page: number;
    hasMore: boolean;
    onPageChange: (page: number) => void;
    loading?: boolean;
};

export function Pagination({ page, hasMore, onPageChange, loading }: PaginationProps) {
    return (
        <Flex align="center" gap="3" justify="center" mt="4">
            <Button
                variant="soft"
                disabled={page <= 1 || loading}
                onClick={() => onPageChange(page - 1)}
            >
                ← Previous
            </Button>
            <Text size="2" color="gray">
                Page {page}
            </Text>
            <Button
                variant="soft"
                disabled={!hasMore || loading}
                onClick={() => onPageChange(page + 1)}
            >
                Next →
            </Button>
        </Flex>
    );
}
