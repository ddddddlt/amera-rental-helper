import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  let tabBarStyle = {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E6EB',
    paddingTop: 8,
    paddingBottom: insets.bottom + 8,
    height: insets.bottom + 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  };

  if (Platform.OS === 'web') {
    tabBarStyle = {
      ...tabBarStyle,
      paddingBottom: 20,
    } as any;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: '#165DFF',
        tabBarInactiveTintColor: '#86909C',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
          paddingBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="house" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="device"
        options={{
          title: '设备',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="camera" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tenant"
        options={{
          title: '租客',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="users" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="order"
        options={{
          title: '订单',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="clipboard-list" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: '财务',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="money-bill-wave" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
