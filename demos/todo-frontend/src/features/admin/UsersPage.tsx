import { useEffect, useState } from 'react';
import {
  Heading,
  Table,
  Badge,
  Button,
  Flex,
  Text,
  Callout,
  Spinner,
} from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { client } from '../../api/client';
import { useAuth } from '../../lib/auth-context';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Pagination } from '../../components/Pagination';

type User = Awaited<ReturnType<typeof client.users.list>>[number];

const PAGE_SIZE = 20;

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.users.list({ query: { page, limit: PAGE_SIZE } });
      setUsers(res);
      setHasMore(res.length === PAGE_SIZE);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await client.users.delete({ params: { id: deleteTarget.id } });
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      setError(e.message ?? 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Flex direction="column" gap="4">
      <Heading size="6">Users</Heading>

      {error && (
        <Callout.Root color="red">
          <Callout.Icon><InfoCircledIcon /></Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      {loading ? (
        <Flex justify="center" p="6"><Spinner size="3" /></Flex>
      ) : (
        <>
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Auth</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {users.map((u) => (
                <Table.Row key={u.id}>
                  <Table.Cell>
                    <Text>{u.email}</Text>
                    {u.id === user?.id && (
                      <Badge color="blue" ml="2" size="1">You</Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={u.role === 'admin' ? 'amber' : 'gray'}>{u.role}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={u.authProvider === 'google' ? 'blue' : 'gray'} variant="soft">
                      {u.authProvider ?? 'local'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </Table.Cell>
                  <Table.Cell>
                    {u.id !== user?.id && (
                      <Button
                        size="1"
                        color="red"
                        variant="soft"
                        onClick={() => setDeleteTarget(u)}
                      >
                        Delete
                      </Button>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>

          <Pagination
            page={page}
            hasMore={hasMore}
            onPageChange={setPage}
            loading={loading}
          />
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete User"
        description={`Delete account for ${deleteTarget?.email}? This is permanent.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </Flex>
  );
}
