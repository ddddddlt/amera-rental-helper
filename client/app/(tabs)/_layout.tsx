import { Tabs } from 'expo-router';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E5E6EB',
            height: Platform.OS === 'ios' ? 60 + Math.min(insets.bottom, 20) : 65,
            paddingTop: 4,
            paddingBottom: Platform.OS === 'ios' ? Math.min(insets.bottom, 20) : 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 8,
          },
          tabBarActiveTintColor: '#165DFF',
          tabBarInactiveTintColor: '#86909C',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 4,
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
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
});
