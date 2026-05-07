/**
 * 财务管理页面 - 租金收入和押金返还查询
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Switch,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useData } from '@/contexts/DataContext';
import { Order, ORDER_STATUS } from '@/utils/storage';
import { FontAwesome6 } from '@expo/vector-icons';

// 财务记录类型
interface FinanceRecord {
  id: string;
  type: 'rent' | 'deposit';
  orderId: string;
  deviceModel: string;
  tenantName: string;
  amount: number;
  isReceived: boolean;
  destination: string;
  orderDate: string;
  status: Order['status'];
}

export default function FinanceScreen() {
  const { orders, updateOrder } = useData();
  const [activeTab, setActiveTab] = useState<'all' | 'rent' | 'deposit'>('all');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinanceRecord | null>(null);
  const [editForm, setEditForm] = useState({
    isReceived: false,
    destination: '',
    amount: '',
  });

  // 转换订单为财务记录
  const financeRecords = useMemo(() => {
    const records: FinanceRecord[] = [];
    
    orders.forEach(order => {
      // 租金记录
      records.push({
        id: `rent_${order.id}`,
        type: 'rent',
        orderId: order.id,
        deviceModel: order.deviceModel,
        tenantName: order.tenantName,
        amount: order.totalAmount,
        isReceived: order.rentReceived || false,
        destination: order.rentDestination || '',
        orderDate: order.startDate,
        status: order.status,
      });
      
      // 押金记录
      records.push({
        id: `deposit_${order.id}`,
        type: 'deposit',
        orderId: order.id,
        deviceModel: order.deviceModel,
        tenantName: order.tenantName,
        amount: order.deposit,
        isReceived: order.depositReceived || false,
        destination: order.depositDestination || '',
        orderDate: order.startDate,
        status: order.status,
      });
    });

    // 按日期排序（新到旧）
    return records.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [orders]);

  // 筛选记录
  const filteredRecords = useMemo(() => {
    if (activeTab === 'all') return financeRecords;
    return financeRecords.filter(record => record.type === activeTab);
  }, [financeRecords, activeTab]);

  // 统计数据
  const stats = useMemo(() => {
    const rentRecords = financeRecords.filter(r => r.type === 'rent');
    const depositRecords = financeRecords.filter(r => r.type === 'deposit');

    return {
      totalRent: rentRecords.reduce((sum, r) => sum + r.amount, 0),
      receivedRent: rentRecords.filter(r => r.isReceived).reduce((sum, r) => sum + r.amount, 0),
      pendingRent: rentRecords.filter(r => !r.isReceived).reduce((sum, r) => sum + r.amount, 0),
      totalDeposit: depositRecords.reduce((sum, r) => sum + r.amount, 0),
      receivedDeposit: depositRecords.filter(r => r.isReceived).reduce((sum, r) => sum + r.amount, 0),
      pendingDeposit: depositRecords.filter(r => !r.isReceived).reduce((sum, r) => sum + r.amount, 0),
    };
  }, [financeRecords]);

  // 开始编辑
  const handleEdit = (record: FinanceRecord) => {
    setEditingRecord(record);
    setEditForm({
      isReceived: record.isReceived,
      destination: record.destination,
      amount: record.amount.toString(),
    });
    setEditModalVisible(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    const updates: Partial<Order> = {};
    if (editingRecord.type === 'rent') {
      updates.rentReceived = editForm.isReceived;
      updates.rentDestination = editForm.destination;
      const newAmount = parseFloat(editForm.amount);
      if (!isNaN(newAmount)) {
        updates.totalAmount = newAmount;
      }
    } else {
      updates.depositReceived = editForm.isReceived;
      updates.depositDestination = editForm.destination;
      const newAmount = parseFloat(editForm.amount);
      if (!isNaN(newAmount)) {
        updates.deposit = newAmount;
      }
    }

    await updateOrder(editingRecord.orderId, updates);
    setEditModalVisible(false);
    setEditingRecord(null);
  };

  return (
    <Screen>
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        {/* 头部标题 */}
        <View className="bg-white dark:bg-gray-800 px-4 pt-8 pb-4 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">财务管理</Text>
            <FontAwesome6 name="money-bill-wave" size={24} color="#059669" />
          </View>
        </View>

        {/* 统计卡片区域 */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="p-4">
            {/* 租金统计 */}
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 shadow-sm">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl items-center justify-center mr-3">
                  <FontAwesome6 name="sack-dollar" size={20} color="#059669" />
                </View>
                <Text className="text-lg font-bold text-gray-900 dark:text-white">租金收入</Text>
              </View>
              <View className="flex-row justify-between">
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 dark:text-gray-400">已收</Text>
                  <Text className="text-xl font-bold text-green-600">¥{stats.receivedRent.toFixed(2)}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 dark:text-gray-400">待收</Text>
                  <Text className="text-xl font-bold text-orange-500">¥{stats.pendingRent.toFixed(2)}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 dark:text-gray-400">总计</Text>
                  <Text className="text-xl font-bold text-gray-900 dark:text-white">¥{stats.totalRent.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* 押金统计 */}
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 shadow-sm">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl items-center justify-center mr-3">
                  <FontAwesome6 name="shield-halved" size={20} color="#0EA5E9" />
                </View>
                <Text className="text-lg font-bold text-gray-900 dark:text-white">押金管理</Text>
              </View>
              <View className="flex-row justify-between">
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 dark:text-gray-400">已收/未返还</Text>
                  <Text className="text-xl font-bold text-blue-600">¥{stats.receivedDeposit.toFixed(2)}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 dark:text-gray-400">已返还</Text>
                  <Text className="text-xl font-bold text-gray-400">¥0.00</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 dark:text-gray-400">总计</Text>
                  <Text className="text-xl font-bold text-gray-900 dark:text-white">¥{stats.totalDeposit.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* Tab 筛选 */}
            <View className="flex-row bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-4">
              <TouchableOpacity
                className={`flex-1 py-2 rounded-lg ${activeTab === 'all' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
                onPress={() => setActiveTab('all')}
              >
                <Text className={`text-center font-medium ${activeTab === 'all' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  全部
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-2 rounded-lg ${activeTab === 'rent' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
                onPress={() => setActiveTab('rent')}
              >
                <Text className={`text-center font-medium ${activeTab === 'rent' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  租金
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-2 rounded-lg ${activeTab === 'deposit' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
                onPress={() => setActiveTab('deposit')}
              >
                <Text className={`text-center font-medium ${activeTab === 'deposit' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  押金
                </Text>
              </TouchableOpacity>
            </View>

            {/* 记录列表 */}
            <View className="space-y-3">
              {filteredRecords.length === 0 ? (
                <View className="bg-white dark:bg-gray-800 rounded-2xl p-8 items-center">
                  <FontAwesome6 name="inbox" size={48} color="#9CA3AF" />
                  <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">暂无财务记录</Text>
                </View>
              ) : (
                filteredRecords.map((record) => (
                  <TouchableOpacity
                    key={record.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm active:opacity-80"
                    onPress={() => handleEdit(record)}
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-row items-center">
                        <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
                          record.type === 'rent' 
                            ? 'bg-green-100 dark:bg-green-900/30' 
                            : 'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                          <FontAwesome6 
                            name={record.type === 'rent' ? 'sack-dollar' : 'shield-halved'} 
                            size={18} 
                            color={record.type === 'rent' ? '#059669' : '#0EA5E9'} 
                          />
                        </View>
                        <View>
                          <Text className="font-bold text-gray-900 dark:text-white">
                            {record.type === 'rent' ? '租金' : '押金'}
                          </Text>
                          <Text className="text-sm text-gray-500 dark:text-gray-400">
                            {record.deviceModel} · {record.tenantName}
                          </Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className="text-lg font-bold text-gray-900 dark:text-white">
                          ¥{record.amount.toFixed(2)}
                        </Text>
                        <View className={`px-2 py-1 rounded-full ${
                          record.isReceived 
                            ? 'bg-green-100 dark:bg-green-900/30' 
                            : 'bg-orange-100 dark:bg-orange-900/30'
                        }`}>
                          <Text className={`text-xs font-medium ${
                            record.isReceived 
                              ? 'text-green-700 dark:text-green-400' 
                              : 'text-orange-700 dark:text-orange-400'
                          }`}>
                            {record.isReceived ? '已收' : '待收'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <View className="flex-row justify-between items-center">
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        {record.orderDate}
                      </Text>
                      {record.destination ? (
                        <Text className="text-sm text-gray-400">
                          去向: {record.destination}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        </ScrollView>

        {/* 编辑弹窗 */}
        <Modal visible={editModalVisible} transparent animationType="slide">
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
            className="flex-1"
          >
            <TouchableWithoutFeedback onPress={() => setEditModalVisible(false)}>
              <View className="flex-1 bg-black/50 justify-end">
                <TouchableWithoutFeedback>
                  <View className="bg-white dark:bg-gray-800 rounded-t-2xl p-5 max-h-[85vh]">
                    <View className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full self-center mb-4" />
                    
                    <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                      编辑{editingRecord?.type === 'rent' ? '租金' : '押金'}信息
                    </Text>

                    <ScrollView className="flex-shrink mb-4">
                      {editingRecord && (
                        <View className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-4">
                          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">设备</Text>
                          <Text className="text-gray-900 dark:text-white font-medium">{editingRecord.deviceModel}</Text>
                          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-1">租客</Text>
                          <Text className="text-gray-900 dark:text-white font-medium">{editingRecord.tenantName}</Text>
                        </View>
                      )}

                      <Text className="text-gray-900 dark:text-white font-medium mb-2">
                        {editingRecord?.type === 'rent' ? '租金金额' : '押金金额'}
                      </Text>
                      <View className="flex-row items-center mb-4">
                        <Text className="text-gray-900 dark:text-white text-lg font-bold mr-2">¥</Text>
                        <TextInput
                          className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white text-lg"
                          value={editForm.amount}
                          onChangeText={(text) => setEditForm({...editForm, amount: text})}
                          placeholder="0.00"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="decimal-pad"
                        />
                      </View>

                      <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-gray-900 dark:text-white font-medium">
                          {editingRecord?.type === 'rent' ? '租金已收' : '押金已收'}
                        </Text>
                        <Switch
                          value={editForm.isReceived}
                          onValueChange={(value) => setEditForm({...editForm, isReceived: value})}
                        />
                      </View>

                      <Text className="text-gray-900 dark:text-white font-medium mb-2">
                        {editingRecord?.type === 'rent' ? '租金去向' : '押金去向'}
                      </Text>
                      <TextInput
                        className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white mb-4"
                        value={editForm.destination}
                        onChangeText={(text) => setEditForm({...editForm, destination: text})}
                        placeholder="如: 银行卡/微信/支付宝"
                        placeholderTextColor="#9CA3AF"
                      />
                    </ScrollView>
                    
                    <TouchableOpacity
                      className="bg-blue-500 rounded-xl py-4"
                      onPress={handleSaveEdit}
                    >
                      <Text className="text-white text-center font-bold">保存修改</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </Screen>
  );
}
