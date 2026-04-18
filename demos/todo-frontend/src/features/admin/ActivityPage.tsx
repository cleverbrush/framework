import { useEffect, useRef, useState } from 'react';
import {
  Heading,
  Flex,
  Text,
  Badge,
  Card,
  Button,
  ScrollArea,
  Callout,
} from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { streamActivity, type ActivityEntry } from '../../api/admin';

const actionColor = (action: string): 'green' | 'blue' | 'red' | 'amber' | 'gray' => {
  if (action.includes('created')) return 'green';
  if (action.includes('updated') || action.includes('completed')) return 'blue';
  if (action.includes('deleted')) return 'red';
  if (action.includes('login') || action.includes('register')) return 'amber';
  return 'gray';
};

export default function ActivityPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const startStream = () => {
    setEntries([]);
    setError(null);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    streamActivity(
      (entry) => {
        setEntries((prev) => [...prev, entry]);
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      },
      controller.signal,
    ).catch((e) => {
      if (e.name !== 'AbortError') {
        setError(e.message ?? 'Stream error');
      }
    }).finally(() => {
      setStreaming(false);
    });
  };

  const stopStream = () => {
    abortRef.current?.abort();
  };

  useEffect(() => {
    startStream();
    return () => abortRef.current?.abort();
  }, []);

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center">
        <Heading size="6">Activity Stream</Heading>
        <Flex gap="2">
          {streaming ? (
            <Button color="red" variant="soft" onClick={stopStream}>Stop</Button>
          ) : (
            <Button onClick={startStream}>Reconnect</Button>
          )}
        </Flex>
      </Flex>

      {streaming && (
        <Badge color="green" variant="soft" size="2">● Live</Badge>
      )}

      {error && (
        <Callout.Root color="red">
          <Callout.Icon><InfoCircledIcon /></Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      <Card>
        <ScrollArea style={{ height: '60vh' }}>
          <Flex direction="column" gap="1" p="2">
            {entries.length === 0 && !streaming && (
              <Text color="gray" size="2">No activity yet.</Text>
            )}
            {entries.map((entry, i) => (
              <Flex key={i} gap="3" align="start" py="1" style={{ borderBottom: '1px solid var(--gray-4)' }}>
                <Text size="1" color="gray" style={{ whiteSpace: 'nowrap', minWidth: 160 }}>
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </Text>
                <Badge color={actionColor(entry.action)} variant="soft" size="1">
                  {entry.action}
                </Badge>
                {entry.userId != null && <Text size="1" color="gray">user:{entry.userId}</Text>}
                {entry.detail && <Text size="1" color="gray">{entry.detail}</Text>}
              </Flex>
            ))}
            <div ref={bottomRef} />
          </Flex>
        </ScrollArea>
      </Card>
    </Flex>
  );
}
