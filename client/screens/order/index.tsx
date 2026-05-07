import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/Screen';
import { DeviceModel, TenantModel, OrderModel, Storage, DEVICE_STATUS, ORDER_STATUS } from '@/utils/storage';
import { useData } from '@/contexts/DataContext';

export default function OrderScreen() {
  const insets = useSafeAreaInsets();
  const { orders: contextOrders, devices: contextDevices, refreshKey, completeOrder, deleteOrder } = useData();
  const [orders, setOrders] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    tenantName: '',
    tenantPhone: '',
    remark: '',
    startDate: '',
    endDate: '',
    depositReceived: false,
    depositDestination: '',
    rentReceived: false,
    rentDestination: '',
  });
  const [returnConfirm, setReturnConfirm] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importData, setImportData] = useState('');
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportDataStr, setExportDataStr] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [devicesData, tenantsData, ordersData] = await Promise.all([
        DeviceModel.getAll(),
        TenantModel.getAll(),
        OrderModel.getAll(),
      ]);
      setDevices(devicesData);
      setTenants(tenantsData);
      setOrders(ordersData.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  // 监听上下文数据变化，同步订单和设备列表
  useEffect(() => {
    if (contextOrders) {
      setOrders(contextOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    }
    if (contextDevices) {
      setDevices(contextDevices);
    }
  }, [contextOrders, contextDevices, refreshKey]);

  useFocusEffect(
    useCallback(() => {
      // 仅在首次挂载时加载数据
      // 后续数据更新由 useEffect 监听 contextOrders 处理
    }, [])
  );

  const filteredOrders = (statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === statusFilter)
  ).filter(order => {
    // 时间段筛选
    if (dateRangeStart) {
      const orderDate = new Date(order.startDate);
      const startDate = new Date(dateRangeStart);
      if (orderDate < startDate) return false;
    }
    if (dateRangeEnd) {
      const orderDate = new Date(order.startDate);
      const endDate = new Date(dateRangeEnd);
      if (orderDate > endDate) return false;
    }
    return true;
  }).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleViewDetail = (order: any) => {
    setSelectedOrder(order);
    setDetailModalVisible(true);
  };

  const handleEditOrder = (order: any) => {
    setSelectedOrder(order);
    setEditForm({
      tenantName: order.tenantName,
      tenantPhone: order.tenantPhone,
      remark: order.remark || '',
      startDate: order.startDate,
      endDate: order.endDate,
      depositReceived: order.depositReceived || false,
      depositDestination: order.depositDestination || '',
      rentReceived: order.rentReceived || false,
      rentDestination: order.rentDestination || '',
    });
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    try {
      await OrderModel.update(selectedOrder.id, editForm);
      setEditModalVisible(false);
      loadData();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const handleComplete = async (orderId: string) => {
    setSelectedOrder(orders.find(o => o.id === orderId));
    setReturnConfirm(true);
  };

  const confirmReturn = async () => {
    if (!selectedOrder) return;
    try {
      setLoading(true);
      // 使用 DataContext 的 completeOrder 方法，确保所有页面同步更新
      await completeOrder(selectedOrder.id);
      setReturnConfirm(false);
      setSelectedOrder(null);
      setLoading(false);
    } catch (error) {
      console.error('Error completing order:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '进行中';
      case 'completed': return '已归还';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const formatCreatedAt = (createdAt: string) => {
    try {
      const date = new Date(createdAt);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hour}:${minute}`;
    } catch {
      return createdAt;
    }
  };

  const handleExportData = async () => {
    try {
      const devices = await DeviceModel.getAll();
      const tenants = await TenantModel.getAll();
      const orders = await OrderModel.getAll();
      
      // 排除图片数据以减小体积，导入后需重新选择图片
      const devicesForExport = devices.map(d => ({
        ...d,
        imageUri: d.imageUri && !d.imageUri.startsWith('data:') ? d.imageUri : null,
      }));
      const tenantsForExport = tenants.map(t => ({
        ...t,
        photoUri: t.photoUri && !t.photoUri.startsWith('data:') ? t.photoUri : null,
      }));
      
      const exportData = {
        devices: devicesForExport,
        tenants: tenantsForExport,
        orders,
        exportTime: new Date().toISOString(),
      };
      const dataStr = JSON.stringify(exportData, null, 2);
      setExportDataStr(dataStr);
      setExportModalVisible(true);
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('错误', '导出数据失败');
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(exportDataStr);
      Alert.alert('成功', '数据已复制到剪贴板');
      setExportModalVisible(false);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('错误', '复制失败');
    }
  };

  const handleImportData = async () => {
    if (!importData.trim()) {
      Alert.alert('错误', '请输入要导入的数据');
      return;
    }
    try {
      const data = JSON.parse(importData);
      if (!data.devices || !data.tenants || !data.orders) {
        Alert.alert('错误', '数据格式不正确');
        return;
      }
      
      // 直接用导入数据覆盖，不保留本地数据（避免重复）
      await Storage.set('camera_rental_devices', data.devices);
      await Storage.set('camera_rental_tenants', data.tenants);
      await Storage.set('camera_rental_orders', data.orders);
      
      setImportModalVisible(false);
      setImportData('');
      loadData();
      Alert.alert('成功', `已导入 ${data.devices.length} 个设备、${data.tenants.length} 个租客、${data.orders.length} 条订单`);
    } catch (error) {
      console.error('Error importing data:', error);
      Alert.alert('错误', '数据格式不正确或解析失败');
    }
  };

  return (
    <Screen>
      <View className="flex-1 bg-gray-50">
        {/* 筛选和导入导出按钮 */}
        <View className="bg-gray-50 pt-2 pb-3 px-4">
          <View className="flex-row gap-2">
            <TouchableOpacity
              className={`flex-1 py-2 px-3 rounded-lg ${statusFilter === 'all' ? 'bg-blue-500' : 'bg-white border border-gray-200'}`}
              onPress={() => setStatusFilter('all')}
            >
              <Text className={`text-center text-sm ${statusFilter === 'all' ? 'text-white' : 'text-gray-600'}`}>
                全部
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-2 px-3 rounded-lg ${statusFilter === 'active' ? 'bg-blue-500' : 'bg-white border border-gray-200'}`}
              onPress={() => setStatusFilter('active')}
            >
              <Text className={`text-center text-sm ${statusFilter === 'active' ? 'text-white' : 'text-gray-600'}`}>
                进行中
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-2 px-3 rounded-lg ${statusFilter === 'completed' ? 'bg-blue-500' : 'bg-white border border-gray-200'}`}
              onPress={() => setStatusFilter('completed')}
            >
              <Text className={`text-center text-sm ${statusFilter === 'completed' ? 'text-white' : 'text-gray-600'}`}>
                已归还
              </Text>
            </TouchableOpacity>
          </View>
          
          <View className="flex-row gap-2 mt-2">
            <TouchableOpacity
              className="flex-1 py-2 px-3 rounded-lg bg-white border border-gray-200"
              onPress={handleExportData}
            >
              <Text className="text-center text-sm text-blue-500">导出数据</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-2 px-3 rounded-lg bg-white border border-gray-200"
              onPress={() => setImportModalVisible(true)}
            >
              <Text className="text-center text-sm text-blue-500">导入数据</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 订单列表 */}
        <ScrollView className="flex-1 px-4" style={{ paddingBottom: Math.max(insets.bottom, 20) + 60 }}>
          {filteredOrders.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Text className="text-gray-400 text-base">暂无订单</Text>
            </View>
          ) : (
            filteredOrders.map((order, idx) => {
              const device = devices.find(d => d.id === order.deviceId);
              return (
                <View key={order.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                      <Text className="text-gray-900 font-bold text-base">
                        {device?.model || '未知设备'}
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1">
                        序列号: {device?.serialNumber || '-'}
                      </Text>
                      <Text className="text-gray-400 text-xs mt-1">
                        创建时间: {formatCreatedAt(order.createdAt)}
                      </Text>
                    </View>
                    <View className={`px-2 py-1 rounded ${getStatusColor(order.status)}`}>
                      <Text className="text-white text-xs">{getStatusText(order.status)}</Text>
                    </View>
                  </View>
                  
                  <View className="border-t border-gray-100 pt-2 mt-2">
                    <Text className="text-gray-600 text-sm">
                      租客: {order.tenantName} {order.tenantPhone && `(${order.tenantPhone})`}
                    </Text>
                    <Text className="text-gray-600 text-sm mt-1">
                      租期: {order.startDate} - {order.endDate}
                    </Text>
                    <Text className="text-gray-600 text-sm mt-1">
                      押金: {device?.deposit || 0}元 
                      {order.depositReceived ? (
                        <Text className="text-green-500"> (已收) {order.depositDestination && `→ ${order.depositDestination}`}</Text>
                      ) : (
                        <Text className="text-orange-500"> (未收)</Text>
                      )}
                    </Text>
                    <Text className="text-gray-600 text-sm mt-1">
                      租金: {order.totalRent || 0}元 
                      {order.rentReceived ? (
                        <Text className="text-green-500"> (已收) {order.rentDestination && `→ ${order.rentDestination}`}</Text>
                      ) : (
                        <Text className="text-orange-500"> (未收)</Text>
                      )}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                    <TouchableOpacity
                      className="px-3 py-2 bg-gray-100 rounded"
                      onPress={() => handleViewDetail(order)}
                    >
                      <Text className="text-gray-600 text-sm">详情</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="px-3 py-2 bg-blue-500 rounded"
                      onPress={() => handleEditOrder(order)}
                    >
                      <Text className="text-white text-sm">编辑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="px-3 py-2 bg-red-500 rounded"
                      onPress={() => {
                        console.log('删除按钮被点击，order.id:', order.id);
                        setDeleteOrderId(order.id);
                        setDeleteConfirm(true);
                      }}
                    >
                      <Text className="text-white text-sm">删除</Text>
                    </TouchableOpacity>
                    {order.status === 'active' && (
                      <TouchableOpacity
                        className="px-3 py-2 bg-green-500 rounded"
                        onPress={() => handleComplete(order.id)}
                      >
                        <Text className="text-white text-sm">确认归还</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {/* 最后一个订单添加底部间距，避免被导航栏遮挡 */}
                  {idx === filteredOrders.length - 1 && <View className="h-20" />}
                </View>
              );
            })
          )}
        </ScrollView>

        {/* 订单详情弹窗 */}
        {selectedOrder && detailModalVisible && (
          <Modal visible={detailModalVisible} transparent animationType="slide">
            <View className="flex-1 bg-black/50 justify-end">
              <View className="bg-white rounded-t-2xl p-5 max-h-[85vh]">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-lg font-bold text-gray-900">订单详情</Text>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                    <Text className="text-gray-500 text-xl">X</Text>
                  </TouchableOpacity>
                </View>
                
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View className="bg-gray-50 rounded-xl p-4 mb-4">
                    <Text className="text-gray-500 text-sm">设备信息</Text>
                    <Text className="text-gray-900 font-bold mt-1">
                      {devices.find(d => d.id === selectedOrder.deviceId)?.model || '未知'}
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1">
                      序列号: {devices.find(d => d.id === selectedOrder.deviceId)?.serialNumber || '-'}
                    </Text>
                    <Text className="text-gray-400 text-xs mt-1">
                      创建时间: {formatCreatedAt(selectedOrder.createdAt)}
                    </Text>
                  </View>
                  
                  <View className="bg-gray-50 rounded-xl p-4 mb-4">
                    <Text className="text-gray-500 text-sm">租客信息</Text>
                    <Text className="text-gray-900 font-bold mt-1">{selectedOrder.tenantName}</Text>
                    {selectedOrder.tenantPhone && (
                      <Text className="text-gray-500 text-sm mt-1">{selectedOrder.tenantPhone}</Text>
                    )}
                  </View>
                  
                  <View className="bg-gray-50 rounded-xl p-4 mb-4">
                    <Text className="text-gray-500 text-sm">租期信息</Text>
                    <Text className="text-gray-900 mt-1">
                      {selectedOrder.startDate} - {selectedOrder.endDate}
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1">
                      押金: {devices.find(d => d.id === selectedOrder.deviceId)?.deposit || 0}元
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1">
                      租金: {selectedOrder.totalRent || 0}元
                    </Text>
                  </View>
                  
                  <View className="bg-gray-50 rounded-xl p-4 mb-4">
                    <Text className="text-gray-500 text-sm">押金状态</Text>
                    <View className="flex-row items-center mt-2">
                      <View className={`w-3 h-3 rounded-full mr-2 ${selectedOrder.depositReceived ? 'bg-green-500' : 'bg-orange-500'}`} />
                      <Text className="text-gray-900">
                        {selectedOrder.depositReceived ? '已收取' : '未收取'}
                      </Text>
                    </View>
                    {selectedOrder.depositReceived && selectedOrder.depositDestination && (
                      <Text className="text-green-600 text-sm mt-1">
                        去向: {selectedOrder.depositDestination}
                      </Text>
                    )}
                  </View>
                  
                  <View className="bg-gray-50 rounded-xl p-4 mb-4">
                    <Text className="text-gray-500 text-sm">租金状态</Text>
                    <View className="flex-row items-center mt-2">
                      <View className={`w-3 h-3 rounded-full mr-2 ${selectedOrder.rentReceived ? 'bg-green-500' : 'bg-orange-500'}`} />
                      <Text className="text-gray-900">
                        {selectedOrder.rentReceived ? '已收取' : '未收取'}
                      </Text>
                    </View>
                    {selectedOrder.rentReceived && selectedOrder.rentDestination && (
                      <Text className="text-green-600 text-sm mt-1">
                        去向: {selectedOrder.rentDestination}
                      </Text>
                    )}
                  </View>
                  
                  {selectedOrder.remark && (
                    <View className="bg-gray-50 rounded-xl p-4 mb-4">
                      <Text className="text-gray-500 text-sm">备注</Text>
                      <Text className="text-gray-900 mt-1">{selectedOrder.remark}</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}

        {/* 编辑订单弹窗 */}
        <Modal visible={editModalVisible} transparent animationType="slide">
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
            className="flex-1"
          >
            <TouchableWithoutFeedback onPress={() => setEditModalVisible(false)}>
              <View className="flex-1 bg-black/50 justify-end">
                <TouchableWithoutFeedback>
                  <View className="bg-white rounded-t-2xl p-5 max-h-[85vh]">
                    <View className="flex-row justify-between items-center mb-4">
                      <Text className="text-lg font-bold text-gray-900">编辑订单</Text>
                      <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                        <Text className="text-gray-500 text-xl">X</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                      <Text className="text-gray-500 text-sm mb-1">租客姓名</Text>
                      <TextInput
                        className="bg-gray-100 rounded-lg px-4 py-3 mb-3 text-gray-900"
                        value={editForm.tenantName}
                        onChangeText={(text) => setEditForm({...editForm, tenantName: text})}
                        placeholder="请输入租客姓名"
                      />
                      
                      <Text className="text-gray-500 text-sm mb-1">租客电话</Text>
                      <TextInput
                        className="bg-gray-100 rounded-lg px-4 py-3 mb-3 text-gray-900"
                        value={editForm.tenantPhone}
                        onChangeText={(text) => setEditForm({...editForm, tenantPhone: text})}
                        placeholder="请输入租客电话"
                        keyboardType="phone-pad"
                      />
                      
                      <Text className="text-gray-500 text-sm mb-1">备注</Text>
                      <TextInput
                        className="bg-gray-100 rounded-lg px-4 py-3 mb-3 text-gray-900"
                        value={editForm.remark}
                        onChangeText={(text) => setEditForm({...editForm, remark: text})}
                        placeholder="备注信息"
                        style={{ backgroundColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, color: '#1D2129', fontSize: 16, minHeight: 48 }}
                      />
                      
                      <View className="flex-row items-center mb-3 p-3 bg-green-50 rounded-lg">
                        <TouchableOpacity
                          className={`w-5 h-5 rounded mr-3 ${editForm.depositReceived ? 'bg-green-500' : 'bg-gray-300'}`}
                          onPress={() => setEditForm({...editForm, depositReceived: !editForm.depositReceived})}
                        />
                        <Text className="text-gray-900 flex-1">押金已收取</Text>
                      </View>
                      
                      {editForm.depositReceived && (
                        <>
                          <Text className="text-gray-500 text-sm mb-1">押金去向</Text>
                          <TextInput
                            className="bg-gray-100 rounded-lg px-4 py-3 mb-3 text-gray-900"
                            value={editForm.depositDestination}
                            onChangeText={(text) => setEditForm({...editForm, depositDestination: text})}
                            placeholder="如: 银行卡/微信/支付宝"
                          />
                        </>
                      )}
                      
                      <View className="flex-row items-center mb-3 p-3 bg-blue-50 rounded-lg">
                        <TouchableOpacity
                          className={`w-5 h-5 rounded mr-3 ${editForm.rentReceived ? 'bg-green-500' : 'bg-gray-300'}`}
                          onPress={() => setEditForm({...editForm, rentReceived: !editForm.rentReceived})}
                        />
                        <Text className="text-gray-900 flex-1">租金已收取</Text>
                      </View>
                      
                      {editForm.rentReceived && (
                        <>
                          <Text className="text-gray-500 text-sm mb-1">租金去向</Text>
                          <TextInput
                            className="bg-gray-100 rounded-lg px-4 py-3 mb-3 text-gray-900"
                            value={editForm.rentDestination}
                            onChangeText={(text) => setEditForm({...editForm, rentDestination: text})}
                            placeholder="如: 银行卡/微信/支付宝"
                          />
                        </>
                      )}
                    </ScrollView>
                    
                    <TouchableOpacity
                      className="bg-blue-500 rounded-xl py-4 mt-4"
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

        {/* 确认归还弹窗 */}
        {returnConfirm && selectedOrder && (
          <Modal visible={true} transparent animationType="fade">
            <View className="flex-1 bg-black/50 justify-center items-center px-6">
              <View className="bg-white rounded-2xl p-6 w-full">
                <Text className="text-lg font-bold text-gray-900 text-center mb-2">确认归还</Text>
                <Text className="text-gray-600 text-center mb-4">
                  确认以下订单已完成归还？
                </Text>
                
                <View className="bg-gray-50 rounded-xl p-3 mb-4">
                  <Text className="text-gray-900 font-medium">
                    {devices.find(d => d.id === selectedOrder.deviceId)?.model}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    租客: {selectedOrder.tenantName}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    租期: {selectedOrder.startDate} - {selectedOrder.endDate}
                  </Text>
                </View>
                
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 py-3 bg-gray-200 rounded-xl"
                    onPress={() => {
                      setReturnConfirm(false);
                      setSelectedOrder(null);
                    }}
                  >
                    <Text className="text-gray-700 text-center font-medium">取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 py-3 bg-green-500 rounded-xl"
                    onPress={confirmReturn}
                  >
                    <Text className="text-white text-center font-medium">确认</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* 确认删除弹窗 */}
        {deleteConfirm && deleteOrderId && (
          <Modal visible={true} transparent animationType="fade">
            <View className="flex-1 bg-black/50 justify-center items-center px-6">
              <View className="bg-white rounded-2xl p-6 w-full">
                <Text className="text-lg font-bold text-gray-900 text-center mb-2">确认删除</Text>
                <Text className="text-gray-600 text-center mb-4">
                  确定要删除此订单吗？此操作不可恢复。
                </Text>
                
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 py-3 bg-gray-200 rounded-xl"
                    onPress={() => {
                      setDeleteConfirm(false);
                      setDeleteOrderId(null);
                    }}
                  >
                    <Text className="text-gray-700 text-center font-medium">取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 py-3 bg-red-500 rounded-xl"
                    onPress={async () => {
                      if (deleteOrderId) {
                        await deleteOrder(deleteOrderId);
                        setDeleteConfirm(false);
                        setDeleteOrderId(null);
                      }
                    }}
                  >
                    <Text className="text-white text-center font-medium">删除</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* 导入数据弹窗 */}
        <Modal visible={importModalVisible} transparent animationType="slide">
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
            className="flex-1"
          >
            <TouchableWithoutFeedback onPress={() => setImportModalVisible(false)}>
              <View className="flex-1 bg-black/50 justify-end">
                <TouchableWithoutFeedback>
                  <View className="bg-white rounded-t-2xl p-5 max-h-[85vh]">
                    <View className="flex-row justify-between items-center mb-4">
                      <Text className="text-lg font-bold text-gray-900">导入数据</Text>
                      <TouchableOpacity onPress={() => {
                        setImportModalVisible(false);
                        setImportData('');
                      }}>
                        <Text className="text-gray-500 text-xl">X</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                      <Text className="text-gray-600 text-sm mb-2">
                        请粘贴从其他设备导出的JSON数据
                      </Text>
                      <TextInput
                        className="bg-gray-100 rounded-lg px-4 py-3 mb-4 text-gray-900"
                        value={importData}
                        onChangeText={setImportData}
                        placeholder="粘贴JSON数据..."
                        style={{ backgroundColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, color: '#1D2129', fontSize: 14, minHeight: 160 }}
                      />
                    </ScrollView>
                    
                    <TouchableOpacity
                      className="bg-blue-500 rounded-xl py-4"
                      onPress={handleImportData}
                    >
                      <Text className="text-white text-center font-bold">确认导入</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>

        {/* 导出数据弹窗 */}
        <Modal visible={exportModalVisible} transparent animationType="slide">
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
            className="flex-1"
          >
            <TouchableWithoutFeedback onPress={() => setExportModalVisible(false)}>
              <View className="flex-1 bg-black/50 justify-end">
                <TouchableWithoutFeedback>
                  <View className="bg-white rounded-t-2xl p-5 max-h-[85vh]">
                    <View className="flex-row justify-between items-center mb-4">
                      <Text className="text-lg font-bold text-gray-900">导出数据</Text>
                      <TouchableOpacity onPress={() => setExportModalVisible(false)}>
                        <Text className="text-gray-500 text-xl">X</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <Text className="text-gray-600 text-sm mb-2">
                      提示：图片数据较大已自动排除，导入后需重新选择图片
                    </Text>
                    
                    <View className="bg-gray-100 rounded-lg p-3 max-h-[40vh] mb-4">
                      <TextInput
                        value={exportDataStr}
                        editable={false}
                        style={{ fontFamily: 'monospace', fontSize: 10, color: '#666', backgroundColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, minHeight: 200 }}
                      />
                    </View>
                    
                    <TouchableOpacity
                      className="bg-blue-500 rounded-xl py-4"
                      onPress={handleCopyToClipboard}
                    >
                      <Text className="text-white text-center font-bold">复制数据</Text>
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
