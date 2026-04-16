import { useEffect, useState } from 'react';
import {
  Heading,
  Flex,
  Card,
  Text,
  Badge,
  Callout,
  Spinner,
  Button,
} from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Link } from 'react-router';
import { client } from '../../api/client';
import type { UserResponse } from '@cleverbrush/todo-backend/contract';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client.users.me()
      .then(setProfile)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Flex justify="center" p="6"><Spinner size="3" /></Flex>;
  }

  return (
    <Flex direction="column" gap="4" style={{ maxWidth: 480 }}>
      <Heading size="6">My Profile</Heading>

      {error && (
        <Callout.Root color="red">
          <Callout.Icon><InfoCircledIcon /></Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      {profile && (
        <Card>
          <Flex direction="column" gap="3" p="2">
            <Flex justify="between" align="center">
              <Text size="2" color="gray">Email</Text>
              <Text weight="medium">{profile.email}</Text>
            </Flex>
            <Flex justify="between" align="center">
              <Text size="2" color="gray">Role</Text>
              <Badge color={profile.role === 'admin' ? 'amber' : 'blue'}>{profile.role}</Badge>
            </Flex>
            <Flex justify="between" align="center">
              <Text size="2" color="gray">Auth Provider</Text>
              <Badge color={profile.authProvider === 'google' ? 'blue' : 'gray'} variant="soft">
                {profile.authProvider ?? 'local'}
              </Badge>
            </Flex>
            {profile.createdAt && (
              <Flex justify="between" align="center">
                <Text size="2" color="gray">Member Since</Text>
                <Text>{new Date(profile.createdAt).toLocaleDateString()}</Text>
              </Flex>
            )}
            <Flex justify="between" align="center">
              <Text size="2" color="gray">User ID</Text>
              <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>{profile.id}</Text>
            </Flex>
          </Flex>
        </Card>
      )}

      <Button asChild variant="soft">
        <Link to="/todos">View My Todos</Link>
      </Button>
    </Flex>
  );
}
