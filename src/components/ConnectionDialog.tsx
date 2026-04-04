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
  port: '5432',
  database: '',
  user: 'postgres',
  password: '',
  ssl: false,
  connectTimeout: '10',
};

export { DEFAULT_CONFIG };

export default function ConnectionDialog({ open, onClose, config, onSave }: Props) {
  const [form, setForm] = useState<ConnectionConfig>(config);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>({ status: 'idle', message: '' });
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'profiles'>('basic');
  const [savedProfiles, setSavedProfiles] = useState<{ name: string; config: ConnectionConfig }[]>(() => {
    try { return JSON.parse(localStorage.getItem('pg_profiles') || '[]'); }
    catch { return []; }
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

  const handleTest = async () => {
    if (!form.host || !form.port || !form.database || !form.user) {
      setTestResult({ status: 'error', message: 'Заполните обязательные поля: хост, порт, база данных и пользователь.' });
      return;
    }
    setTestResult({ status: 'testing', message: 'Проверяем подключение к PostgreSQL...' });
    try {
      const apiUrl = 'https://functions.poehali.dev/ca159685-b975-4921-aa63-81df3c99b829';
      const res = await fetch(`${apiUrl}/?action=test_pg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: form.host, port: form.port, database: form.database,
          user: form.user, password: form.password, ssl: form.ssl,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({ status: 'success', message: `Подключено: PostgreSQL ${data.version || ''} · ${form.host}:${form.port}/${form.database}` });
      } else {
        setTestResult({ status: 'error', message: data.error || 'Не удалось подключиться' });
      }
    } catch (e) {
      setTestResult({ status: 'error', message: `Ошибка сети: ${String(e)}` });
    }
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  const handleSaveProfile = () => {
    if (!profileName.trim()) return;
    const profiles = [...savedProfiles, { name: profileName.trim(), config: { ...form } }];
    setSavedProfiles(profiles);
    localStorage.setItem('pg_profiles', JSON.stringify(profiles));
    setProfileName('');
    setShowSaveProfile(false);
  };

  const handleDeleteProfile = (idx: number) => {
    const profiles = savedProfiles.filter((_, i) => i !== idx);
    setSavedProfiles(profiles);
    localStorage.setItem('pg_profiles', JSON.stringify(profiles));
  };

  const handleLoadProfile = (c: ConnectionConfig) => {
    setForm({ ...c });
    setActiveTab('basic');
    setTestResult({ status: 'idle', message: '' });
  };

  const dsn = form.host && form.database
    ? `postgresql://${form.user}${form.password ? ':***' : ''}@${form.host}:${form.port}/${form.database}${form.ssl ? '?sslmode=require' : ''}`
    : '';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-[560px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Icon name="Database" size={16} className="text-blue-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-800 text-sm">Подключение к PostgreSQL</div>
            <div className="text-xs text-gray-400">Настройте параметры вашего PostgreSQL сервера</div>
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
            { id: 'profiles', label: 'Профили', icon: 'BookMarked' },
          ] as const).map(tab => (
            <button key={tab.id}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab(tab.id)}>
              <Icon name={tab.icon as 'Settings2'} size={13} fallback="Settings2" />{tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── BASIC ── */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 block mb-1">Хост <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <Icon name="Server" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                      placeholder="localhost или IP-адрес"
                      value={form.host} onChange={e => set('host', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Порт <span className="text-red-400">*</span></label>
                  <input className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                    placeholder="5432" value={form.port}
                    onChange={e => set('port', e.target.value.replace(/\D/g, ''))} maxLength={5} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">База данных <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Icon name="Database" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                    placeholder="my_database" value={form.database} onChange={e => set('database', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Пользователь <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Icon name="User" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                    placeholder="postgres" value={form.user} onChange={e => set('user', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Пароль</label>
                <div className="relative">
                  <Icon name="Lock" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'}
                    className="w-full pl-8 pr-9 py-2 text-sm border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                    placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} />
                  <button type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(p => !p)}>
                    <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={13} />
                  </button>
                </div>
              </div>

              {dsn && (
                <div className="bg-gray-50 border rounded-lg px-3 py-2">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Строка подключения</div>
                  <div className="font-mono text-xs text-gray-600 break-all">{dsn}</div>
                </div>
              )}

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex gap-2">
                  <Icon name="Info" size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700 leading-relaxed">
                    После сохранения все таблицы, папки и данные будут загружаться из вашего PostgreSQL сервера.
                    При первом подключении необходимые таблицы будут созданы автоматически.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ADVANCED ── */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-700">SSL / TLS шифрование</div>
                  <div className="text-xs text-gray-400 mt-0.5">Зашифрованное соединение (sslmode=require)</div>
                </div>
                <button type="button" onClick={() => set('ssl', !form.ssl)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.ssl ? 'bg-blue-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.ssl ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Таймаут подключения (сек)</label>
                <input type="number" min="1" max="60"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                  value={form.connectTimeout} onChange={e => set('connectTimeout', e.target.value)} />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Строка для переменной окружения</label>
                <div className="bg-gray-900 rounded-lg px-3 py-2.5 font-mono text-xs text-green-300 break-all select-all">
                  {`DATABASE_URL=postgresql://${form.user}:${form.password || '<password>'}@${form.host}:${form.port}/${form.database}${form.ssl ? '?sslmode=require' : ''}`}
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <div className="flex gap-2">
                  <Icon name="AlertTriangle" size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700 leading-relaxed">
                    Убедитесь что ваш PostgreSQL сервер доступен по сети и разрешает подключения с внешних IP-адресов.
                    Для облачных БД (Supabase, Neon, Render) используйте Connection String из настроек сервиса.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PROFILES ── */}
          {activeTab === 'profiles' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-medium text-gray-600">Сохранённые профили</div>
                <button className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  onClick={() => setShowSaveProfile(p => !p)}>
                  <Icon name="Plus" size={12} />Сохранить текущий
                </button>
              </div>

              {showSaveProfile && (
                <div className="flex gap-2 mb-4">
                  <input autoFocus
                    className="flex-1 text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                    placeholder="Название (напр. Production DB)"
                    value={profileName} onChange={e => setProfileName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveProfile(); if (e.key === 'Escape') setShowSaveProfile(false); }} />
                  <button className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40"
                    disabled={!profileName.trim()} onClick={handleSaveProfile}>
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
                      <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon name="Database" size={14} className="text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-xs text-gray-400 truncate">
                          {p.config.user}@{p.config.host}:{p.config.port}/{p.config.database}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          onClick={() => handleLoadProfile(p.config)}>
                          Загрузить
                        </button>
                        <button className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                          onClick={() => handleDeleteProfile(i)}>
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
            'bg-red-50 text-red-700 border border-red-100'}`}>
            {testResult.status === 'testing' && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
            {testResult.status === 'success' && <Icon name="CheckCircle2" size={14} className="flex-shrink-0" />}
            {testResult.status === 'error' && <Icon name="XCircle" size={14} className="flex-shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-3 border-t bg-gray-50 flex-shrink-0 rounded-b-xl">
          <button onClick={handleTest} disabled={testResult.status === 'testing'}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border rounded-lg hover:bg-white transition-colors disabled:opacity-50">
            {testResult.status === 'testing'
              ? <><div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />Проверяем...</>
              : <><Icon name="Plug" size={14} />Проверить соединение</>}
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
            Отмена
          </button>
          <button onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Icon name="Save" size={14} />Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
