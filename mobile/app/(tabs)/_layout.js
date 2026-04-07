import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabIcon({ name, focused }) {
  const icons = { Home: '🏠', Map: '🗺️', Report: '🚨', Profile: '👤' };
  return <Text style={{ fontSize: focused ? 28 : 24 }}>{icons[name] || '•'}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#DC2626',
        tabBarInactiveTintColor: '#666',
        headerStyle: { backgroundColor: '#DC2626' },
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
