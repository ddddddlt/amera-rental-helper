import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 9091;

// 内存存储同步数据（生产环境建议使用数据库）
interface SyncData {
  devices: any[];
  tenants: any[];
  orders: any[];
  updatedAt: string;
  deviceId: string;
}

let syncStorage: SyncData | null = null;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// 获取同步数据
app.get('/api/v1/sync', (req, res) => {
  if (!syncStorage) {
    return res.status(404).json({ error: 'No sync data found' });
  }
  res.status(200).json(syncStorage);
});

// 上传同步数据
app.post('/api/v1/sync', (req, res) => {
  const { devices, tenants, orders, deviceId } = req.body;
  
  if (!devices || !tenants || !orders) {
    return res.status(400).json({ error: 'Missing required data' });
  }

  syncStorage = {
    devices,
    tenants,
    orders,
    updatedAt: new Date().toISOString(),
    deviceId: deviceId || 'unknown'
  };

  console.log(`Data synced from device: ${deviceId || 'unknown'}`);
  res.status(200).json({ 
    status: 'success', 
    updatedAt: syncStorage.updatedAt,
    message: 'Data synced successfully' 
  });
});

// 清除同步数据
app.delete('/api/v1/sync', (req, res) => {
  syncStorage = null;
  res.status(200).json({ status: 'success', message: 'Sync data cleared' });
});


app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
