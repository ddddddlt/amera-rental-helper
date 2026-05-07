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
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E5E6EB',
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 8,
          },
          tabBarActiveTintColor: '#165DFF',
          tabBarInactiveTintColor: '#86909C',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginTop: 3,
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
