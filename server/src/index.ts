import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = process.env.PORT || 9091;

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据存储文件路径
const DATA_FILE = path.join(__dirname, '..', 'sync-data.json');

// 内存存储同步数据（生产环境建议使用数据库）
interface SyncData {
  devices: any[];
  tenants: any[];
  orders: any[];
  updatedAt: string;
  deviceId: string;
}

// 从文件加载数据
const loadDataFromFile = (): SyncData | null => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading data from file:', error);
  }
  return null;
};

// 保存数据到文件
const saveDataToFile = (data: SyncData) => {
  try {
    // 确保目录存在
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log('Data saved to file:', DATA_FILE);
  } catch (error) {
    console.error('Error saving data to file:', error);
  }
};

// 初始化时从文件加载数据
let syncStorage: SyncData | null = loadDataFromFile();

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

  // 保存到文件
  saveDataToFile(syncStorage);

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
  // 删除文件
  try {
    if (fs.existsSync(DATA_FILE)) {
      fs.unlinkSync(DATA_FILE);
    }
  } catch (error) {
    console.error('Error deleting data file:', error);
  }
  res.status(200).json({ status: 'success', message: 'Sync data cleared' });
});


app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
  console.log(`Data file: ${DATA_FILE}`);
});
