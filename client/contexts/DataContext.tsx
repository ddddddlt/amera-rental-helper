import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { Device, Order, DeviceModel, OrderModel, DEVICE_STATUS, DeviceStatus } from '@/utils/storage';

interface DataContextType {
  devices: Device[];
  orders: Order[];
  refreshKey: number;
  refreshData: () => Promise<void>;
  updateDevice: (deviceId: string, updates: Partial<Device>) => Promise<void>;
  addOrder: (order: Omit<Order, 'id'>) => Promise<Order>;
  deleteOrder: (orderId: string) => Promise<void>;
  updateOrder: (orderId: string, updates: Partial<Order>) => Promise<void>;
  completeOrder: (orderId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // 使用 ref 存储最新状态
  const devicesRef = useRef<Device[]>([]);
  const ordersRef = useRef<Order[]>([]);
  
  // 保持 ref 同步
  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);
  
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // 计算设备状态
  const calculateDeviceStatus = useCallback((deviceId: string, currentOrders: Order[]): DeviceStatus => {
    const deviceOrders = currentOrders.filter(o => o.deviceId === deviceId);
    const device = devicesRef.current.find(d => d.id === deviceId);
    if (!device) return DEVICE_STATUS.AVAILABLE;
    
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
    
    if (activeOrder) {
      return DEVICE_STATUS.RENTED;
    } else if (futureOrders.length > 0) {
      return DEVICE_STATUS.APPOINTED;
    } else if (device.status !== DEVICE_STATUS.MAINTENANCE) {
      return DEVICE_STATUS.AVAILABLE;
    }
    return device.status;
  }, []);

  const refreshData = useCallback(async () => {
    const data = await DeviceModel.getAll();
    const ordersData = await OrderModel.getAll();
    
    // 根据订单重新计算设备状态
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
    devicesRef.current = updatedDevices;
    ordersRef.current = ordersData;
    setRefreshKey(k => k + 1);
  }, []);
  
  // 初始化数据
  useEffect(() => {
    refreshData();
  }, []);

  const updateDevice = useCallback(async (deviceId: string, updates: Partial<Device>) => {
    const device = devicesRef.current.find(d => d.id === deviceId);
    if (device) {
      const updated = { ...device, ...updates };
      await DeviceModel.update(deviceId, updated);
      const newDevices = devicesRef.current.map(d => d.id === deviceId ? updated : d);
      setDevices(newDevices);
      devicesRef.current = newDevices;
      setRefreshKey(k => k + 1);
    }
  }, []);

  const deleteOrder = useCallback(async (orderId: string) => {
    // 直接使用当前 orders 状态查找订单
    const currentOrders = ordersRef.current;
    const order = currentOrders.find(o => o.id === orderId);
    if (!order) {
      console.log('Order not found:', orderId);
      return;
    }

    // 从数据库删除
    await OrderModel.delete(orderId);
    
    // 计算新的设备状态
    const remainingOrders = currentOrders.filter(o => o.id !== orderId);
    const newStatus = calculateDeviceStatus(order.deviceId, remainingOrders);
    
    // 更新状态
    ordersRef.current = remainingOrders;
    setOrders(remainingOrders);
    
    // 更新设备状态
    const newDevices = devicesRef.current.map(d => {
      if (d.id === order.deviceId) {
        const updatedDevice = { ...d, status: newStatus };
        DeviceModel.update(d.id, updatedDevice);
        return updatedDevice;
      }
      return d;
    });
    devicesRef.current = newDevices;
    setDevices(newDevices);
    
    setRefreshKey(k => k + 1);
  }, [calculateDeviceStatus]);

  const completeOrder = useCallback(async (orderId: string) => {
    const currentOrders = ordersRef.current;
    const order = currentOrders.find(o => o.id === orderId);
    if (!order) {
      console.log('Order not found:', orderId);
      return;
    }

    const now = new Date();
    const updated: Order = { 
      ...order, 
      status: 'completed',
      endDate: now.toISOString()
    };
    
    await OrderModel.update(orderId, updated);
    
    // 计算新的设备状态
    const newOrders = currentOrders.map(o => o.id === orderId ? updated : o);
    ordersRef.current = newOrders;
    setOrders(newOrders);
    
    const newStatus = calculateDeviceStatus(order.deviceId, newOrders);
    
    const newDevices = devicesRef.current.map(d => {
      if (d.id === order.deviceId) {
        const updatedDevice = { ...d, status: newStatus };
        DeviceModel.update(d.id, updatedDevice);
        return updatedDevice;
      }
      return d;
    });
    devicesRef.current = newDevices;
    setDevices(newDevices);
    
    setRefreshKey(k => k + 1);
  }, [calculateDeviceStatus]);

  const updateOrder = useCallback(async (orderId: string, updates: Partial<Order>) => {
    const currentOrders = ordersRef.current;
    const order = currentOrders.find(o => o.id === orderId);
    if (!order) {
      console.log('Order not found:', orderId);
      return;
    }

    const updated: Order = { ...order, ...updates };
    await OrderModel.update(orderId, updated);
    
    const newOrders = currentOrders.map(o => o.id === orderId ? updated : o);
    ordersRef.current = newOrders;
    setOrders(newOrders);
    
    const newStatus = calculateDeviceStatus(order.deviceId, newOrders);
    
    const newDevices = devicesRef.current.map(d => {
      if (d.id === order.deviceId) {
        const updatedDevice = { ...d, status: newStatus };
        DeviceModel.update(d.id, updatedDevice);
        return updatedDevice;
      }
      return d;
    });
    devicesRef.current = newDevices;
    setDevices(newDevices);
    
    setRefreshKey(k => k + 1);
  }, [calculateDeviceStatus]);

  // 添加新订单
  const addOrder = useCallback(async (orderData: Omit<Order, 'id'>): Promise<Order> => {
    // 保存到数据库，会自动生成 id, status, createdAt
    // 移除 OrderModel 会自动生成的字段
    const { status, createdAt, completedAt, ...createData } = orderData;
    const createdOrder = await OrderModel.create(createData as Omit<Order, 'id' | 'status' | 'createdAt' | 'completedAt'>);
    
    // 添加到本地状态
    const currentOrders = ordersRef.current;
    const newOrders = [...currentOrders, createdOrder];
    ordersRef.current = newOrders;
    setOrders(newOrders);
    
    // 计算并更新设备状态
    const newStatus = calculateDeviceStatus(createdOrder.deviceId, newOrders);
    const newDevices = devicesRef.current.map(d => {
      if (d.id === createdOrder.deviceId) {
        const updatedDevice = { ...d, status: newStatus };
        DeviceModel.update(d.id, updatedDevice);
        return updatedDevice;
      }
      return d;
    });
    devicesRef.current = newDevices;
    setDevices(newDevices);
    
    setRefreshKey(k => k + 1);
    
    return createdOrder;
  }, [calculateDeviceStatus]);

  return (
    <DataContext.Provider value={{ devices, orders, refreshKey, refreshData, updateDevice, deleteOrder, updateOrder, completeOrder, addOrder }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
