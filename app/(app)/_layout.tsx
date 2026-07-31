import { Tabs } from 'expo-router';
import { Text, useColorScheme } from 'react-native';
import { colors } from '@/theme';

function TabIcon({ label, emoji }: { label: string; emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function AppLayout() {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.mutedText,
        tabBarStyle: {
          backgroundColor: palette.background,
          borderTopColor: palette.border,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: () => <TabIcon label="Home" emoji="🏠" />,
        }}
      />
      <Tabs.Screen
        name="accountability"
        options={{
          title: 'Plan',
          tabBarIcon: () => <TabIcon label="Accountability" emoji="✅" />,
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Planner',
          tabBarIcon: () => <TabIcon label="Planner" emoji="📋" />,
        }}
      />
      <Tabs.Screen
        name="pomodoro"
        options={{
          title: 'Timer',
          tabBarIcon: () => <TabIcon label="Pomodoro" emoji="🍅" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => <TabIcon label="Profile" emoji="👤" />,
        }}
      />
      {/* Hidden tabs */}
      <Tabs.Screen name="testing" options={{ href: null }} />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="pyq" options={{ href: null }} />
      <Tabs.Screen name="flashcards" options={{ href: null }} />
    </Tabs>
  );
}
