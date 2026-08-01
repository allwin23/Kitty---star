import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { AnimatedTabIcon } from '@/components/ui/animated-tab-icon';
import { NavBouquetBackdrop } from '@/components/ui/nav-bouquet-backdrop';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarItemStyle: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 20,
          right: 20,
          height: 60,
          borderRadius: 999,
          overflow: 'hidden',
          backgroundColor: 'rgba(255, 255, 255, 0.72)',
          borderColor: 'rgba(255, 255, 255, 0.90)',
          borderWidth: 1.5,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.12,
          shadowRadius: 20,
          elevation: 10,
          ...(Platform.OS === 'web'
            ? ({
                backdropFilter: 'blur(18px) saturate(160%)',
                WebkitBackdropFilter: 'blur(18px) saturate(160%)',
              } as any)
            : {}),
        },
        tabBarBackground: () => <NavBouquetBackdrop />,
      }}
    >
      {/* 4 Main Visible Tabs */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon name="home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="accountability"
        options={{
          title: 'Plan',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon name="accountability" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="pomodoro"
        options={{
          title: 'Timer',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon name="pomodoro" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          title: 'Journey',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon name="journey" focused={focused} />
          ),
        }}
      />

      {/* Hidden tabs */}
      <Tabs.Screen name="planner" options={{ href: null }} />
      <Tabs.Screen name="statistics" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
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
