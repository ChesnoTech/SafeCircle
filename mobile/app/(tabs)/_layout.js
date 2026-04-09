import { Tabs } from 'expo-router';
import { Text, I18nManager } from 'react-native';
import { CONFIG } from '../../lib/config';
import { t, isRTL } from '../../lib/i18n';

const TAB_ICONS = { Home: '🏠', Map: '🗺️', Report: '🚨', Profile: '👤' };

function TabIcon({ name, focused }) {
  return <Text style={{ fontSize: focused ? 28 : 24 }}>{TAB_ICONS[name] || '•'}</Text>;
}

export default function TabLayout() {
  // Sync React Native RTL with i18n
  const rtl = isRTL();
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
  }

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
          title: t('tabs.home'),
          tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} />,
          headerTitle: 'SafeCircle',
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('tabs.map'),
          tabBarIcon: ({ focused }) => <TabIcon name="Map" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: t('tabs.report'),
          tabBarIcon: ({ focused }) => <TabIcon name="Report" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
