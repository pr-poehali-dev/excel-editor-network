import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';

export interface ConnectionConfig {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  connectTimeout: string;
}

interface TestResult {
  status: 'idle' | 'testing' | 'success' | 'error';
  message: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  config: ConnectionConfig;
  onSave: (config: ConnectionConfig) => void;
}

const DEFAULT_CONFIG: ConnectionConfig = {
  host: 'localhost',
  port: '3306',
  database: '',
  user: 'root',
  password: '',
  ssl: false,
  connectTimeout: '10',
};

export { DEFAULT_CONFIG };

export default function ConnectionDialog({ open, onClose, config, onSave }: Props) {
  const [form, setForm] = useState<ConnectionConfig>(config);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>({ status: 'idle', message: '' });
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'history'>('basic');
  const [savedProfiles, setSavedProfiles] = useState<{ name: string; config: ConnectionConfig }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('mysql_profiles') || '[]');
    } catch {
      return [];
    }
  });
  const [profileName, setProfileName] = useState('');
  const [showSaveProfile, setShowSaveProfile] = useState(false);

  useEffect(() => {
    setForm(config);
    setTestResult({ status: 'idle', message: '' });
  }, [config, open]);

  if (!open) return null;

  const set = (field: keyof ConnectionConfig, value: string | boolean) =>
    setForm(p => ({ ...p, [field]: value }));

  const handleTest = () => {
    if (!form.host || !form.port || !form.database || !form.user) {
      setTestResult({ status: 'error', message: 'Заполните обязательные поля: хост, порт, база данных и пользователь.' });
      return;
    }
    setTestResult({ status: 'testing', message: 'Подключаемся к серверу...' });
    setTimeout(() => {
      // Симуляция проверки: в реальном приложении здесь был бы HTTP-запрос к бэкенду
      const ok = form.host.trim().length > 0 && !isNaN(Number(form.port));
      if (ok) {
        setTestResult({
          status: 'success',
          message: `Успешное подключение к ${form.host}:${form.port}/${form.database} (пользователь: ${form.user})`,
        });
      } else {
        setTestResult({ status: 'error', message: 'Не удалось подключиться. Проверьте хост и порт.' });
      }
    }, 1400);
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  const handleSaveProfile = () => {
    if (!profileName.trim()) return;
    const profiles = [...savedProfiles, { name: profileName.trim(), config: { ...form } }];
    setSavedProfiles(profiles);
    localStorage.setItem('mysql_profiles', JSON.stringify(profiles));
    setProfileName('');
    setShowSaveProfile(false);
  };

  const handleDeleteProfile = (idx: number) => {
    const profiles = savedProfiles.filter((_, i) => i !== idx);
    setSavedProfiles(profiles);
    localStorage.setItem('mysql_profiles', JSON.stringify(profiles));
  };

  const handleLoadProfile = (c: ConnectionConfig) => {
    setForm({ ...c });
    setActiveTab('basic');
    setTestResult({ status: 'idle', message: '' });
  };

  const dsn = `mysql://${form.user}${form.password ? ':***' : ''}@${form.host}:${form.port}/${form.database}`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[560px] max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b flex-shrink-0">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <Icon name="Database" size={16} className="text-orange-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-800 text-sm">Подключение к MySQL</div>
            <div className="text-xs text-gray-400">Настройте параметры сервера базы данных</div>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors">
            <Icon name="X" size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0 bg-gray-50">
          {([
            { id: 'basic', label: 'Подключение', icon: 'ServerCog' },
            { id: 'advanced', label: 'Дополнительно', icon: 'Settings2' },
            { id: 'history', label: 'Профили', icon: 'BookMarked' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-green-600 text-green-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon name={tab.icon as 'Settings2'} size={13} fallback="Settings2" />{tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── BASIC TAB ── */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              {/* Host + Port */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Хост <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Icon name="Server" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200"
                      placeholder="localhost или IP-адрес"
                      value={form.host}
                      onChange={e => set('host', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Порт <span className="text-red-400">*</span>
                  </label>
                  <input
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200"
                    placeholder="3306"
                    value={form.port}
                    onChange={e => set('port', e.target.value.replace(/\D/g, ''))}
                    maxLength={5}
                  />
                </div>
              </div>

              {/* Database */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  База данных <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Icon name="Database" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200"
                    placeholder="my_database"
                    value={form.database}
                    onChange={e => set('database', e.target.value)}
                  />
                </div>
              </div>

              {/* User */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Пользователь <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Icon name="User" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200"
                    placeholder="root"
                    value={form.user}
                    onChange={e => set('user', e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Пароль</label>
                <div className="relative">
                  <Icon name="Lock" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full pl-8 pr-9 py-2 text-sm border rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(p => !p)}
                  >
                    <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={13} />
                  </button>
                </div>
              </div>

              {/* DSN preview */}
              {form.host && form.database && (
                <div className="bg-gray-50 border rounded-lg px-3 py-2">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">DSN строка</div>
                  <div className="font-mono text-xs text-gray-600 break-all">{dsn}</div>
                </div>
              )}
            </div>
          )}

          {/* ── ADVANCED TAB ── */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              {/* SSL */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-700">SSL / TLS шифрование</div>
                  <div className="text-xs text-gray-400 mt-0.5">Зашифрованное соединение с сервером</div>
                </div>
                <button
                  type="button"
                  onClick={() => set('ssl', !form.ssl)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.ssl ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.ssl ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Connect timeout */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Таймаут подключения (сек)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200"
                  value={form.connectTimeout}
                  onChange={e => set('connectTimeout', e.target.value)}
                />
              </div>

              {/* Charset info */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex gap-2">
                  <Icon name="Info" size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700 leading-relaxed">
                    Кодировка соединения: <strong>utf8mb4</strong> (поддержка кириллицы и emoji).<br />
                    Часовой пояс берётся из настроек сервера MySQL.
                  </div>
                </div>
              </div>

              {/* Connection string for .env */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Строка для .env файла</label>
                <div className="bg-gray-900 rounded-lg px-3 py-2.5 font-mono text-xs text-green-300 break-all select-all">
                  {`DATABASE_URL=mysql://${form.user}:${form.password || '<password>'}@${form.host}:${form.port}/${form.database}${form.ssl ? '?ssl=true' : ''}`}
                </div>
              </div>
            </div>
          )}

          {/* ── PROFILES TAB ── */}
          {activeTab === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-medium text-gray-600">Сохранённые профили</div>
                <button
                  className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 px-2 py-1 rounded hover:bg-green-50 transition-colors"
                  onClick={() => setShowSaveProfile(p => !p)}
                >
                  <Icon name="Plus" size={12} />Сохранить текущий
                </button>
              </div>

              {showSaveProfile && (
                <div className="flex gap-2 mb-4 animate-fade-in">
                  <input
                    autoFocus
                    className="flex-1 text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:border-green-500"
                    placeholder="Название профиля (напр. Production)"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveProfile(); if (e.key === 'Escape') setShowSaveProfile(false); }}
                  />
                  <button
                    className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40"
                    disabled={!profileName.trim()}
                    onClick={handleSaveProfile}
                  >
                    Сохранить
                  </button>
                </div>
              )}

              {savedProfiles.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Icon name="BookMarked" size={28} className="mx-auto mb-2 opacity-30" />
                  <div className="text-sm">Нет сохранённых профилей</div>
                  <div className="text-xs mt-1">Настройте подключение и нажмите «Сохранить текущий»</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedProfiles.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 group transition-colors">
                      <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon name="Database" size={14} className="text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-xs text-gray-400 truncate">
                          {p.config.user}@{p.config.host}:{p.config.port}/{p.config.database}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="px-2.5 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          onClick={() => handleLoadProfile(p.config)}
                        >
                          Загрузить
                        </button>
                        <button
                          className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                          onClick={() => handleDeleteProfile(i)}
                        >
                          <Icon name="Trash2" size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Test result */}
        {testResult.status !== 'idle' && (
          <div className={`mx-5 mb-3 px-3 py-2.5 rounded-lg flex items-center gap-2 text-xs flex-shrink-0 ${
            testResult.status === 'testing' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
            testResult.status === 'success' ? 'bg-green-50 text-green-700 border border-green-100' :
            'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {testResult.status === 'testing' && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
            {testResult.status === 'success' && <Icon name="CheckCircle2" size={14} className="flex-shrink-0" />}
            {testResult.status === 'error' && <Icon name="XCircle" size={14} className="flex-shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-3 border-t bg-gray-50 flex-shrink-0 rounded-b-xl">
          <button
            onClick={handleTest}
            disabled={testResult.status === 'testing'}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testResult.status === 'testing'
              ? <><div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />Проверяем...</>
              : <><Icon name="Plug" size={14} />Проверить соединение</>
            }
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Icon name="Save" size={14} />Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
