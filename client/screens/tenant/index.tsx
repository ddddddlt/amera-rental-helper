/**
 * 租客管理页面
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Image,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { TenantModel, Tenant } from '@/utils/storage';

export default function TenantScreen() {
  const insets = useSafeAreaInsets();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  
  // 表单字段
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSchool, setFormSchool] = useState('');
  const [formIdCard, setFormIdCard] = useState('');
  const [formRemark, setFormRemark] = useState('');
  const [formPhotoUri, setFormPhotoUri] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Tenant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 搜索功能
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  
  // 过滤租客列表
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTenants(tenants);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = tenants.filter(
        tenant => 
          tenant.name.toLowerCase().includes(query) ||
          tenant.phone.includes(query)
      );
      setFilteredTenants(filtered);
    }
  }, [tenants, searchQuery]);

  const loadTenants = useCallback(async () => {
    const data = await TenantModel.getAll();
    setTenants(data);
  }, []);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const openAddModal = (tenant?: Tenant) => {
    if (tenant) {
      setEditingTenant(tenant);
      setFormName(tenant.name);
      setFormPhone(tenant.phone);
      setFormSchool(tenant.school || '');
      setFormIdCard(tenant.idCard || '');
      setFormRemark(tenant.remark || '');
      setFormPhotoUri(tenant.photoUri || null);
    } else {
      setEditingTenant(null);
      setFormName('');
      setFormPhone('');
      setFormSchool('');
      setFormIdCard('');
      setFormRemark('');
      setFormPhotoUri(null);
    }
    setAddModalVisible(true);
  };

  const openDetailModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setDetailModalVisible(true);
  };

  const handleSave = async () => {
    if (!formName || !formPhone) {
      Alert.alert('提示', '请填写必填项（姓名、手机号）');
      return;
    }

    const tenantData = {
      name: formName,
      phone: formPhone,
      school: formSchool,
      idCard: formIdCard,
      remark: formRemark,
      photoUri: formPhotoUri,
    };

    if (editingTenant) {
      await TenantModel.update(editingTenant.id, tenantData);
      Alert.alert('成功', '租客更新成功');
    } else {
      await TenantModel.create(tenantData);
      Alert.alert('成功', '租客添加成功');
    }

    setAddModalVisible(false);
    loadTenants();
  };

  const handleDelete = (tenant: Tenant) => {
    setDeleteConfirm(tenant);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await TenantModel.delete(deleteConfirm.id);
      setDeleteConfirm(null);
      loadTenants();
    } catch (error) {
      console.error('删除失败:', error);
    }
    setIsDeleting(false);
  };

  const pickImage = async () => {
    try {
      if (!ImagePicker.launchImageLibraryAsync) {
        Alert.alert('提示', '当前环境不支持图片选择');
        return;
      }
      
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('提示', '需要相册权限才能上传图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          // 使用 Base64
          setFormPhotoUri('data:image/jpeg;base64,' + asset.base64);
        } else if (asset.uri) {
          // 降级使用 URI
          setFormPhotoUri(asset.uri);
        }
      }
    } catch (error) {
      console.log('图片选择错误:', error);
      Alert.alert('提示', '图片选择功能暂时不可用');
    }
  };

  return (
    <Screen>
      <View className="flex-1 bg-gray-50">
        {/* 顶部导航 */}
        <View style={{ paddingTop: Math.max(insets.top, 8) }} className="bg-white px-4 pb-3 border-b border-gray-100">
          <View className="flex-row justify-between items-center">
            <Text className="text-xl font-bold text-gray-900">租客管理</Text>
            <TouchableOpacity
              onPress={() => openAddModal()}
              className="bg-blue-500 px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-medium">新增租客</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 搜索栏 */}
        <View className="px-4 py-3 bg-white border-b border-gray-100">
          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Text className="text-gray-400 mr-2 text-base">搜索</Text>
            <TextInput
              className="flex-1 text-gray-900 text-base"
              placeholder="输入姓名或手机号"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text className="text-gray-400 text-lg">×</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 20 }}>
          {filteredTenants.length === 0 ? (
            <View className="items-center justify-center py-20">
              <Text className="text-gray-400 text-base">
                {searchQuery ? '未找到匹配的租客' : '暂无租客，请添加租客'}
              </Text>
            </View>
          ) : (
            filteredTenants.map((tenant) => (
              <View
                key={tenant.id}
                className="bg-white rounded-xl p-4 mb-3 shadow-sm"
              >
                <TouchableOpacity
                  onPress={() => openDetailModal(tenant)}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center">
                    {tenant.photoUri ? (
                      <Image source={{ uri: tenant.photoUri }} className="w-14 h-14 rounded-full" />
                    ) : (
                      <View className="w-14 h-14 rounded-full bg-blue-100 items-center justify-center">
                        <Text className="text-blue-500 text-2xl font-bold">
                          {tenant.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View className="flex-1 ml-3">
                      <Text className="text-base font-bold text-gray-900">{tenant.name}</Text>
                      <Text className="text-sm text-gray-500 mt-1">{tenant.phone}</Text>
                      {tenant.remark && (
                        <Text className="text-sm text-gray-400 mt-1" numberOfLines={1}>
                          {tenant.remark}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
                <View className="flex-row justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                  <TouchableOpacity
                    onPress={() => openAddModal(tenant)}
                    className="px-4 py-2 bg-gray-100 rounded-lg items-center justify-center"
                  >
                    <Text className="text-gray-600 text-sm">编辑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(tenant)}
                    className="px-4 py-2 bg-red-50 rounded-lg items-center justify-center"
                  >
                    <Text className="text-red-500 text-sm">删除</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* 新增/编辑租客弹窗 */}
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
                    {editingTenant ? '编辑租客' : '新增租客'}
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
                {/* 租客照片 */}
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
                    {formPhotoUri ? (
                      <Image source={{ uri: formPhotoUri }} style={styles.imagePreview} />
                    ) : (
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#9ca3af', fontSize: 24 }}>+</Text>
                        <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>添加照片</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>姓名 *</Text>
                <TextInput
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="请输入租客姓名"
                  style={styles.input}
                  placeholderTextColor="#999"
                />

                <Text style={styles.label}>电话 *</Text>
                <TextInput
                  value={formPhone}
                  onChangeText={setFormPhone}
                  placeholder="请输入联系电话"
                  keyboardType="phone-pad"
                  style={styles.input}
                  placeholderTextColor="#999"
                />

                <Text style={styles.label}>学校</Text>
                <TextInput
                  value={formSchool}
                  onChangeText={setFormSchool}
                  placeholder="请输入学校名称"
                  style={styles.input}
                  placeholderTextColor="#999"
                />

                <Text style={styles.label}>身份证号</Text>
                <TextInput
                  value={formIdCard}
                  onChangeText={setFormIdCard}
                  placeholder="请输入身份证号"
                  style={styles.input}
                  placeholderTextColor="#999"
                />

                <Text style={styles.label}>备注</Text>
                <TextInput
                  value={formRemark}
                  onChangeText={setFormRemark}
                  placeholder="其他备注信息"
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

        {/* 租客详情弹窗 */}
        {detailModalVisible && selectedTenant && (
          <View className="fixed inset-0 bg-black/50 justify-end items-end" style={{ zIndex: 100 }}>
            <TouchableOpacity className="flex-1 w-full" onPress={() => setDetailModalVisible(false)} activeOpacity={1} />
            <View className="bg-white rounded-t-2xl p-4 w-full max-h-screen">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-bold text-gray-900">租客详情</Text>
                <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                  <Text className="text-gray-500 text-xl">✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* 租客照片 */}
                <View className="items-center mb-4">
                  {selectedTenant.photoUri ? (
                    <Image source={{ uri: selectedTenant.photoUri }} className="w-24 h-24 rounded-full" />
                  ) : (
                    <View className="w-24 h-24 rounded-full bg-blue-100 items-center justify-center">
                      <Text className="text-blue-500 text-4xl font-bold">
                        {selectedTenant.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* 租客信息卡片 */}
                <View className="bg-gray-50 rounded-xl p-4 mb-4">
                  <Text className="text-2xl font-bold text-gray-900 mb-2">{selectedTenant.name}</Text>
                  <View className="flex-row items-center mb-2">
                    <Text className="text-gray-500 text-sm">联系电话：</Text>
                    <Text className="text-gray-700 font-medium">{selectedTenant.phone}</Text>
                  </View>
                  {selectedTenant.school && (
                    <View className="flex-row items-center mb-2">
                      <Text className="text-gray-500 text-sm">学校：</Text>
                      <Text className="text-gray-700 font-medium">{selectedTenant.school}</Text>
                    </View>
                  )}
                  {selectedTenant.idCard && (
                    <View className="flex-row items-center mb-2">
                      <Text className="text-gray-500 text-sm">身份证号：</Text>
                      <Text className="text-gray-700 font-medium">{selectedTenant.idCard}</Text>
                    </View>
                  )}
                  {selectedTenant.remark && (
                    <View className="flex-row items-start">
                      <Text className="text-gray-500 text-sm">备注：</Text>
                      <Text className="text-gray-700 flex-1">{selectedTenant.remark}</Text>
                    </View>
                  )}
                  <View className="mt-3 pt-3 border-t border-gray-200">
                    <Text className="text-gray-400 text-xs">添加时间</Text>
                    <Text className="text-gray-600 text-sm mt-1">{selectedTenant.createdAt}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setDetailModalVisible(false);
                    openAddModal(selectedTenant);
                  }}
                  className="bg-blue-500 rounded-xl py-4 items-center mb-4"
                >
                  <Text className="text-white font-bold text-base">编辑租客</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        )}

        {/* 删除确认对话框 */}
        {deleteConfirm && (
          <View style={styles.confirmDialogOverlay}>
            <View style={styles.confirmDialogContainer}>
              <Text style={styles.deleteTitle}>确认删除</Text>
              <Text style={styles.deleteMessage}>
                确定要删除租客「{deleteConfirm.name}」吗？{"\n"}此操作不可撤销。
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
    paddingBottom: 20,
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
  tenantCard: {
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
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#165DFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  tenantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  tenantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  tenantPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tenantRemark: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
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
  deleteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  deleteDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: 280,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  deleteMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  deleteButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  deleteCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F0F0F0',
  },
  deleteCancelText: {
    color: '#666',
    fontWeight: '600',
  },
  deleteConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteConfirmText: {
    color: '#F53F3F',
    fontWeight: '600',
  },
  deleteBtnDisabled: {
    opacity: 0.5,
  },
  confirmDialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  confirmDialogContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 0,
    width: 288,
    overflow: 'hidden',
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
    fontSize: 24,
    color: '#999',
    padding: 4,
  },
  imagePicker: {
    width: 96,
    height: 96,
    borderRadius: 48,
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
  saveButton: {
    backgroundColor: '#165DFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
