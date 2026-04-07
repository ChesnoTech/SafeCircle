import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { CONFIG } from '../../lib/config';

const TAB_ICONS = { Home: '🏠', Map: '🗺️', Report: '🚨', Profile: '👤' };

function TabIcon({ name, focused }) {
  return <Text style={{ fontSize: focused ? 28 : 24 }}>{TAB_ICONS[name] || '•'}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: CONFIG.COLORS.primary,
        tabBarInactiveTintColor: CONFIG.COLORS.textSecondary,
        headerStyle: { backgroundColor: CONFIG.COLORS.primary },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} />,
          headerTitle: 'SafeCircle',
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ focused }) => <TabIcon name="Map" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ focused }) => <TabIcon name="Report" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
