import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { palette } from '@/theme';

function TabIcon({ label, emoji, focused }: { label: string; emoji: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: focused ? 22 : 19, opacity: focused ? 1 : 0.75 }}>{emoji}</Text>
    </View>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.cherryBloom,
        tabBarInactiveTintColor: palette.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.1,
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: 'rgba(255, 247, 248, 0.88)',
          borderTopColor: 'rgba(250, 215, 224, 0.6)',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
          shadowColor: '#C73A57',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 8,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon label="Home" emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="accountability"
        options={{
          title: 'Plan',
          tabBarIcon: ({ focused }) => <TabIcon label="Accountability" emoji="✅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Planner',
          tabBarIcon: ({ focused }) => <TabIcon label="Planner" emoji="📋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="pomodoro"
        options={{
          title: 'Timer',
          tabBarIcon: ({ focused }) => <TabIcon label="Pomodoro" emoji="🍅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: 'Stats',
          tabBarIcon: ({ focused }) => <TabIcon label="Statistics" emoji="📊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          title: 'Journey',
          tabBarIcon: ({ focused }) => <TabIcon label="Journey" emoji="🗺️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon label="Profile" emoji="👤" focused={focused} />,
        }}
      />
      {/* Hidden tabs */}
      <Tabs.Screen name="achievements" options={{ href: null }} />
      <Tabs.Screen name="testing" options={{ href: null }} />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="pyq" options={{ href: null }} />
      <Tabs.Screen name="flashcards" options={{ href: null }} />
      <Tabs.Screen name="water" options={{ href: null }} />
      <Tabs.Screen name="english" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="notifications-settings" options={{ href: null }} />
      <Tabs.Screen name="companion" options={{ href: null }} />
    </Tabs>
  );
}

