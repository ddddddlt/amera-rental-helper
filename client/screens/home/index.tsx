/**
 * 首页 - 数据看板 + 档期查询 + 全局日历
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Screen } from '@/components/Screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DeviceModel,
  TenantModel,
  OrderModel,
  Device,
  Tenant,
  Order,
  DEVICE_STATUS,
  ORDER_STATUS,
  DeviceStatus,
} from '@/utils/storage';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useData } from '@/contexts/DataContext';
import { useTheme } from '@/components/ColorSchemeUpdater';

// 设备颜色配置
const DEVICE_COLORS = [
  '#165DFF', '#00B42A', '#F53F3F', '#FF7D00', '#722ED1',
  '#EB0AA4', '#0AD3F9', '#D9H19', '#7819D5', '#16BDCA',
];

// 生成日期数组
const generateDateArray = (startDate: Date, days: number): string[] => {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

// 时间选择器组件
const TimePickerModal = ({
  visible,
  value,
  onConfirm,
  onCancel,
  title,
}: {
  visible: boolean;
  value: string;
  onConfirm: (val: string) => void;
  onCancel: () => void;
  title: string;
}) => {
  const [selectedDate, setSelectedDate] = useState(value ? value.split(' ')[0] : '');
  const [selectedHour, setSelectedHour] = useState(value ? value.split(' ')[1]?.split(':')[0] || '10' : '10');
  const [selectedMinute, setSelectedMinute] = useState(value ? value.split(' ')[1]?.split(':')[1] || '00' : '00');

  const today = new Date();
  const dates = generateDateArray(today, 30);
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '30'];

  const handleConfirm = () => {
    const datetime = `${selectedDate} ${selectedHour}:${selectedMinute}`;
    onConfirm(datetime);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-2xl" style={{ maxHeight: '70%' }}>
          <View className="flex-row justify-between items-center p-4 border-b border-[#E5E6EB]">
            <TouchableOpacity onPress={onCancel}>
              <Text className="text-[#86909C]">取消</Text>
            </TouchableOpacity>
            <Text className="text-base font-semibold text-[#1D2129]">{title}</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text className="text-[#165DFF] font-medium">确定</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row p-4 gap-2">
            {/* 日期选择 */}
            <View className="flex-1 h-[200px]">
              <Text className="text-xs text-[#86909C] mb-2">选择日期</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {dates.map((date) => (
                  <TouchableOpacity
                    key={date}
                    className={`py-2 px-3 rounded-lg mb-1 ${selectedDate === date ? 'bg-[#165DFF]' : ''}`}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text className={`text-sm ${selectedDate === date ? 'text-white' : 'text-[#1D2129]'}`}>
                      {date}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 小时选择 */}
            <View className="w-20 h-[200px]">
              <Text className="text-xs text-[#86909C] mb-2">时</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {hours.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    className={`py-2 rounded-lg mb-1 ${selectedHour === hour ? 'bg-[#165DFF]' : ''}`}
                    onPress={() => setSelectedHour(hour)}
                  >
                    <Text className={`text-sm text-center ${selectedHour === hour ? 'text-white' : 'text-[#1D2129]'}`}>
                      {hour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 分钟选择 */}
            <View className="w-20 h-[200px]">
              <Text className="text-xs text-[#86909C] mb-2">分</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {minutes.map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    className={`py-2 rounded-lg mb-1 ${selectedMinute === minute ? 'bg-[#165DFF]' : ''}`}
                    onPress={() => setSelectedMinute(minute)}
                  >
                    <Text className={`text-sm text-center ${selectedMinute === minute ? 'text-white' : 'text-[#1D2129]'}`}>
                      {minute}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// 全局日历组件
const GlobalCalendar = ({
  devices,
  orders,
  tenants,
  onClose,
  onViewDeviceHistory,
  onViewOrderDetail,
  onViewAppointment,
}: {
  devices: Device[];
  orders: Order[];
  tenants: Tenant[];
  onClose: () => void;
  onViewDeviceHistory: (device: Device) => void;
  onViewOrderDetail: (order: Order) => void;
  onViewAppointment: (device: Device, orders: Order[]) => void;
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterDeviceId, setFilterDeviceId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 获取当月的天数
  const getMonthDays = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, []);

  const monthDays = useMemo(() => getMonthDays(currentMonth), [currentMonth, getMonthDays]);

  const formatDate = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = (currentMonth.getMonth() + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${year}-${month}-${d}`;
  };

  // 格式化日期对象为字符串
  const formatDateObj = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const mi = date.getMinutes().toString().padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${mi}`;
  };

  // 获取设备颜色
  const getDeviceColor = (deviceId: string) => {
    const index = devices.findIndex((d) => d.id === deviceId);
    return DEVICE_COLORS[index % DEVICE_COLORS.length];
  };

  // 获取某天的租赁订单（只显示有对应设备且未归还的订单）
  const getOrdersForDay = (day: number) => {
    const dateStr = formatDate(day);
    return orders.filter((order) => {
      const start = order.startDate.split(' ')[0];
      const end = order.endDate.split(' ')[0];
      const hasDevice = devices.some((d) => d.id === order.deviceId);
      const isActive = order.status === ORDER_STATUS.ACTIVE;
      return dateStr >= start && dateStr <= end && hasDevice && isActive;
    });
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <Modal visible={true} animationType="slide">
      <Screen>
        <View className="flex-1 bg-[#F5F7FA]">
          {/* 顶部导航 */}
          <View className="bg-white px-4 py-3 border-b border-[#E5E6EB]">
            <View className="flex-row justify-between items-center">
              <TouchableOpacity onPress={onClose}>
                <Text className="text-[#165DFF] text-base">关闭</Text>
              </TouchableOpacity>
              <Text className="text-base font-semibold text-[#1D2129]">租赁日历</Text>
              <View className="w-10" />
            </View>
          </View>

          <ScrollView className="flex-1 p-4">
            {/* 设备图例 */}
            <View className="bg-white rounded-xl p-4 mb-4">
              <Text className="text-sm font-medium text-[#1D2129] mb-3">设备图例</Text>
              <View className="flex-row flex-wrap gap-2">
                {devices.map((device, index) => (
                  <TouchableOpacity
                    key={device.id}
                    className={`flex-row items-center px-3 py-2 rounded-full ${filterDeviceId === device.id ? 'bg-gray-100' : ''}`}
                    onPress={() => setFilterDeviceId(filterDeviceId === device.id ? null : device.id)}
                  >
                    <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: DEVICE_COLORS[index % DEVICE_COLORS.length] }} />
                    <Text className="text-xs text-[#1D2129]">{device.model}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 日历 */}
            <View className="bg-white rounded-xl p-4">
              {/* 月份切换 */}
              <View className="flex-row justify-between items-center mb-4">
                <TouchableOpacity onPress={prevMonth} className="px-4 py-2">
                  <Text className="text-[#165DFF] text-lg">‹</Text>
                </TouchableOpacity>
                <Text className="text-base font-semibold text-[#1D2129]">
                  {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
                </Text>
                <TouchableOpacity onPress={nextMonth} className="px-4 py-2">
                  <Text className="text-[#165DFF] text-lg">›</Text>
                </TouchableOpacity>
              </View>

              {/* 星期标题 */}
              <View className="flex-row mb-2">
                {weekDays.map((day, index) => (
                  <View key={index} className="flex-1 items-center">
                    <Text className={`text-xs ${index === 0 || index === 6 ? 'text-[#F53F3F]' : 'text-[#86909C]'}`}>
                      {day}
                    </Text>
                  </View>
                ))}
              </View>

              {/* 日期网格 */}
              <View className="flex-row flex-wrap">
                {monthDays.map((day, index) => (
                  <View key={index} className="w-[14.28%] aspect-square items-center justify-center">
                    {day ? (
                      <TouchableOpacity
                        className={`w-full h-full items-center justify-center rounded-lg ${selectedDate === formatDate(day) ? 'bg-[#165DFF]' : ''}`}
                        onPress={() => setSelectedDate(selectedDate === formatDate(day) ? null : formatDate(day))}
                      >
                        <Text className={`text-sm mb-1 ${selectedDate === formatDate(day) ? 'text-white font-bold' : new Date().toISOString().split('T')[0] === formatDate(day) ? 'text-[#165DFF] font-bold' : 'text-[#1D2129]'}`}>
                          {day}
                        </Text>
                        {/* 租赁点 */}
                        <View className="flex-row flex-wrap gap-1 justify-center max-w-full">
                          {getOrdersForDay(day)
                            .filter((o) => !filterDeviceId || o.deviceId === filterDeviceId)
                            .slice(0, 4)
                            .map((order) => (
                              <View
                                key={order.id}
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: selectedDate === formatDate(day) ? '#fff' : getDeviceColor(order.deviceId) }}
                              />
                            ))}
                          {getOrdersForDay(day).filter((o) => !filterDeviceId || o.deviceId === filterDeviceId).length > 4 && (
                            <Text className={`text-[10px] ${selectedDate === formatDate(day) ? 'text-white' : 'text-[#86909C]'}`}>...</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>

            {/* 当日租赁详情 */}
            {selectedDate ? (
              <View className="bg-white rounded-xl p-4 mt-4">
                <Text className="text-sm font-medium text-[#1D2129] mb-3">{selectedDate} 租赁情况</Text>
                {orders.filter((o) => {
                  const start = o.startDate.split(' ')[0];
                  const end = o.endDate.split(' ')[0];
                  return selectedDate >= start && selectedDate <= end;
                }).filter((o) => devices.some((d) => d.id === o.deviceId)).length > 0 ? (
                  orders.filter((o) => {
                    const start = o.startDate.split(' ')[0];
                    const end = o.endDate.split(' ')[0];
                    return selectedDate >= start && selectedDate <= end && devices.some((d) => d.id === o.deviceId);
                  }).map((order) => {
                    const device = devices.find((d) => d.id === order.deviceId)!;
                    const tenant = tenants.find((t) => t.id === order.tenantId);
                    const deviceIndex = devices.findIndex((d) => d.id === order.deviceId);
                    return (
                      <TouchableOpacity
                        key={order.id}
                        onPress={() => onViewOrderDetail(order)}
                        className="bg-[#F5F7FA] rounded-lg p-3 mb-2"
                      >
                        <View className="flex-row items-center mb-2">
                          <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: DEVICE_COLORS[deviceIndex % DEVICE_COLORS.length] }} />
                          <Text className="text-sm font-medium text-[#1D2129]">{device.model}</Text>
                          <View className={`ml-auto px-2 py-1 rounded ${order.status === ORDER_STATUS.ACTIVE ? 'bg-[#E6F7E6]' : 'bg-[#E5E6EB]'}`}>
                            <Text className={`text-xs ${order.status === ORDER_STATUS.ACTIVE ? 'text-[#00B42A]' : 'text-[#86909C]'}`}>{order.status === ORDER_STATUS.ACTIVE ? '进行中' : '已归还'}</Text>
                          </View>
                        </View>
                        <Text className="text-xs text-[#86909C] mb-1">租客：{tenant?.name || '未知'}</Text>
                        <Text className="text-xs text-[#86909C] mb-1">租期：{order.startDate} ~ {order.endDate}</Text>
                        <Text className="text-xs text-[#86909C]">租金：¥{order.totalAmount}</Text>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View className="py-8 items-center">
                    <Text className="text-sm text-[#86909C]">当日无租赁安排</Text>
                  </View>
                )}
              </View>
            ) : (
              <View className="bg-white rounded-xl p-4 mt-4">
                <Text className="text-sm font-medium text-[#1D2129] mb-3">设备租赁统计（点击查看详情）</Text>
                <View className="flex-row flex-wrap gap-2">
                  {devices.map((device, index) => {
                    const today = new Date().toISOString().split('T')[0];
                    // 找出今日在租的订单
                    const activeOrder = orders.find(
                      (o) => o.deviceId === device.id && o.status === ORDER_STATUS.ACTIVE && o.startDate <= today && o.endDate >= today
                    );
                    // 找出未来预定的订单（按开始日期排序）
                    const futureOrders = orders
                      .filter((o) => o.deviceId === device.id && o.startDate > today)
                      .sort((a, b) => a.startDate.localeCompare(b.startDate));
                    
                    // 只显示有订单的设备
                    if (!activeOrder && futureOrders.length === 0) return null;
                    
                    return (
                      <TouchableOpacity
                        key={device.id}
                        onPress={() => onViewDeviceHistory(device)}
                        className="flex-row items-center px-3 py-2 rounded-lg"
                        style={{
                          backgroundColor: activeOrder ? '#FFF7E6' : '#E8F3FF',
                        }}
                      >
                        <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: activeOrder ? '#FF7D00' : '#165DFF' }} />
                        <Text className="text-xs text-[#1D2129]">{device.model}</Text>
                        {activeOrder ? (
                          <Text className="text-xs text-[#FF7D00] ml-2">在租</Text>
                        ) : futureOrders.length > 0 ? (
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              onViewAppointment(device, futureOrders);
                            }}
                            className="flex-row items-center ml-2"
                          >
                            <Text className="text-xs text-[#165DFF] border border-[#165DFF] px-1.5 py-0.5 rounded">
                              有预约 ({futureOrders.length})
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Screen>
    </Modal>
  );
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { devices: contextDevices, orders: contextOrders, refreshKey, refreshData, deleteOrder, updateOrder, addOrder, updateDevice } = useData();
  const { themeMode, setThemeMode, isDark } = useTheme();
  const [stats, setStats] = useState({ total: 0, rented: 0, available: 0 });
  const [queryModel, setQueryModel] = useState('');
  const [queryStartDate, setQueryStartDate] = useState('');
  const [queryEndDate, setQueryEndDate] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [rentModalVisible, setRentModalVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [rentTenant, setRentTenant] = useState('');
  const [lastUsedTenant, setLastUsedTenant] = useState<string | null>(null);
  const [rentStartDate, setRentStartDate] = useState('');
  const [rentEndDate, setRentEndDate] = useState('');
  const [rentRemark, setRentRemark] = useState('');

	// JSONBin 配置
	const JSONBIN_BIN_ID = '69fca499c0954111d8ee2750';
	const JSONBIN_API_KEY = '$2a$10$jb4ayJR9zkbyHVldeN/1WuuaspSfXnz42jM05XUlYnAy3lDXQmOsG';
	const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

	// 同步功能 - 上传数据到 JSONBin
	const handleSyncUpload = async () => {
		try {
			setSyncing(true);
			
			const allDevices = await DeviceModel.getAll();
			const allTenants = await TenantModel.getAll();
			const allOrders = await OrderModel.getAll();

			const response = await fetch(JSONBIN_URL, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'X-Access-Key': JSONBIN_API_KEY,
				},
				body: JSON.stringify({
					devices: allDevices,
					tenants: allTenants,
					orders: allOrders,
					deviceId,
					updatedAt: new Date().toISOString(),
				}),
			});

			if (response.ok) {
				setLastSyncTime(new Date().toLocaleString());
				Alert.alert('成功', '数据已上传到云端');
			} else {
				Alert.alert('错误', '上传失败');
			}
		} catch (error) {
			console.error('Sync upload error:', error);
			Alert.alert('错误', '上传失败，请检查网络连接');
		} finally {
			setSyncing(false);
		}
	};


  // 同步功能 - 下载数据
  const handleSyncDownload = async () => {
    try {
      setSyncing(true);
      
      /**
       * 服务端文件：server/src/index.ts
       * 接口：GET /api/v1/sync
       */
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/sync`);

      if (response.ok) {
        const data = await response.json();
        
        // 保存到本地
        if (data.devices) await DeviceModel.saveAll(data.devices);
        if (data.tenants) await TenantModel.saveAll(data.tenants);
        if (data.orders) await OrderModel.saveAll(data.orders);
        
        // 刷新数据
        await refreshData();
        setLastSyncTime(new Date().toLocaleString());
        Alert.alert('成功', '数据已从云端同步');
      } else if (response.status === 404) {
        Alert.alert('提示', '云端暂无数据');
      } else {
        Alert.alert('错误', '下载失败');
      }
    } catch (error) {
      console.error('Sync download error:', error);
      Alert.alert('错误', '下载失败，请检查网络连接');
    } finally {
      setSyncing(false);
    }
  };

  const formatCreatedAt = (createdAt: string) => {
    try {
      const date = new Date(createdAt);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
	// 同步功能 - 从 JSONBin 下载数据
	const handleSyncDownload = async () => {
		try {
			setSyncing(true);

			const response = await fetch(JSONBIN_URL, {
				method: 'GET',
				headers: {
					'X-Access-Key': JSONBIN_API_KEY,
				},
			});

			if (response.ok) {
				const result = await response.json();
				const data = result.record;

				if (data) {
					await DeviceModel.clear();
					await TenantModel.clear();
					await OrderModel.clear();

					for (const device of data.devices || []) {
						await DeviceModel.add(device);
					}
					for (const tenant of data.tenants || []) {
						await TenantModel.add(tenant);
					}
					for (const order of data.orders || []) {
						await OrderModel.add(order);
					}

					setLastSyncTime(new Date().toLocaleString());
					Alert.alert('成功', '数据已从云端下载');
					
					// 刷新数据
					loadDevices();
					loadTenants();
					loadOrders();
				} else {
					Alert.alert('提示', '云端没有数据');
				}
			} else {
				Alert.alert('错误', '下载失败');
			}
		} catch (error) {
			console.error('Sync download error:', error);
			Alert.alert('错误', '下载失败，请检查网络连接');
		} finally {
			setSyncing(false);
		}
	};

  });

  // 今日日期格式化（使用阿拉伯数字）
  const todayObj = new Date();
  const todayFormatted = `${todayObj.getMonth() + 1}月${todayObj.getDate()}日 ${["日", "一", "二", "三", "四", "五", "六"][todayObj.getDay()]}曜日`;

  // 预约订单（未来时段的订单）
  const today = new Date().toISOString().split('T')[0];
  const upcomingOrders = contextOrders.filter(
    (o) => o.status === ORDER_STATUS.ACTIVE && o.startDate > today
  ).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // 时间选择器状态
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [pickerType, setPickerType] = useState<'query' | 'rent'>('query');

  // 加载数据
  const loadData = useCallback(async () => {
    const devicesData = await DeviceModel.getAll();
    // 根据订单重新计算设备状态
    const ordersData = await OrderModel.getAll();
    const updatedDevices = devicesData.map(device => {
      const deviceOrders = ordersData.filter(o => o.deviceId === device.id);
      const now = Date.now();
      const activeOrder = deviceOrders.find(o => 
        o.status === 'active' && 
        new Date(o.startDate).getTime() <= now && 
        new Date(o.endDate).getTime() >= now
      );
      const futureOrders = deviceOrders.filter(o => 
        o.status === 'active' && 
        new Date(o.startDate).getTime() > now
      );
      
      let status = device.status;
      if (activeOrder) {
        status = DEVICE_STATUS.RENTED;
      } else if (futureOrders.length > 0) {
        status = DEVICE_STATUS.APPOINTED;
      } else if (device.status !== DEVICE_STATUS.MAINTENANCE) {
        status = DEVICE_STATUS.AVAILABLE;
      }
      
      return { ...device, status };
    });
    setDevices(updatedDevices);
    setOrders(ordersData);

    // 手动计算正确的统计数据
    const nowStr = new Date().toISOString().split('T')[0];
    const activeDeviceIds = new Set(
      ordersData
        .filter((o) => o.status === ORDER_STATUS.ACTIVE && o.startDate <= nowStr && o.endDate >= nowStr)
        .map((o) => o.deviceId)
    );
    setStats({
      total: updatedDevices.length,
      rented: activeDeviceIds.size,
      available: updatedDevices.length - activeDeviceIds.size,
    });
  }, []);
  
  // 监听上下文设备变化，自动同步
  useEffect(() => {
    setDevices(contextDevices);
  }, [contextDevices]);
  
  // 监听上下文订单变化，自动同步
  useEffect(() => {
    setOrders(contextOrders);
  }, [contextOrders, refreshKey]);

  // 当 devices 或 orders 变化时，重新计算统计数据
  useEffect(() => {
    if (devices.length > 0 && orders.length > 0) {
      const nowStr = new Date().toISOString().split('T')[0];
      const activeDeviceIds = new Set(
        orders
          .filter((o) => o.status === ORDER_STATUS.ACTIVE && o.startDate <= nowStr && o.endDate >= nowStr)
          .map((o) => o.deviceId)
      );
      setStats({
        total: devices.length,
        rented: activeDeviceIds.size,
        available: devices.length - activeDeviceIds.size,
      });
    }
  }, [devices, orders]);

  // 组件挂载时自动设置默认时间（只在第一次挂载时设置）
  useEffect(() => {
    if (!queryStartDate || !queryEndDate) {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const currentHour = today.getHours();
      const startHour = currentHour < 12 ? 12 : 17;
      const startMinute = 0;
      
      const startDateTime = new Date(today);
      startDateTime.setHours(startHour, startMinute, 0, 0);
      
      const endDateTime = new Date(startDateTime.getTime() + 24 * 60 * 60 * 1000);
      
      const autoStartDate = `${todayStr} ${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
      const endYear = endDateTime.getFullYear();
      const endMonth = endDateTime.getMonth() + 1;
      const endDay = endDateTime.getDate();
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
      const endHour = endDateTime.getHours();
      const endMinute = endDateTime.getMinutes();
      const autoEndDate = `${endDate} ${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

      setQueryStartDate(autoStartDate);
      setQueryEndDate(autoEndDate);
      setRentStartDate(autoStartDate);
      setRentEndDate(autoEndDate);
    }
  }, []);

  // 页面聚焦时加载数据
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // 查询可用设备
  const handleQuery = async () => {
    if (!queryStartDate || !queryEndDate) {
      Alert.alert('提示', '请选择查询时间');
      return;
    }

    if (queryEndDate <= queryStartDate) {
      Alert.alert('提示', '结束时间必须晚于开始时间');
      return;
    }

    let filteredDevices = devices;

    if (queryModel) {
      filteredDevices = filteredDevices.filter((d) => d.model === queryModel);
    }

    const available: Device[] = [];

    for (const device of filteredDevices) {
      // 只通过时间冲突检测来判断是否可用，不检查设备状态
      const isAvailable = await OrderModel.checkAvailability(
        device.id,
        queryStartDate,
        queryEndDate
      );

      if (isAvailable) {
        available.push(device);
      }
    }

    setAvailableDevices(available);
    setShowResult(true);

    if (available.length === 0) {
      Alert.alert('提示', '该时段暂无可用设备');
    }
  };

  // 打开预约弹窗
  const openRentModal = (device: Device) => {
    if (tenants.length === 0) {
      Alert.alert('提示', '请先添加租客', [
        { text: '取消', style: 'cancel' },
        { text: '去添加', onPress: () => router.navigate('/tenant') },
      ]);
      return;
    }
    setSelectedDevice(device);
    // 直接使用查询时的时间
    setRentStartDate(queryStartDate);
    setRentEndDate(queryEndDate);
    setRentRemark('');
    // 自动选中上次使用的租客
    if (lastUsedTenant && tenants.some(t => t.id === lastUsedTenant)) {
      setRentTenant(lastUsedTenant);
    } else if (tenants.length > 0) {
      setRentTenant(tenants[0].id);
    } else {
      setRentTenant('');
    }
    setShowNewTenantForm(false);
    setNewTenantName('');
    setNewTenantPhone('');
    setNewTenantRemark('');
    setRentModalVisible(true);
  };

  // 确认租赁
  const handleRent = async () => {
    if (!rentTenant) {
      Alert.alert('提示', '请选择租客');
      return;
    }

    if (!selectedDevice) return;

    // 检查时间
    if (rentEndDate <= rentStartDate) {
      Alert.alert('提示', '结束时间必须晚于开始时间');
      return;
    }

    // 检查可用性
    const isAvailable = await OrderModel.checkAvailability(
      selectedDevice.id,
      rentStartDate,
      rentEndDate
    );

    if (!isAvailable) {
      Alert.alert('提示', '该设备在此时间段已被预约');
      return;
    }

    // 创建订单
    const tenant = tenants.find((t) => t.id === rentTenant);
    const totalDays = Math.ceil(
      (new Date(rentEndDate).getTime() - new Date(rentStartDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    const newOrder: Omit<Order, 'id'> = {
      deviceId: selectedDevice.id,
      deviceModel: selectedDevice.model,
      tenantId: rentTenant,
      tenantName: tenant?.name || '',
      tenantPhone: tenant?.phone || '',
      startDate: rentStartDate,
      endDate: rentEndDate,
      dailyRate: selectedDevice.dailyRate,
      deposit: selectedDevice.deposit,
      totalAmount: selectedDevice.dailyRate * totalDays,
      status: 'active',
      remark: rentRemark,
      createdAt: new Date().toISOString(),
      completedAt: null,
      depositReceived: false,
      depositDestination: '',
      rentReceived: false,
      rentDestination: '',
    };

    await addOrder(newOrder);

    // 根据订单时间更新设备状态
    const today = new Date().toISOString().split('T')[0];
    const orderStartDate = rentStartDate.split(' ')[0];
    let newDeviceStatus: DeviceStatus = DEVICE_STATUS.RENTED;
    
    if (orderStartDate > today) {
      // 如果开始时间在今天之后，是预约订单
      newDeviceStatus = DEVICE_STATUS.APPOINTED;
    }
    
    await updateDevice(selectedDevice.id, { status: newDeviceStatus });

    // 保存本次使用的租客，下次自动选中
    setLastUsedTenant(rentTenant);

    setRentModalVisible(false);
    setShowResult(false);

    Alert.alert('成功', '租赁登记成功');
  };

  // 时间选择器回调
  const handleTimeConfirm = (datetime: string) => {
    if (pickerType === 'query') {
      setQueryStartDate(datetime);
      setShowStartPicker(false);
    } else {
      setRentStartDate(datetime);
      setShowStartPicker(false);
    }
  };

  const handleEndTimeConfirm = (datetime: string) => {
    if (pickerType === 'query') {
      setQueryEndDate(datetime);
      setShowEndPicker(false);
    } else {
      setRentEndDate(datetime);
      setShowEndPicker(false);
    }
  };

  const openTimePicker = (type: 'start' | 'end', forType: 'query' | 'rent') => {
    setPickerType(forType);
    if (type === 'start') {
      setShowStartPicker(true);
    } else {
      setShowEndPicker(true);
    }
  };

  const handleAddDevice = () => {
    router.navigate('/device');
  };

  // 编辑预约订单
  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    // 从 ISO 字符串提取日期和时间部分
    const startDateTime = new Date(order.startDate);
    const endDateTime = new Date(order.endDate);
    const formatTime = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    setEditOrderData({
      startDate: order.startDate.split('T')[0],
      endDate: order.endDate.split('T')[0],
      startTime: formatTime(startDateTime),
      endTime: formatTime(endDateTime),
      remark: order.remark || '',
      deposit: String(order.deposit),
      depositReceived: order.depositReceived,
      depositDestination: order.depositDestination || '',
      rentReceived: order.rentReceived,
      rentDestination: order.rentDestination || '',
    });
    setEditOrderModal(true);
  };

  // 保存编辑的预约订单
  const handleSaveEditOrder = async () => {
    if (!editingOrder) return;

    // 检查日期是否有效
    if (!editOrderData.startDate || !editOrderData.endDate) {
      Alert.alert('提示', '请选择租赁日期');
      return;
    }

    // 合并日期和时间
    const fullStartDate = `${editOrderData.startDate} ${editOrderData.startTime}:00`;
    const fullEndDate = `${editOrderData.endDate} ${editOrderData.endTime}:00`;

    if (new Date(fullEndDate) < new Date(fullStartDate)) {
      Alert.alert('提示', '结束时间不能早于开始时间');
      return;
    }

    // 更新订单
    await OrderModel.update(editingOrder.id, {
      startDate: fullStartDate,
      endDate: fullEndDate,
      remark: editOrderData.remark,
      deposit: Number(editOrderData.deposit) || 0,
      depositReceived: editOrderData.depositReceived,
      depositDestination: editOrderData.depositDestination,
      rentReceived: editOrderData.rentReceived,
      rentDestination: editOrderData.rentDestination,
    });

    // 立即更新本地状态（乐观更新）
    setOrders(prev => prev.map(o => 
      o.id === editingOrder.id 
        ? { ...o, startDate: fullStartDate, endDate: fullEndDate, remark: editOrderData.remark }
        : o
    ));

    // 更新设备状态
    const today = new Date().toISOString().split('T')[0];
    const orderStartDate = fullStartDate.split(' ')[0];
    const orderEndDate = fullEndDate.split(' ')[0];
    
    let newDeviceStatus: DeviceStatus = DEVICE_STATUS.AVAILABLE;
    const hasActiveOrder = orders.some(o => 
      o.id !== editingOrder.id && 
      o.deviceId === editingOrder.deviceId &&
      o.startDate.split(' ')[0] <= today && 
      o.endDate.split(' ')[0] >= today
    );
    const hasFutureOrder = orders.some(o => 
      o.id !== editingOrder.id && 
      o.deviceId === editingOrder.deviceId &&
      o.startDate.split(' ')[0] > today
    );
    
    // 检查当前编辑的订单是否变为当前订单
    if (orderStartDate <= today && orderEndDate >= today) {
      newDeviceStatus = DEVICE_STATUS.RENTED;
    } else if (orderStartDate > today) {
      newDeviceStatus = DEVICE_STATUS.APPOINTED;
    } else if (hasActiveOrder) {
      newDeviceStatus = DEVICE_STATUS.RENTED;
    } else if (hasFutureOrder) {
      newDeviceStatus = DEVICE_STATUS.APPOINTED;
    }
    
    await DeviceModel.update(editingOrder.deviceId, { status: newDeviceStatus });
    setDevices(prev => prev.map(d => 
      d.id === editingOrder.deviceId ? { ...d, status: newDeviceStatus } : d
    ));

    setEditOrderModal(false);
    setEditingOrder(null);
    Alert.alert('成功', '订单已更新');
  };

  // 取消预约订单
  const handleCancelOrder = async (order: Order) => {
    Alert.alert(
      '确认取消',
      '确定要取消这个预约订单吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认取消',
          style: 'destructive',
          onPress: async () => {
            try {
              // 使用共享上下文删除订单（会自动更新所有页面）
              await deleteOrder(order.id);
              // context会自动更新状态，不需要额外loadData
              setEditOrderModal(false);
              setEditingOrder(null);
            } catch (error) {
              Alert.alert('错误', '取消订单失败');
            }
          },
        },
      ]
    );
  };

  // 删除订单
  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    
    Alert.alert('确认删除', '确定要删除这条租赁订单吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            // 使用共享上下文删除订单（会自动更新所有页面）
            await deleteOrder(selectedOrder.id);
            // context会自动更新状态，不需要额外loadData
            setOrderDetailModal(false);
            setSelectedOrder(null);
          } catch (error) {
            Alert.alert('错误', '删除订单失败');
          }
        },
      },
    ]);
  };

  const styles = {
    statusAvailable: 'bg-[#E6F7E6]',
    statusRented: 'bg-[#FFF2E8]',
    statusMaintenance: 'bg-[#F5F5F5]',
    remarkInput: {
      backgroundColor: '#F5F7FA',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: '#1D2129',
      fontSize: 16,
      minHeight: 48,
    },
    saveButton: {
      backgroundColor: '#165DFF',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center' as const,
      flex: 1,
    },
    cancelButton: {
      backgroundColor: '#F5F7FA',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center' as const,
      flex: 1,
    },
    deleteButton: {
      backgroundColor: '#FFF2F0',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center' as const,
      flex: 1,
    },
    deleteButtonText: {
      color: '#F53F3F',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    cancelButtonText: {
      color: '#4B5563',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    buttonRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      marginTop: 16,
      gap: 12,
    },
    // 编辑订单弹窗样式
    editFormContainer: {
      padding: 16,
    },
    label: {
      fontSize: 14,
      color: '#4B5563',
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: '#E5E6EB',
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      color: '#1D2129',
      backgroundColor: '#FFFFFF',
    },
    dateButton: {
      borderWidth: 1,
      borderColor: '#E5E6EB',
      borderRadius: 8,
      padding: 12,
      backgroundColor: '#FFFFFF',
    },
    dateButtonText: {
      fontSize: 14,
      color: '#1D2129',
    },
    dateText: {
      fontSize: 14,
      color: '#1D2129',
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: '#E5E6EB',
      borderRadius: 8,
      backgroundColor: '#FFFFFF',
    },
    dateInput: {
      borderWidth: 1,
      borderColor: '#E5E6EB',
      borderRadius: 8,
      padding: 12,
      backgroundColor: '#FFFFFF',
      fontSize: 14,
      color: '#1D2129',
    },
    editModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    editModalBackdrop: {
      flex: 1,
    },
    editModalContent: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '85%',
      paddingBottom: 20,
    },
    editModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E6EB',
    },
    editModalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1D2129',
    },
    editFormLabel: {
      fontSize: 14,
      color: '#4B5563',
      marginBottom: 8,
    },
    editFormInput: {
      borderWidth: 1,
      borderColor: '#E5E6EB',
      borderRadius: 8,
      padding: 12,
      backgroundColor: '#FFFFFF',
      fontSize: 14,
      color: '#1D2129',
    },
    modalContent: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '85%',
      paddingBottom: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E6EB',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1D2129',
    },
    closeButton: {
      padding: 8,
      marginRight: -8,
    },
    closeButtonText: {
      fontSize: 24,
      color: '#86909C',
    },
    formContent: {
      padding: 16,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    dateTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 8,
    },
    timeInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#E5E6EB',
      borderRadius: 8,
      padding: 12,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
    },
    dateSeparator: {
      paddingHorizontal: 12,
      color: '#86909C',
    },
  } as const;

  return (
    <Screen>
      {/* 顶部导航栏 */}
      <View
        className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-[#E5E6EB]"
        style={{ paddingTop: Math.max(insets.top, 8) }}
      >
        <Text className="text-xl font-bold text-[#1D2129]">相机排租助手</Text>
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="bg-[#F5F7FA] px-3 py-2 rounded-lg"
            onPress={() => setCalendarVisible(true)}
            activeOpacity={0.7}
          >
            <Text className="text-[#165DFF] text-sm font-medium">日历</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-3 py-2 rounded-lg ${syncing ? 'bg-gray-200' : 'bg-green-100'}`}
            onPress={handleSyncUpload}
            disabled={syncing}
            activeOpacity={0.7}
          >
            <Text className={`text-sm font-medium ${syncing ? 'text-gray-400' : 'text-green-700'}`}>
              {syncing ? '同步中...' : '上传'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-3 py-2 rounded-lg ${syncing ? 'bg-gray-200' : 'bg-blue-100'}`}
            onPress={handleSyncDownload}
            disabled={syncing}
            activeOpacity={0.7}
          >
            <Text className={`text-sm font-medium ${syncing ? 'text-gray-400' : 'text-blue-700'}`}>
              {syncing ? '同步中...' : '下载'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-[#F5F7FA]"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 10) }}
        showsVerticalScrollIndicator={false}
      >
        {/* 今日日期 + 刷新按钮 + 主题切换 */}
        <View className="flex-row items-center justify-center px-4 pt-4 flex-wrap">
          <Text className="text-lg font-semibold text-[#1D2129]">
            {todayFormatted}
          </Text>
          <TouchableOpacity 
            onPress={loadData}
            className="ml-3 p-2 bg-[#165DFF]/10 rounded-full"
          >
            <Text className="text-[#165DFF] text-sm">刷新</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => {
              const nextMode = themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light';
              setThemeMode(nextMode);
            }}
            className="ml-2 p-2 bg-[#722ED1]/10 rounded-full"
          >
            <Text className="text-[#722ED1] text-sm font-bold">
              {themeMode === 'light' ? '亮' : themeMode === 'dark' ? '暗' : '系'}
            </Text>
          </TouchableOpacity>
        </View>
        {lastSyncTime && (
          <View className="px-4 pt-2">
            <Text className="text-xs text-gray-400 text-center">
              最后同步: {lastSyncTime}
            </Text>
          </View>
        )}

        {/* 数据看板 */}
        <View className="flex-row px-4 pt-4 gap-3">
          <View className="flex-1 bg-white rounded-xl p-4 shadow-sm">
            <Text className="text-3xl font-bold text-[#165DFF] text-center">
              {stats.total || '暂无'}
            </Text>
            <Text className="text-xs text-[#86909C] text-center mt-1">总设备数</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-4 shadow-sm">
            <Text className="text-3xl font-bold text-[#FF7D00] text-center">
              {stats.rented || '暂无'}
            </Text>
            <Text className="text-xs text-[#86909C] text-center mt-1">今日在租</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-4 shadow-sm">
            <Text className="text-3xl font-bold text-[#00B42A] text-center">
              {stats.available || '暂无'}
            </Text>
            <Text className="text-xs text-[#86909C] text-center mt-1">空闲可用</Text>
          </View>
        </View>

        {/* 预约订单窗口 */}
        {upcomingOrders.length > 0 && (
          <View className="px-4 mt-5">
            <Text className="text-base font-semibold text-[#1D2129] mb-3">
              预约订单 ({upcomingOrders.length})
            </Text>
            <View className="bg-white rounded-xl p-4 shadow-sm">
              {upcomingOrders.map((order) => {
                const device = devices.find((d) => d.id === order.deviceId);
                const tenant = tenants.find((t) => t.id === order.tenantId);
                return (
                  <TouchableOpacity
                    key={order.id}
                    className="border-b border-[#E5E6EB] pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0 active:bg-[#F5F7FA]"
                    onPress={() => handleEditOrder(order)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row justify-between items-center">
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-[#1D2129]">
                          {device?.model || '未知设备'}
                        </Text>
                        <Text className="text-xs text-[#86909C] mt-1">
                          租客：{tenant?.name || '未知'} {tenant?.phone ? `- ${tenant.phone}` : ''}
                        </Text>
                        <Text className="text-xs text-[#165DFF] mt-1">
                          预约：{order.startDate.split('T')[0]} {order.startDate.split('T')[1]?.slice(0, 5) || ''} 至 {order.endDate.split('T')[0]} {order.endDate.split('T')[1]?.slice(0, 5) || ''}
                        </Text>
                        <Text className="text-xs text-[#86909C] mt-1">
                          创建时间：{formatCreatedAt(order.createdAt)}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <View className="bg-[#FFF7E6] px-2 py-1 rounded mr-2">
                          <Text className="text-xs text-[#FF7D00]">待生效</Text>
                        </View>
                        <Text className="text-[#165DFF] text-lg">›</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* 空闲档期查询 */}
        <View className="px-4 mt-5">
          <Text className="text-base font-semibold text-[#1D2129] mb-3">空闲档期查询</Text>
          <View className="bg-white rounded-xl p-4 shadow-sm">
            <View className="mb-4">
              <Text className="text-xs text-[#86909C] mb-2">选择机型</Text>
              <View className="bg-[#F5F7FA] rounded-lg">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    className={`px-4 py-3 rounded-lg mr-2 ${!queryModel ? 'bg-[#165DFF]' : 'bg-[#F5F7FA]'}`}
                    onPress={() => setQueryModel('')}
                  >
                    <Text className={`text-sm ${!queryModel ? 'text-white' : 'text-[#1D2129]'}`}>
                      全部
                    </Text>
                  </TouchableOpacity>
                  {[...new Set(devices.map((d) => d.model))].map((model) => (
                    <TouchableOpacity
                      key={model}
                      className={`px-4 py-3 rounded-lg mr-2 ${queryModel === model ? 'bg-[#165DFF]' : 'bg-[#F5F7FA]'}`}
                      onPress={() => setQueryModel(model)}
                    >
                      <Text className={`text-sm ${queryModel === model ? 'text-white' : 'text-[#1D2129]'}`}>
                        {model}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-xs text-[#86909C] mb-2">开始时间</Text>
                <TouchableOpacity
                  className="bg-[#F5F7FA] rounded-lg"
                  onPress={() => openTimePicker('start', 'query')}
                >
                  <View className="px-4 py-3">
                    <Text className="text-sm text-[#1D2129]">{queryStartDate || '选择日期时间'}</Text>
                  </View>
                </TouchableOpacity>
              </View>
              <View className="flex-1">
                <Text className="text-xs text-[#86909C] mb-2">结束时间</Text>
                <TouchableOpacity
                  className="bg-[#F5F7FA] rounded-lg"
                  onPress={() => openTimePicker('end', 'query')}
                >
                  <View className="px-4 py-3">
                    <Text className="text-sm text-[#1D2129]">{queryEndDate || '选择日期时间'}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              className="bg-[#165DFF] rounded-lg py-4 items-center"
              onPress={handleQuery}
            >
              <Text className="text-white font-medium">查询可用设备</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 查询结果 */}
        {showResult && (
          <View className="px-4 mt-5">
            <Text className="text-base font-semibold text-[#1D2129] mb-3">可用设备</Text>
            {availableDevices.length === 0 ? (
              <View className="bg-white rounded-xl p-8 items-center shadow-sm">
                <Text className="text-[#BFBFBF]">暂无可用设备</Text>
              </View>
            ) : (
              availableDevices.map((device) => (
                <View key={device.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                      <Text className="text-base font-medium text-[#1D2129]">{device.model}</Text>
                      {device.serialNumber && (
                        <Text className="text-xs text-[#86909C] mt-1">序列号: {device.serialNumber}</Text>
                      )}
                      <View className="flex-row mt-1">
                        <Text className="text-sm text-[#FF7D00]">¥{device.dailyRate}/天</Text>
                        <Text className="text-sm text-[#86909C] ml-3">押金 ¥{device.deposit}</Text>
                      </View>
                      {device.accessories && (
                        <Text className="text-xs text-[#86909C] mt-1">配件: {device.accessories}</Text>
                      )}
                    </View>
                    <View className={`px-2 py-1 rounded ${styles.statusAvailable}`}>
                      <Text className="text-xs text-[#00B42A]">可租</Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2 mt-2">
                    <TouchableOpacity
                      className="flex-1 bg-[#165DFF] rounded-lg py-3 items-center"
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedDevice(device);
                        setRentTenant('');
                        setRentStartDate(queryStartDate);
                        setRentEndDate(queryEndDate);
                        setRentRemark('');
                        setRentModalVisible(true);
                      }}
                    >
                      <Text className="text-white font-medium">预约租赁</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 bg-[#F5F7FA] rounded-lg py-3 items-center"
                      onPress={() => {
                        setSelectedDevice(device);
                        setDeviceHistoryModal(true);
                      }}
                    >
                      <Text className="text-[#1D2129] font-medium">历史记录</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* 时间选择器 */}
      <TimePickerModal
        visible={showStartPicker}
        value={pickerType === 'query' ? queryStartDate : rentStartDate}
        onConfirm={handleTimeConfirm}
        onCancel={() => setShowStartPicker(false)}
        title="选择开始时间"
      />
      <TimePickerModal
        visible={showEndPicker}
        value={pickerType === 'query' ? queryEndDate : rentEndDate}
        onConfirm={handleEndTimeConfirm}
        onCancel={() => setShowEndPicker(false)}
        title="选择结束时间"
      />

      {/* 全局日历 */}
      {calendarVisible && (
        <GlobalCalendar
          devices={devices}
          orders={orders}
          tenants={tenants}
          onClose={() => setCalendarVisible(false)}
          onViewDeviceHistory={(device) => {
            setSelectedDevice(device);
            setDeviceHistoryModal(true);
            setCalendarVisible(false);
          }}
          onViewOrderDetail={(order) => {
            setSelectedOrder(order);
            setCalendarVisible(false);
            setOrderDetailModal(true);
          }}
          onViewAppointment={(device, appOrders) => {
            setSelectedDeviceForAppointment(device);
            setAppointmentOrders(appOrders);
            setAppointmentDetailModal(true);
          }}
        />
      )}

      {/* 设备详情和历史记录弹窗 */}
      {deviceHistoryModal && selectedDevice && (
        <View className="absolute inset-0 z-50">
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl max-h-[85vh]" style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
              <View className="flex-row justify-between items-center p-4 border-b border-[#E5E6EB]">
                <Text className="text-lg font-semibold text-[#1D2129]">
                  设备详情
                </Text>
                <TouchableOpacity 
                  className="w-10 h-10 items-center justify-center"
                  onPress={() => setDeviceHistoryModal(false)}
                >
                  <Text className="text-[#86909C] text-2xl">✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView className="p-4 max-h-[70vh]" keyboardShouldPersistTaps="handled">
                {/* 设备基本信息 */}
                <View className="bg-[#F5F7FA] rounded-xl p-4 mb-4">
                  <Text className="text-lg font-bold text-[#1D2129] mb-2">{selectedDevice.model}</Text>
                  {selectedDevice.serialNumber && (
                    <View className="flex-row mb-2">
                      <Text className="text-[#86909C] text-sm w-20">序列号：</Text>
                      <Text className="text-[#1D2129] text-sm font-medium">{selectedDevice.serialNumber}</Text>
                    </View>
                  )}
                  <View className="flex-row mb-2">
                    <Text className="text-[#86909C] text-sm w-20">日租金：</Text>
                    <Text className="text-red-500 text-sm font-bold">¥{selectedDevice.dailyRate}</Text>
                  </View>
                  <View className="flex-row mb-2">
                    <Text className="text-[#86909C] text-sm w-20">押金：</Text>
                    <Text className="text-[#1D2129] text-sm font-medium">¥{selectedDevice.deposit}</Text>
                  </View>
                  <View className="flex-row mb-2">
                    <Text className="text-[#86909C] text-sm w-20">机器状态：</Text>
                    <Text className="text-[#1D2129] text-sm font-medium">{selectedDevice.condition}</Text>
                  </View>
                  <View className="flex-row mb-2">
                    <Text className="text-[#86909C] text-sm w-20">配件：</Text>
                    <Text className="text-[#1D2129] text-sm flex-1">{selectedDevice.accessories || '无'}</Text>
                  </View>
                  <View className="flex-row mb-2">
                    <Text className="text-[#86909C] text-sm w-20">当前状态：</Text>
                    <Text className={`text-sm font-medium ${
                      selectedDevice.status === 'available' ? 'text-[#00B42A]' :
                      selectedDevice.status === 'rented' ? 'text-[#FF7D00]' : 'text-[#F53F3F]'
                    }`}>
                      {selectedDevice.status === 'available' ? '空闲' : selectedDevice.status === 'rented' ? '租用中' : '维护中'}
                    </Text>
                  </View>
                  {selectedDevice.nextAvailable && (
                    <View className="flex-row">
                      <Text className="text-[#86909C] text-sm w-20">下次可用：</Text>
                      <Text className="text-[#1D2129] text-sm">{selectedDevice.nextAvailable}</Text>
                    </View>
                  )}
                </View>

                {/* 历史租赁记录 */}
                <Text className="text-base font-semibold text-[#1D2129] mb-3">历史租赁记录</Text>
                {orders.filter(o => o.deviceId === selectedDevice.id).length === 0 ? (
                  <View className="py-8 items-center bg-[#F5F7FA] rounded-xl">
                    <Text className="text-[#86909C]">暂无租赁记录</Text>
                  </View>
                ) : (
                  orders
                    .filter(o => o.deviceId === selectedDevice.id)
                    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                    .map(order => {
                      const tenant = tenants.find(t => t.id === order.tenantId);
                      return (
                        <View key={order.id} className="bg-[#F5F7FA] rounded-xl p-4 mb-3">
                          <View className="flex-row justify-between items-start mb-2">
                            <Text className="text-base font-medium text-[#1D2129]">
                              {tenant?.name || '未知租客'}
                            </Text>
                            <View className={`px-2 py-1 rounded ${
                              order.status === 'active' ? 'bg-[#E6F7E6]' :
                              order.status === 'completed' ? 'bg-[#E6F4FF]' : 'bg-[#FFF7E6]'
                            }`}>
                              <Text className={`text-xs ${
                                order.status === 'active' ? 'text-[#00B42A]' :
                                order.status === 'completed' ? 'text-[#165DFF]' : 'text-[#FF7D00]'
                              }`}>
                                {order.status === 'active' ? '进行中' : order.status === 'completed' ? '已归还' : '待归还'}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-sm text-[#86909C]">
                            {order.startDate} 至 {order.endDate}
                          </Text>
                          {order.remark && (
                            <Text className="text-sm text-[#86909C] mt-1">备注: {order.remark}</Text>
                          )}
                          <View className="flex-row mt-2">
                            <Text className="text-sm text-[#FF7D00]">租金: ¥{order.dailyRate}/天</Text>
                            <Text className="text-sm text-[#86909C] ml-4">押金: ¥{order.deposit}</Text>
                          </View>
                        </View>
                      );
                    })
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      )}

      {/* 预约弹窗 - 简化版直接填写 */}
      {rentModalVisible && (
        <View className="absolute inset-0 z-50">
          <TouchableOpacity 
            className="flex-1 bg-black/50" 
            activeOpacity={1}
            onPress={() => setRentModalVisible(false)} 
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ justifyContent: 'flex-end' }}
          >
            <View className="bg-white rounded-t-3xl" style={{ paddingBottom: Math.max(insets.bottom + 10, 20) }}>
            <View className="flex-row justify-between items-center p-4 border-b border-[#E5E6EB]">
              <Text className="text-lg font-semibold text-[#1D2129]">预约租赁</Text>
              <TouchableOpacity 
                className="w-10 h-10 items-center justify-center"
                onPress={() => setRentModalVisible(false)}
              >
                <Text className="text-[#86909C] text-2xl">✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              className="p-4" 
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 8, flexGrow: 1 }}
              style={{ maxHeight: 400 }}
            >
              {/* 设备信息 */}
                <View className="bg-[#F5F7FA] rounded-xl p-4 mb-4">
                  <Text className="text-base font-medium text-[#1D2129]">{selectedDevice?.model}</Text>
                  <View className="flex-row mt-2">
                    <Text className="text-[#FF7D00] font-semibold">¥{selectedDevice?.dailyRate}/天</Text>
                    <Text className="text-[#86909C] ml-4">押金: ¥{selectedDevice?.deposit}</Text>
                  </View>
                  {selectedDevice?.accessories && (
                    <Text className="text-xs text-[#86909C] mt-1">配件: {selectedDevice.accessories}</Text>
                  )}
                </View>

                {/* 时间选择 */}
                <View className="flex-row gap-3 mb-4">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-[#1D2129] mb-2">开始时间 *</Text>
                    <TouchableOpacity
                      className="bg-[#F5F7FA] rounded-xl"
                      onPress={() => openTimePicker('start', 'rent')}
                    >
                      <View className="px-4 py-3">
                        <Text className="text-sm text-[#1D2129]">{rentStartDate || '点击选择'}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-[#1D2129] mb-2">结束时间 *</Text>
                    <TouchableOpacity
                      className="bg-[#F5F7FA] rounded-xl"
                      onPress={() => openTimePicker('end', 'rent')}
                    >
                      <View className="px-4 py-3">
                        <Text className="text-sm text-[#1D2129]">{rentEndDate || '点击选择'}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 租客选择/新增 */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-[#1D2129] mb-2">租客信息 *</Text>
                  <View className="bg-[#F5F7FA] rounded-xl p-3">
                    {/* 新增租客表单 */}
                    {showNewTenantForm ? (
                      <View>
                        <TextInput
                          className="bg-white rounded-lg px-4 py-3 mb-2 text-[#1D2129]"
                          placeholder="姓名 *"
                          placeholderTextColor="#BFBFBF"
                          value={newTenantName}
                          onChangeText={setNewTenantName}
                        />
                        <TextInput
                          className="bg-white rounded-lg px-4 py-3 mb-2 text-[#1D2129]"
                          placeholder="电话 *"
                          placeholderTextColor="#BFBFBF"
                          keyboardType="phone-pad"
                          value={newTenantPhone}
                          onChangeText={setNewTenantPhone}
                        />
                        <TextInput
                          className="bg-white rounded-lg px-4 py-3 mb-2 text-[#1D2129]"
                          placeholder="备注（选填）"
                          placeholderTextColor="#BFBFBF"
                          value={newTenantRemark}
                          onChangeText={setNewTenantRemark}
                        />
                        <View className="flex-row gap-2">
                          <TouchableOpacity
                            className="flex-1 bg-[#E6F4FF] rounded-lg py-3 items-center"
                            onPress={async () => {
                              if (!newTenantName || !newTenantPhone) {
                                Alert.alert('提示', '请填写姓名和电话');
                                return;
                              }
                              const newTenant = await TenantModel.create({
                                name: newTenantName,
                                phone: newTenantPhone,
                                school: '',
                                idCard: '',
                                remark: newTenantRemark,
                                photoUri: null,
                              });
                              setTenants([...tenants, newTenant]);
                              setRentTenant(newTenant.id);
                              setShowNewTenantForm(false);
                              setNewTenantName('');
                              setNewTenantPhone('');
                              setNewTenantRemark('');
                            }}
                          >
                            <Text className="text-[#165DFF] font-medium">保存并选择</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            className="flex-1 bg-[#F5F7FA] rounded-lg py-3 items-center"
                            onPress={() => {
                              setShowNewTenantForm(false);
                              setNewTenantName('');
                              setNewTenantPhone('');
                              setNewTenantRemark('');
                            }}
                          >
                            <Text className="text-[#86909C] font-medium">取消</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View>
                        {/* 未选择租客时的提示 */}
                        {!rentTenant && (
                          <Text className="text-[#86909C] text-sm mb-3 text-center">请选择或新增租客</Text>
                        )}
                        
                        {/* 已选租客卡片 */}
                        {rentTenant && tenants.find(t => t.id === rentTenant) && (
                          <View className="bg-white rounded-lg p-3 mb-2 flex-row items-center justify-between">
                            <View className="flex-1">
                              <Text className="text-[#1D2129] font-medium">
                                {tenants.find(t => t.id === rentTenant)?.name}
                              </Text>
                              <Text className="text-[#86909C] text-sm">
                                {tenants.find(t => t.id === rentTenant)?.phone}
                              </Text>
                            </View>
                            <TouchableOpacity
                              className="bg-[#FFF7E6] px-3 py-1 rounded"
                              onPress={() => setRentTenant('')}
                            >
                              <Text className="text-[#FF9500] text-sm">取消选择</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        
                        {/* 已有租客列表 */}
                        {tenants.length > 0 && (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                            {tenants.filter(t => t.id !== rentTenant).map(tenant => (
                              <TouchableOpacity
                                key={tenant.id}
                                className="px-4 py-2 rounded-lg mr-2 bg-white"
                                onPress={() => setRentTenant(tenant.id)}
                              >
                                <Text className="text-[#1D2129] text-sm">{tenant.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        )}
                        
                        {/* 新增租客按钮 */}
                        <TouchableOpacity
                          className="py-2 items-center border-t border-[#E5E6EB] mt-2"
                          onPress={() => setShowNewTenantForm(true)}
                        >
                          <Text className="text-[#165DFF] font-medium">+ 新增租客</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                {/* 备注 */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-[#1D2129] mb-2">备注</Text>
                  <TextInput
                    style={styles.remarkInput}
                    placeholder="请输入备注（选填）"
                    placeholderTextColor="#BFBFBF"
                    value={rentRemark}
                    onChangeText={setRentRemark}
                  />
                </View>
              </ScrollView>

              <View className="flex-row gap-3 p-4 border-t border-[#E5E6EB]" style={{ paddingBottom: Math.max(insets.bottom, 20) + 60 }}>
                <TouchableOpacity
                  className="flex-1 bg-[#F5F7FA] rounded-xl py-4 items-center"
                  onPress={() => setRentModalVisible(false)}
                >
                  <Text className="text-[#1D2129] font-medium">取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 rounded-xl py-4 items-center ${rentTenant && rentStartDate && rentEndDate ? 'bg-[#165DFF]' : 'bg-[#BFBFBF]'}`}
                  onPress={handleRent}
                  disabled={!rentTenant || !rentStartDate || !rentEndDate}
                >
                  <Text className="text-white font-medium text-base">确认登记</Text>
                </TouchableOpacity>
              </View>
            </View>
            </KeyboardAvoidingView>
          </View>
        )}

        {/* 订单详情弹窗 */}
        {selectedOrder && (
          <Modal visible={orderDetailModal} transparent animationType="slide">
            <TouchableOpacity
              className="flex-1 bg-black/50"
              activeOpacity={1}
              onPress={() => setOrderDetailModal(false)}
            >
              <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 pb-12">
                <View className="items-center mb-4">
                  <Text className="text-lg font-bold text-[#1D2129]">订单详情</Text>
                  <TouchableOpacity
                    onPress={() => setOrderDetailModal(false)}
                    className="absolute right-0 top-0 p-2"
                  >
                    <Text className="text-xl text-[#86909C]">×</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {(() => {
                    const orderDevice = devices.find((d) => d.id === selectedOrder.deviceId);
                    const orderTenant = tenants.find((t) => t.id === selectedOrder.tenantId);
                    const depositStatus = selectedOrder.depositReceived ? '已收取' : '未收取';
                    const depositDest = selectedOrder.depositDestination || '-';
                    const rentStatus = selectedOrder.rentReceived ? '已收取' : '未收取';
                    const rentDest = selectedOrder.rentDestination || '-';
                    return (
                      <View className="bg-[#F5F7FA] rounded-xl p-4">
                        <View className="mb-3">
                          <Text className="text-xs text-[#86909C] mb-1">设备型号</Text>
                          <Text className="text-sm text-[#1D2129]">{orderDevice?.model || '未知'}</Text>
                        </View>
                        <View className="mb-3">
                          <Text className="text-xs text-[#86909C] mb-1">设备序列号</Text>
                          <Text className="text-sm text-[#1D2129]">{orderDevice?.serialNumber || '-'}</Text>
                        </View>
                        <View className="mb-3">
                          <Text className="text-xs text-[#86909C] mb-1">租客姓名</Text>
                          <Text className="text-sm text-[#1D2129]">{orderTenant?.name || '未知'}</Text>
                        </View>
                        <View className="mb-3">
                          <Text className="text-xs text-[#86909C] mb-1">租客电话</Text>
                          <Text className="text-sm text-[#1D2129]">{orderTenant?.phone || '-'}</Text>
                        </View>
                        <View className="mb-3">
                          <Text className="text-xs text-[#86909C] mb-1">租期</Text>
                          <Text className="text-sm text-[#1D2129]">{selectedOrder.startDate} ~ {selectedOrder.endDate}</Text>
                        </View>
                        <View className="mb-3">
                          <Text className="text-xs text-[#86909C] mb-1">押金</Text>
                          <Text className="text-sm text-[#1D2129]">¥{selectedOrder.deposit || 0}</Text>
                        </View>
                        <View className="mb-3">
                          <Text className="text-xs text-[#86909C] mb-1">押金状态</Text>
                          <Text className="text-sm text-[#1D2129]">{depositStatus}</Text>
                        </View>
                        <View className="mb-3">
                          <Text className="text-xs text-[#86909C] mb-1">押金去向</Text>
                          <Text className="text-sm text-[#1D2129]">{depositDest}</Text>
                        </View>
                        <View className="mb-3">
                          <Text className="text-xs text-[#86909C] mb-1">租金</Text>
                          <Text className="text-sm text-[#1D2129]">¥{selectedOrder.totalAmount}</Text>
                        </View>
                        <View className="mb-3">
                          <Text className="text-xs text-[#86909C] mb-1">租金状态</Text>
                          <Text className="text-sm text-[#1D2129]">{rentStatus}</Text>
                        </View>
                        <View className="mb-3">
                          <Text className="text-xs text-[#86909C] mb-1">租金去向</Text>
                          <Text className="text-sm text-[#1D2129]">{rentDest}</Text>
                        </View>
                        <View className="mb-3">
                          <Text className="text-xs text-[#86909C] mb-1">订单状态</Text>
                          <Text className={`text-sm font-medium ${selectedOrder.status === ORDER_STATUS.ACTIVE ? 'text-[#00B42A]' : 'text-[#86909C]'}`}>
                            {selectedOrder.status === ORDER_STATUS.ACTIVE ? '进行中' : '已归还'}
                          </Text>
                        </View>
                        {selectedOrder.remark && (
                          <View>
                            <Text className="text-xs text-[#86909C] mb-1">备注</Text>
                            <Text className="text-sm text-[#1D2129]">{selectedOrder.remark}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })()}
                </ScrollView>
                <View className="flex-row gap-3 mt-4">
                  <TouchableOpacity
                    onPress={handleDeleteOrder}
                    className="flex-1 bg-[#FF4D4F] rounded-xl py-3 items-center"
                  >
                    <Text className="text-white font-medium">删除订单</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setOrderDetailModal(false)}
                    className="flex-1 bg-[#165DFF] rounded-xl py-3 items-center"
                  >
                    <Text className="text-white font-medium">关闭</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
        
        {/* 预约详情弹窗 */}
        <Modal visible={appointmentDetailModal} transparent animationType="slide">
          <TouchableOpacity
            className="flex-1 bg-black/50"
            activeOpacity={1}
            onPress={() => setAppointmentDetailModal(false)}
          >
            <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 pb-12">
              <View className="items-center mb-4">
                <Text className="text-lg font-bold text-[#1D2129]">
                  {selectedDeviceForAppointment?.model || '设备'} 预约详情
                </Text>
                <TouchableOpacity
                  onPress={() => setAppointmentDetailModal(false)}
                  className="absolute right-0 top-0 p-2"
                >
                  <Text className="text-xl text-[#86909C]">×</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text className="text-sm text-[#86909C] mb-3">
                  共 {appointmentOrders.length} 个预约订单
                </Text>
                {appointmentOrders.map((order, index) => {
                  const orderTenant = tenants.find((t) => t.id === order.tenantId);
                  return (
                    <TouchableOpacity
                      key={order.id}
                      onPress={() => {
                        setAppointmentDetailModal(false);
                        setEditingOrder(order);
                        setEditOrderData({
                          startDate: order.startDate,
                          endDate: order.endDate,
                          startTime: order.startTime || '10:00',
                          endTime: order.endTime || '18:00',
                          remark: order.remark || '',
                          deposit: String(order.deposit || ''),
                          depositReceived: order.depositReceived || false,
                          depositDestination: order.depositDestination || '',
                          rentReceived: order.rentReceived || false,
                          rentDestination: order.rentDestination || '',
                        });
                        setEditOrderModal(true);
                      }}
                      className="bg-[#F5F7FA] rounded-xl p-4 mb-3"
                    >
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm font-medium text-[#1D2129]">
                          预约 #{index + 1}
                        </Text>
                        <Text className="text-xs text-[#165DFF]">点击编辑</Text>
                      </View>
                      <View className="mb-2">
                        <Text className="text-xs text-[#86909C] mb-1">租客</Text>
                        <Text className="text-sm text-[#1D2129]">
                          {orderTenant?.name || '未知'} · {orderTenant?.phone || '-'}
                        </Text>
                      </View>
                      <View className="flex-row gap-4">
                        <View className="flex-1">
                          <Text className="text-xs text-[#86909C] mb-1">开始日期</Text>
                          <Text className="text-sm text-[#1D2129]">
                            {order.startDate} {order.startTime || '10:00'}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-xs text-[#86909C] mb-1">结束日期</Text>
                          <Text className="text-sm text-[#1D2129]">
                            {order.endDate} {order.endTime || '18:00'}
                          </Text>
                        </View>
                      </View>
                      {order.remark && (
                        <View className="mt-2 pt-2 border-t border-[#E5E6EB]">
                          <Text className="text-xs text-[#86909C] mb-1">备注</Text>
                          <Text className="text-sm text-[#1D2129]">{order.remark}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                onPress={() => setAppointmentDetailModal(false)}
                className="bg-[#86909C] rounded-xl py-3 items-center mt-4"
              >
                <Text className="text-white font-medium">关闭</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
        
        {/* 编辑预约订单弹窗 */}
        {editOrderModal && editingOrder && (
          <Modal visible={editOrderModal} transparent animationType="slide">
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.editModalOverlay}>
                <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>编辑预约订单</Text>
                    <TouchableOpacity onPress={() => setEditOrderModal(false)} style={styles.closeButton}>
                      <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.label}>开始时间</Text>
                    <View style={styles.dateTimeRow}>
                      <TouchableOpacity style={styles.dateInput} onPress={() => setShowStartPicker(true)}>
                        <Text style={styles.dateText}>{editOrderData.startDate || '选择日期'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.timeInput} onPress={() => setShowStartTimePicker(true)}>
                        <Text style={styles.dateText}>{editOrderData.startTime || '10:00'}</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.label}>结束时间</Text>
                    <View style={styles.dateTimeRow}>
                      <TouchableOpacity style={styles.dateInput} onPress={() => setShowEndPicker(true)}>
                        <Text style={styles.dateText}>{editOrderData.endDate || '选择日期'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.timeInput} onPress={() => setShowEndTimePicker(true)}>
                        <Text style={styles.dateText}>{editOrderData.endTime || '18:00'}</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {showStartPicker && (
                      <View style={styles.pickerContainer}>
                        <DateTimePicker value={new Date(editOrderData.startDate || new Date())} mode="date" onChange={(e, date) => {
                          setShowStartPicker(false);
                          if (date) {
                            const d = date;
                            const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                            setEditOrderData({ ...editOrderData, startDate: formatted });
                          }
                        }} />
                      </View>
                    )}
                    
                    {showEndPicker && (
                      <View style={styles.pickerContainer}>
                        <DateTimePicker value={new Date(editOrderData.endDate || new Date())} mode="date" onChange={(e, date) => {
                          setShowEndPicker(false);
                          if (date) {
                            const d = date;
                            const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                            setEditOrderData({ ...editOrderData, endDate: formatted });
                          }
                        }} />
                      </View>
                    )}
                    
                    {showStartTimePicker && (
                      <View style={styles.pickerContainer}>
                        <DateTimePicker 
                          value={new Date(`2000-01-01 ${editOrderData.startTime || '10:00'}`)} 
                          mode="time" 
                          onChange={(e, date) => {
                            setShowStartTimePicker(false);
                            if (date) {
                              const formatted = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                              setEditOrderData({ ...editOrderData, startTime: formatted });
                            }
                          }} 
                        />
                      </View>
                    )}
                    
                    {showEndTimePicker && (
                      <View style={styles.pickerContainer}>
                        <DateTimePicker 
                          value={new Date(`2000-01-01 ${editOrderData.endTime || '18:00'}`)} 
                          mode="time" 
                          onChange={(e, date) => {
                            setShowEndTimePicker(false);
                            if (date) {
                              const formatted = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                              setEditOrderData({ ...editOrderData, endTime: formatted });
                            }
                          }} 
                        />
                      </View>
                    )}
                    
                    <Text style={styles.label}>押金（元）</Text>
                    <TextInput
                      style={styles.input}
                      value={editOrderData.deposit}
                      onChangeText={(text) => setEditOrderData({ ...editOrderData, deposit: text })}
                      placeholder="输入押金"
                      keyboardType="numeric"
                    />
                    
                    <Text style={styles.label}>备注</Text>
                    <TextInput
                      style={[styles.input, styles.remarkInput]}
                      value={editOrderData.remark}
                      onChangeText={(text) => setEditOrderData({ ...editOrderData, remark: text })}
                      placeholder="输入备注"
                    />
                  </ScrollView>
                  
                  <View style={styles.buttonRow}>
                    <TouchableOpacity 
                      style={styles.deleteButton} 
                      onPress={() => {
                        if (editingOrder) {
                          handleCancelOrder(editingOrder);
                          setEditOrderModal(false);
                        }
                      }}
                    >
                      <Text style={styles.deleteButtonText}>取消订单</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.saveButton} 
                      onPress={handleSaveEditOrder}
                    >
                      <Text style={styles.saveButtonText}>保存</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
    </Screen>
  );
}
