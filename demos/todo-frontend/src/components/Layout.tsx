import { NavLink, Outlet, useNavigate } from 'react-router';
import {
    Avatar,
    Badge,
    Box,
    Button,
    Container,
    Flex,
    Heading,
    Separator,
    Text
} from '@radix-ui/themes';
import { useAuth } from '../lib/auth-context';

type NavItem = {
    to: string;
    label: string;
    emoji: string;
    adminOnly?: boolean;
};

const navItems: NavItem[] = [
    { to: '/todos', label: 'Todos', emoji: '✅' },
    { to: '/todos/import', label: 'Import', emoji: '📥' },
    { to: '/resilience', label: 'Resilience', emoji: '🛡️' },
    { to: '/batching', label: 'Batching', emoji: '📦' },
    { to: '/react-query', label: 'React Query', emoji: '⚡' },
    { to: '/live', label: 'Live', emoji: '📡' },
    { to: '/webhooks', label: 'Webhooks', emoji: '🔔' },
    { to: '/profile', label: 'Profile', emoji: '👤' },
    { to: '/admin/users', label: 'Users', emoji: '👥', adminOnly: true },
    { to: '/admin/activity', label: 'Activity', emoji: '📊', adminOnly: true }
];

function SidebarLink({ to, label, emoji }: NavItem) {
    return (
        <NavLink
            to={to}
            style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: '6px',
                textDecoration: 'none',
                color: isActive ? 'var(--accent-9)' : 'var(--gray-12)',
                backgroundColor: isActive ? 'var(--accent-3)' : 'transparent',
                fontWeight: isActive ? '600' : '400',
                fontSize: '14px',
                transition: 'background 0.15s'
            })}
        >
            <span>{emoji}</span>
            {label}
        </NavLink>
    );
}

export function Layout() {
    const { user, isAdmin, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin);

    return (
        <Flex style={{ minHeight: '100vh' }}>
            {/* Sidebar */}
            <Box
                style={{
                    width: '220px',
                    flexShrink: 0,
                    borderRight: '1px solid var(--gray-4)',
                    backgroundColor: 'var(--color-panel-solid)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '20px 12px'
                }}
            >
                {/* Logo */}
                <Flex align="center" gap="2" mb="5" px="2">
                    <Text size="5">📝</Text>
                    <Heading size="4" weight="bold">
                        Todos
                    </Heading>
                </Flex>

                {/* Nav links */}
                <Flex direction="column" gap="1" style={{ flex: 1 }}>
                    {visibleItems.filter(i => !i.adminOnly).map(item => (
                        <SidebarLink key={item.to} {...item} />
                    ))}

                    {isAdmin && (
                        <>
                            <Separator my="2" />
                            <Text size="1" color="gray" mb="1" weight="medium" style={{ paddingLeft: 'var(--space-2)', paddingRight: 'var(--space-2)' }}>
                                ADMIN
                            </Text>
                            {visibleItems.filter(i => i.adminOnly).map(item => (
                                <SidebarLink key={item.to} {...item} />
                            ))}
                        </>
                    )}
                </Flex>

                {/* User info + logout */}
                <Separator mb="3" />
                <Flex align="center" gap="2" px="1" mb="2">
                    <Avatar
                        size="2"
                        fallback={user?.email?.[0]?.toUpperCase() ?? '?'}
                        radius="full"
                    />
                    <Box style={{ overflow: 'hidden', flex: 1 }}>
                        <Text size="1" weight="medium" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.email}
                        </Text>
                        <Badge size="1" color={isAdmin ? 'orange' : 'blue'} variant="soft">
                            {user?.role}
                        </Badge>
                    </Box>
                </Flex>
                <Button variant="soft" color="red" size="1" onClick={handleLogout}>
                    Sign out
                </Button>
            </Box>

            {/* Main content */}
            <Box style={{ flex: 1, overflow: 'auto' }}>
                <Container size="3" p="6">
                    <Outlet />
                </Container>
            </Box>
        </Flex>
    );
}
