import { useState } from 'react';
import {
  Heading,
  Flex,
  TextField,
  Button,
  Callout,
  Card,
  Text,
  Badge,
  Separator,
  CheckboxGroup,
} from '@radix-ui/themes';
import { InfoCircledIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import { subscribe } from '../../api/webhooks';

const EVENT_TYPES = ['todo.created', 'todo.updated', 'todo.completed', 'todo.deleted'];

export default function WebhooksPage() {
  const [callbackUrl, setCallbackUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['todo.created', 'todo.completed']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callbackUrl.trim()) {
      setError('Callback URL is required');
      return;
    }
    if (selectedEvents.length === 0) {
      setError('Select at least one event type');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await subscribe({ callbackUrl, events: selectedEvents });
      setResult(res);
      setCallbackUrl('');
    } catch (e: any) {
      setError(e.message ?? 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex direction="column" gap="4" style={{ maxWidth: 540 }}>
      <Heading size="6">Webhook Subscriptions</Heading>

      <Text color="gray" size="2">
        Register a callback URL to receive real-time event notifications when todos change.
        Your endpoint will receive a POST request with a JSON payload for each event.
      </Text>

      <Card>
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4" p="2">
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">Callback URL</Text>
              <TextField.Root
                placeholder="https://example.com/webhook"
                value={callbackUrl}
                onChange={(e) => setCallbackUrl(e.target.value)}
                type="url"
                disabled={loading}
              />
            </Flex>

            <Flex direction="column" gap="2">
              <Text size="2" weight="medium">Events</Text>
              <CheckboxGroup.Root
                value={selectedEvents}
                onValueChange={setSelectedEvents}
              >
                {EVENT_TYPES.map((evt) => (
                  <CheckboxGroup.Item key={evt} value={evt}>
                    <Text size="2" style={{ fontFamily: 'monospace' }}>{evt}</Text>
                  </CheckboxGroup.Item>
                ))}
              </CheckboxGroup.Root>
            </Flex>

            {error && (
              <Callout.Root color="red" size="1">
                <Callout.Icon><InfoCircledIcon /></Callout.Icon>
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
            )}

            <Button type="submit" loading={loading} disabled={loading}>
              Subscribe
            </Button>
          </Flex>
        </form>
      </Card>

      {result && (
        <>
          <Separator />
          <Callout.Root color="green">
            <Callout.Icon><CheckCircledIcon /></Callout.Icon>
            <Callout.Text>Webhook registered successfully!</Callout.Text>
          </Callout.Root>
          <Card>
            <Flex direction="column" gap="2" p="2">
              {result.id && (
                <Flex justify="between">
                  <Text size="2" color="gray">ID</Text>
                  <Text size="1" style={{ fontFamily: 'monospace' }}>{result.id}</Text>
                </Flex>
              )}
              {result.callbackUrl && (
                <Flex justify="between" align="center">
                  <Text size="2" color="gray">URL</Text>
                  <Text size="2">{result.callbackUrl}</Text>
                </Flex>
              )}
              {result.events && (
                <Flex justify="between" align="center" gap="2" wrap="wrap">
                  <Text size="2" color="gray">Events</Text>
                  <Flex gap="1" wrap="wrap">
                    {(result.events as string[]).map((ev) => (
                      <Badge key={ev} size="1" variant="soft">{ev}</Badge>
                    ))}
                  </Flex>
                </Flex>
              )}
            </Flex>
          </Card>
        </>
      )}
    </Flex>
  );
}
