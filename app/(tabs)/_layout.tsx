import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../lib/design/colors';
import { Typography } from '../../lib/design/fonts';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused }: { name: IoniconsName; focused: boolean }) {
  return <Ionicons name={name} size={24} color={focused ? Colors.accent : Colors.tertiaryText} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1C2336',
          borderTopColor: '#2E3A52',
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 18,
          paddingTop: 10,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
          elevation: 20,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.tertiaryText,
        tabBarLabelStyle: {
          ...Typography.caption,
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="modules"
        options={{
          title: 'Programs',
          tabBarIcon: ({ focused }) => <TabIcon name="grid-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => (
            <Ionicons name="home" size={28} color={focused ? Colors.accent : Colors.tertiaryText} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ focused }) => <TabIcon name="bar-chart-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
