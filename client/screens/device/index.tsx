/**
 * 设备管理页面
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  DeviceModel,
  Device,
  DEVICE_STATUS,
  MACHINE_CONDITIONS,
  MACHINE_CONDITION_LABELS,
  MachineCondition,
  OrderModel,
  Order,
} from '@/utils/storage';
import { useData } from '@/contexts/DataContext';

export default function DeviceScreen() {
  const insets = useSafeAreaInsets();
  const { devices: contextDevices, orders: contextOrders, refreshKey, refreshData } = useData();
  
  const [devices, setDevices] = useState<Device[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [orderDetailModalVisible, setOrderDetailModalVisible] = useState(false);
  const [selectedDeviceForOrder, setSelectedDeviceForOrder] = useState<Device | null>(null);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  
  // 表单字段
  const [formSerialNumber, setFormSerialNumber] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formDailyRate, setFormDailyRate] = useState('');
  const [formDeposit, setFormDeposit] = useState('');
  const [formAccessories, setFormAccessories] = useState('');
  const [formCondition, setFormCondition] = useState<MachineCondition>(MACHINE_CONDITIONS.NEW);
  const [formImageUri, setFormImageUri] = useState<string | null>(null);
  
  // 确认删除
  const [deleteConfirm, setDeleteConfirm] = useState<Device | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDevices = useCallback(async () => {
    const data = await DeviceModel.getAll();
    // 根据订单重新计算设备状态
    const ordersData = await OrderModel.getAll();
    const updatedDevices = data.map(device => {
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
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);
  
  // 监听上下文设备变化，自动同步
  useEffect(() => {
    if (contextDevices.length > 0) {
      setDevices(contextDevices);
    }
  }, [contextDevices, refreshKey]);
  
  // 监听上下文订单变化，自动同步
  useEffect(() => {
    setOrders(contextOrders);
  }, [contextOrders, refreshKey]);

  const openAddModal = (device?: Device) => {
    if (device) {
      setEditingDevice(device);
      setFormSerialNumber(device.serialNumber || '');
      setFormModel(device.model);
      setFormDailyRate(device.dailyRate.toString());
      setFormDeposit(device.deposit.toString());
      setFormAccessories(device.accessories || '');
      setFormCondition(device.condition || MACHINE_CONDITIONS.NEW);
      setFormImageUri(device.imageUri || null);
    } else {
      setEditingDevice(null);
      setFormSerialNumber('');
      setFormModel('');
      setFormDailyRate('');
      setFormDeposit('');
      setFormAccessories('');
      setFormCondition(MACHINE_CONDITIONS.NEW);
      setFormImageUri(null);
    }
    setAddModalVisible(true);
  };

  const openDetailModal = (device: Device) => {
    setSelectedDevice(device);
    setDetailModalVisible(true);
  };

  const handleSave = async () => {
    if (!formModel || !formDailyRate || !formDeposit) {
      Alert.alert('提示', '请填写必填项（机型、日租金、押金）');
      return;
    }

    const dailyRate = parseFloat(formDailyRate);
    const deposit = parseFloat(formDeposit);

    if (isNaN(dailyRate) || isNaN(deposit)) {
      Alert.alert('提示', '请输入有效的数字');
      return;
    }

    try {
      if (editingDevice) {
        await DeviceModel.update(editingDevice.id, {
          serialNumber: formSerialNumber,
          model: formModel,
          dailyRate,
          deposit,
          accessories: formAccessories,
          condition: formCondition,
          imageUri: formImageUri,
        });
        Alert.alert('成功', '设备更新成功');
      } else {
        await DeviceModel.create({
          serialNumber: formSerialNumber,
          model: formModel,
          dailyRate,
          deposit,
          accessories: formAccessories,
          condition: formCondition,
          imageUri: formImageUri,
        });
        Alert.alert('成功', '设备添加成功');
      }
      setAddModalVisible(false);
      loadDevices();
    } catch (error) {
      Alert.alert('错误', '保存失败，请重试');
    }
  };

  const handleDelete = (device: Device) => {
    // 使用内嵌确认对话框，避免Web上Alert.alert兼容性问题
    setDeleteConfirm(device);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await DeviceModel.delete(deleteConfirm.id);
      setDeleteConfirm(null);
      loadDevices();
    } catch (error) {
      console.error('删除失败:', error);
    }
    setIsDeleting(false);
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('提示', '需要相册权限才能添加图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.4,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          // 使用 Base64
          setFormImageUri('data:image/jpeg;base64,' + asset.base64);
        } else if (asset.uri) {
          // 降级使用 URI
          setFormImageUri(asset.uri);
        }
      }
    } catch (error) {
      console.log('图片选择失败:', error);
      Alert.alert('提示', '图片选择失败');
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case DEVICE_STATUS.AVAILABLE:
        return { bg: '#E8F5E9', text: '#2E7D32' };
      case DEVICE_STATUS.RENTED:
        return { bg: '#FFF3E0', text: '#E65100' };
      case DEVICE_STATUS.MAINTENANCE:
        return { bg: '#FFEBEE', text: '#C62828' };
      default:
        return { bg: '#ECEFF1', text: '#546E7A' };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case DEVICE_STATUS.AVAILABLE:
        return '空闲';
      case DEVICE_STATUS.RENTED:
        return '租用中';
      case DEVICE_STATUS.MAINTENANCE:
        return '维护中';
      default:
        return '未知';
    }
  };

  // 获取设备的所有订单（包括历史订单）
  const getDeviceOrders = (deviceId: string): Order[] => {
    return orders.filter(order => order.deviceId === deviceId);
  };

  // 获取设备的有效预约订单
  const getDeviceActiveOrders = (deviceId: string): Order[] => {
    const now = new Date();
    return orders.filter(order => 
      order.deviceId === deviceId && 
      order.status === 'active' &&
      new Date(order.endDate) >= now
    );
  };

  // 检查设备是否有预约
  const hasActiveOrders = (deviceId: string): boolean => {
    return getDeviceActiveOrders(deviceId).length > 0;
  };

  // 打开预约详情弹窗
  const openOrderDetailModal = (device: Device) => {
    setSelectedDeviceForOrder(device);
    setOrderDetailModalVisible(true);
  };

  const getConditionStyle = (condition: string) => {
    switch (condition) {
      case MACHINE_CONDITIONS.NEW:
        return { bg: '#E3F2FD', text: '#1565C0' };
      case MACHINE_CONDITIONS.EXCELLENT:
        return { bg: 'rgba(0, 180, 42, 0.1)', text: '#00B42A' };
      case MACHINE_CONDITIONS.GOOD:
        return { bg: 'rgba(255, 166, 0, 0.1)', text: '#FFA600' };
      case MACHINE_CONDITIONS.FAIR:
        return { bg: 'rgba(255, 125, 0, 0.1)', text: '#FF7D00' };
      default:
        return { bg: 'rgba(245, 60, 60, 0.1)', text: '#F53F3F' };
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        {/* 顶部导航 */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>设备管理</Text>
            <TouchableOpacity
              onPress={() => openAddModal()}
              style={styles.addButton}
              activeOpacity={0.7}
            >
              <Text style={styles.addButtonText}>新增设备</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 20 }}>
          {devices.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>暂无设备，请点击右上角添加</Text>
            </View>
          ) : (
            devices.map((device) => {
              const statusStyle = getStatusStyle(device.status);
              const conditionStyle = getConditionStyle(device.condition);
              return (
                <View key={device.id} style={styles.deviceCard}>
                  {/* 左上区域 - 可点击查看详情 */}
                  <TouchableOpacity
                    onPress={() => openDetailModal(device)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.deviceRow}>
                      {device.imageUri ? (
                        <Image source={{ uri: device.imageUri }} style={styles.deviceImage} />
                      ) : (
                        <View style={styles.deviceImagePlaceholder}>
                          <Text style={styles.imagePlaceholderText}>[图片]</Text>
                        </View>
                      )}
                      <View style={styles.deviceInfo}>
                        <View style={styles.deviceNameRow}>
                          <Text style={styles.deviceName}>{device.model}</Text>
                          {device.serialNumber ? (
                            <Text style={styles.serialNumber}>SN: {device.serialNumber}</Text>
                          ) : null}
                        </View>
                        <Text style={styles.devicePrice}>
                          ¥{device.dailyRate}/天 · 押金 ¥{device.deposit}
                        </Text>
                        <View style={styles.tagRow}>
                          {hasActiveOrders(device.id) ? (
                            <TouchableOpacity
                              onPress={() => openOrderDetailModal(device)}
                              style={[styles.tag, { backgroundColor: '#FFF7E6' }]}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.tagText, { color: '#FF9500' }]}>
                                有预约
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={[styles.tag, { backgroundColor: statusStyle.bg }]}>
                              <Text style={[styles.tagText, { color: statusStyle.text }]}>
                                {getStatusText(device.status)}
                              </Text>
                            </View>
                          )}
                          <View style={[styles.tag, { backgroundColor: conditionStyle.bg }]}>
                            <Text style={[styles.tagText, { color: conditionStyle.text }]}>
                              {MACHINE_CONDITION_LABELS[device.condition]}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                  
                  {/* 底部操作按钮 - 独立区域 */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      onPress={() => openOrderDetailModal(device)}
                      style={styles.historyButton}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.historyButtonText}>历史订单</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => openAddModal(device)}
                      style={styles.editButton}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.editButtonText}>编辑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(device)}
                      style={styles.deleteButton}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.deleteButtonText}>删除</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* 新增/编辑设备弹窗 */}
        {addModalVisible && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop} 
              onPress={() => setAddModalVisible(false)} 
              activeOpacity={1} 
            />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1, justifyContent: 'flex-end' }}
            >
              <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) + 60 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingDevice ? '编辑设备' : '新增设备'}
                </Text>
                <TouchableOpacity onPress={() => setAddModalVisible(false)} style={{ padding: 4 }}>
                  <Text style={styles.closeButton}>×</Text>
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ padding: 16, flexGrow: 1 }}
                style={{ maxHeight: 400 }}
              >
                {/* 设备图片 */}
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
                    {formImageUri ? (
                      <Image source={{ uri: formImageUri }} style={styles.imagePreview} />
                    ) : (
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#9ca3af', fontSize: 24 }}>+</Text>
                        <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>添加图片</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>序列号（选填）</Text>
                <TextInput
                  value={formSerialNumber}
                  onChangeText={setFormSerialNumber}
                  placeholder="请输入设备序列号"
                  style={styles.input}
                  placeholderTextColor="#999"
                />

                <Text style={styles.label}>机型 *</Text>
                <TextInput
                  value={formModel}
                  onChangeText={setFormModel}
                  placeholder="请输入设备型号"
                  style={styles.input}
                  placeholderTextColor="#999"
                />

                <Text style={styles.label}>日租金（元）*</Text>
                <TextInput
                  value={formDailyRate}
                  onChangeText={setFormDailyRate}
                  placeholder="请输入日租金"
                  keyboardType="numeric"
                  style={styles.input}
                  placeholderTextColor="#999"
                />

                <Text style={styles.label}>押金（元）*</Text>
                <TextInput
                  value={formDeposit}
                  onChangeText={setFormDeposit}
                  placeholder="请输入押金金额"
                  keyboardType="numeric"
                  style={styles.input}
                  placeholderTextColor="#999"
                />

                <Text style={styles.label}>机器状态</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {Object.entries(MACHINE_CONDITIONS).map(([key, value]) => {
                    const isSelected = formCondition === value;
                    const style = getConditionStyle(value as MachineCondition);
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={() => setFormCondition(value as MachineCondition)}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          alignItems: 'center',
                          backgroundColor: isSelected ? style.text : style.bg,
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '500',
                            color: isSelected ? '#fff' : style.text,
                          }}
                        >
                          {MACHINE_CONDITION_LABELS[value as MachineCondition]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.label}>配件备注</Text>
                <TextInput
                  value={formAccessories}
                  onChangeText={setFormAccessories}
                  placeholder="请输入配件备注（如电池、镜头等）"
                  style={[styles.input, { minHeight: 48 }]}
                  placeholderTextColor="#999"
                />
              </ScrollView>

              <TouchableOpacity
                onPress={handleSave}
                style={styles.saveButton}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
            </KeyboardAvoidingView>
          </View>
        )}

        {/* 设备详情弹窗 */}
        {detailModalVisible && selectedDevice && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop} 
              onPress={() => setDetailModalVisible(false)} 
              activeOpacity={1} 
            />
            <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>设备详情</Text>
                <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                  <Text style={styles.closeButton}>X</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                {selectedDevice.imageUri ? (
                  <Image source={{ uri: selectedDevice.imageUri }} style={styles.detailImage} />
                ) : (
                  <View style={styles.detailImagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>暂无图片</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>机型</Text>
                  <Text style={styles.detailValue}>{selectedDevice.model}</Text>
                </View>

                {selectedDevice.serialNumber ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>序列号</Text>
                    <Text style={styles.detailValue}>{selectedDevice.serialNumber}</Text>
                  </View>
                ) : null}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>日租金</Text>
                  <Text style={styles.detailValue}>¥{selectedDevice.dailyRate}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>押金</Text>
                  <Text style={styles.detailValue}>¥{selectedDevice.deposit}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>机器状态</Text>
                  <Text style={styles.detailValue}>
                    {MACHINE_CONDITION_LABELS[selectedDevice.condition]}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>配件备注</Text>
                  <Text style={styles.detailValue}>
                    {selectedDevice.accessories || '无'}
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        )}


        {/* 预约订单详情弹窗 */}
        {orderDetailModalVisible && selectedDeviceForOrder && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              onPress={() => setOrderDetailModalVisible(false)}
              activeOpacity={1}
            />
            <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>历史订单</Text>
                <TouchableOpacity onPress={() => setOrderDetailModalVisible(false)}>
                  <Text style={styles.closeButton}>X</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>设备型号</Text>
                  <Text style={styles.detailValue}>{selectedDeviceForOrder.model}</Text>
                </View>
                {selectedDeviceForOrder.serialNumber && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>序列号</Text>
                    <Text style={styles.detailValue}>{selectedDeviceForOrder.serialNumber}</Text>
                  </View>
                )}

                <View style={styles.orderListSection}>
                  {(() => {
                    const deviceOrders = getDeviceActiveOrders(selectedDeviceForOrder.id).sort((a, b) => 
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );
                    if (deviceOrders.length === 0) {
                      return (
                        <Text style={styles.noOrderText}>暂无预约订单</Text>
                      );
                    }
                    return deviceOrders.map((order, index) => (
                      <View key={order.id} style={styles.orderItem}>
                        <View style={styles.orderItemHeader}>
                          <Text style={styles.orderIndex}>订单 {index + 1}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>租客姓名</Text>
                          <Text style={styles.detailValue}>{order.tenantName}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>联系电话</Text>
                          <Text style={styles.detailValue}>{order.tenantPhone}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>开始时间</Text>
                          <Text style={styles.detailValue}>
                            {order.startDate ? new Date(order.startDate).toLocaleString('zh-CN') : '-'}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>结束时间</Text>
                          <Text style={styles.detailValue}>
                            {order.endDate ? new Date(order.endDate).toLocaleString('zh-CN') : '-'}
                          </Text>
                        </View>
                        {order.remark && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>备注</Text>
                            <Text style={styles.detailValue}>{order.remark}</Text>
                          </View>
                        )}
                      </View>
                    ));
                  })()}
                </View>
              </ScrollView>
            </View>
          </View>
        )}

        {/* 删除确认对话框 */}
        {deleteConfirm && (
          <View style={styles.deleteOverlay}>
            <View style={styles.deleteDialog}>
              <Text style={styles.deleteTitle}>确认删除</Text>
              <Text style={styles.deleteMessage}>
                确定要删除设备「{deleteConfirm.model}」吗？{'\n'}此操作不可撤销。
              </Text>
              <View style={styles.deleteButtons}>
                <TouchableOpacity
                  style={styles.deleteCancelBtn}
                  onPress={() => setDeleteConfirm(null)}
                >
                  <Text style={styles.deleteCancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteConfirmBtn, isDeleting && styles.deleteBtnDisabled]}
                  onPress={confirmDelete}
                  disabled={isDeleting}
                >
                  <Text style={styles.deleteConfirmText}>
                    {isDeleting ? '删除中...' : '删除'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  addButton: {
    backgroundColor: '#165DFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  deviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  deviceImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    color: '#CCC',
    fontSize: 12,
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  serialNumber: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  devicePrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  editButton: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 48,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#666',
    fontSize: 12,
  },
  historyButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 48,
    alignItems: 'center',
  },
  historyButtonText: {
    color: '#1565C0',
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: '#FFEBEB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 48,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#F53F3F',
    fontSize: 12,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  closeButton: {
    fontSize: 20,
    color: '#999',
    padding: 4,
  },
  imagePickerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  pickedImage: {
    width: '100%',
    height: '100%',
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
  },
  imagePlaceholderIcon: {
    fontSize: 32,
    color: '#CCC',
  },
  imagePlaceholderText2: {
    color: '#999',
    fontSize: 14,
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  conditionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  conditionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  conditionText: {
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#165DFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  detailImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  detailImagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    width: 80,
    fontSize: 14,
    color: '#999',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  // 删除确认对话框样式
  deleteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  deleteDialog: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 320,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  deleteButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deleteCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  deleteCancelText: {
    fontSize: 16,
    color: '#666',
  },
  deleteConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#F53F3F',
    alignItems: 'center',
  },
  deleteConfirmText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
  deleteBtnDisabled: {
    backgroundColor: '#CCC',
  },
  orderListSection: {
    marginTop: 16,
  },
  orderItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  orderIndex: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
    marginBottom: 8,
  },
  noOrderText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
