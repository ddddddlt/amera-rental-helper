/**
 * 相机排租助手 - 数据存储工具
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  DEVICES: 'camera_rental_devices',
  TENANTS: 'camera_rental_tenants',
  ORDERS: 'camera_rental_orders',
};

export const Storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Storage get error:', e);
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage set error:', e);
      return false;
    }
  },

  async remove(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('Storage remove error:', e);
      return false;
    }
  },
};

// 设备状态
export const DEVICE_STATUS = {
  AVAILABLE: 'available',
  RENTED: 'rented',
  MAINTENANCE: 'maintenance',
  APPOINTED: 'appointed', // 有预约
} as const;

export type DeviceStatus = typeof DEVICE_STATUS[keyof typeof DEVICE_STATUS];

// 机器状态评级
export const MACHINE_CONDITIONS = {
  NEW: 'new',           // 全新
  EXCELLENT: 'excellent', // 优秀
  GOOD: 'good',         // 良好
  FAIR: 'fair',         // 一般
  POOR: 'poor',         // 较差
} as const;

export type MachineCondition = typeof MACHINE_CONDITIONS[keyof typeof MACHINE_CONDITIONS];

export const MACHINE_CONDITION_LABELS: Record<MachineCondition, string> = {
  [MACHINE_CONDITIONS.NEW]: '全新',
  [MACHINE_CONDITIONS.EXCELLENT]: '优秀',
  [MACHINE_CONDITIONS.GOOD]: '良好',
  [MACHINE_CONDITIONS.FAIR]: '一般',
  [MACHINE_CONDITIONS.POOR]: '较差',
};

// 设备接口
export interface Device {
  id: string;
  serialNumber: string;  // 序列号
  model: string;
  dailyRate: number;
  deposit: number;
  accessories: string;
  status: DeviceStatus;
  condition: MachineCondition;  // 机器状态评级
  imageUri: string | null;     // 设备图片
  nextAvailable: string | null;
  createdAt: string;
}

// 租客接口
export interface Tenant {
  id: string;
  name: string;
  phone: string;
  remark: string;
  photoUri: string | null;     // 租客照片
  school: string;              // 学校
  idCard: string;               // 身份证号
  createdAt: string;
}

// 订单状态
export const ORDER_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

// 订单接口
export interface Order {
  id: string;
  deviceId: string;
  deviceModel: string;
  tenantId: string;
  tenantName: string;
  tenantPhone: string;    // 租客电话
  startDate: string;
  endDate: string;
  startTime?: string;     // 开始时间（小时:分钟）
  endTime?: string;       // 结束时间（小时:分钟）
  dailyRate: number;
  deposit: number;
  totalAmount: number;
  remark: string;
  status: OrderStatus;
  createdAt: string;
  completedAt: string | null;
  // 押金和租金去向
  depositReceived: boolean;  // 押金是否已收
  depositDestination: string;  // 押金去向
  rentReceived: boolean;     // 租金是否已收
  rentDestination: string;   // 租金去向
}

// 设备数据操作
export const DeviceModel = {
  async getAll(): Promise<Device[]> {
    return (await Storage.get<Device[]>(KEYS.DEVICES)) || [];
  },

  async getById(id: string): Promise<Device | null> {
    const devices = await this.getAll();
    return devices.find(d => d.id === id) || null;
  },

  async saveAll(devices: Device[]): Promise<void> {
    await Storage.set(KEYS.DEVICES, devices);
  },

  async create(data: Omit<Device, 'id' | 'status' | 'nextAvailable' | 'createdAt'>): Promise<Device> {
    const devices = await this.getAll();
    const device: Device = {
      ...data,
      id: 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      status: DEVICE_STATUS.AVAILABLE,
      nextAvailable: null,
      createdAt: new Date().toISOString(),
    };
    devices.push(device);
    await this.saveAll(devices);
    return device;
  },

  async update(id: string, data: Partial<Device>): Promise<Device | null> {
    const devices = await this.getAll();
    const index = devices.findIndex((d) => d.id === id);
    if (index !== -1) {
      devices[index] = { ...devices[index], ...data };
      await this.saveAll(devices);
      return devices[index];
    }
    return null;
  },

  async delete(id: string): Promise<void> {
    const devices = await this.getAll();
    await this.saveAll(devices.filter((d) => d.id !== id));
  },

  async getStats(): Promise<{ total: number; rented: number; available: number }> {
    const devices = await this.getAll();
    const orders = await Storage.get<Order[]>(KEYS.ORDERS) || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 根据当前真正在租的订单计算（同时检查设备存在性）
    const activeDeviceIds = new Set(
      orders
        .filter((o) => o.status === ORDER_STATUS.ACTIVE)
        .filter((o) => {
          const startDate = new Date(o.startDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(o.endDate);
          endDate.setHours(23, 59, 59, 999);
          return startDate <= today && endDate >= today;
        })
        .map((o) => o.deviceId)
    );
    
    // 只计算存在的设备的在租数量
    const rentedCount = devices.filter((d) => activeDeviceIds.has(d.id)).length;
    
    return {
      total: devices.length,
      rented: rentedCount,
      available: devices.length - rentedCount,
    };
  },

  getStatusLabel(status: DeviceStatus): string {
    const labels = {
      [DEVICE_STATUS.AVAILABLE]: '空闲',
      [DEVICE_STATUS.RENTED]: '在租',
      [DEVICE_STATUS.MAINTENANCE]: '维护',
      [DEVICE_STATUS.APPOINTED]: '有预约',
    };
    return labels[status] || '未知';
  },
};

// 租客数据操作
export const TenantModel = {
  async getAll(): Promise<Tenant[]> {
    return (await Storage.get<Tenant[]>(KEYS.TENANTS)) || [];
  },

  async getById(id: string): Promise<Tenant | null> {
    const tenants = await this.getAll();
    return tenants.find(t => t.id === id) || null;
  },

  async saveAll(tenants: Tenant[]): Promise<void> {
    await Storage.set(KEYS.TENANTS, tenants);
  },

  async create(data: Omit<Tenant, 'id' | 'createdAt'>): Promise<Tenant> {
    const tenants = await this.getAll();
    const tenant: Tenant = {
      ...data,
      id: 'ten_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    tenants.push(tenant);
    await this.saveAll(tenants);
    return tenant;
  },

  async update(id: string, data: Partial<Tenant>): Promise<Tenant | null> {
    const tenants = await this.getAll();
    const index = tenants.findIndex((t) => t.id === id);
    if (index !== -1) {
      tenants[index] = { ...tenants[index], ...data };
      await this.saveAll(tenants);
      return tenants[index];
    }
    return null;
  },

  async delete(id: string): Promise<void> {
    const tenants = await this.getAll();
    await this.saveAll(tenants.filter((t) => t.id !== id));
  },

  async getOrderCount(tenantId: string): Promise<number> {
    const orders = await OrderModel.getAll();
    return orders.filter((o) => o.tenantId === tenantId).length;
  },
};

// 订单数据操作
export const OrderModel = {
  async getAll(): Promise<Order[]> {
    return (await Storage.get<Order[]>(KEYS.ORDERS)) || [];
  },

  async getById(id: string): Promise<Order | null> {
    const orders = await this.getAll();
    return orders.find(o => o.id === id) || null;
  },

  async saveAll(orders: Order[]): Promise<void> {
    await Storage.set(KEYS.ORDERS, orders);
  },

  async create(data: Omit<Order, 'id' | 'status' | 'createdAt' | 'completedAt'>): Promise<Order> {
    const orders = await this.getAll();
    const order: Order = {
      ...data,
      id: 'ord_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      status: ORDER_STATUS.ACTIVE,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    orders.push(order);
    await this.saveAll(orders);
    return order;
  },

  async update(id: string, data: Partial<Order>): Promise<Order | null> {
    const orders = await this.getAll();
    const index = orders.findIndex((o) => o.id === id);
    if (index !== -1) {
      orders[index] = { ...orders[index], ...data };
      await this.saveAll(orders);
      return orders[index];
    }
    return null;
  },

  async complete(id: string): Promise<Order | null> {
    return this.update(id, {
      status: ORDER_STATUS.COMPLETED,
      completedAt: new Date().toISOString(),
    });
  },

  async delete(id: string): Promise<void> {
    const orders = await this.getAll();
    await this.saveAll(orders.filter((o) => o.id !== id));
  },

  async checkAvailability(
    deviceId: string,
    startDate: string,
    endDate: string,
    excludeOrderId: string | null = null
  ): Promise<boolean> {
    const orders = (await this.getAll()).filter(
      (o) => o.deviceId === deviceId && o.status === ORDER_STATUS.ACTIVE && o.id !== excludeOrderId
    );

    for (const order of orders) {
      if (!(endDate < order.startDate || startDate > order.endDate)) {
        return false;
      }
    }
    return true;
  },

  getStatusLabel(status: OrderStatus): string {
    return status === ORDER_STATUS.ACTIVE ? '进行中' : '已归还';
  },
};
