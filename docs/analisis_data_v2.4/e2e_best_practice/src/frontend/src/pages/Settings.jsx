import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { telegramService } from '../services/telegramService.js';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Edit2, Check, X, Shield, ShieldAlert, Bot, User } from 'lucide-react';
import LoadingSpinner from '../components/atoms/LoadingSpinner.jsx';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('bots');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">System Settings</h1>
      
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 font-medium transition-colors duration-200 ${
            activeTab === 'bots'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('bots')}
        >
          Telegram Bots
        </button>
        <button
          className={`py-2 px-4 font-medium transition-colors duration-200 ${
            activeTab === 'recipients'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('recipients')}
        >
          Telegram Recipients
        </button>
        <button
          className={`py-2 px-4 font-medium transition-colors duration-200 ${
            activeTab === 'features'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('features')}
        >
          Feature Flags
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'bots' ? <BotsManager /> : activeTab === 'recipients' ? <RecipientsManager /> : <FeatureFlags /> }
      </div>
    </div>
  );
};

const BotsManager = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingBot, setEditingBot] = useState(null);
  const [formData, setFormData] = useState({ botName: '', botToken: '', isActive: true });

  const { data: bots = [], isLoading, isError } = useQuery({
    queryKey: ['bots'],
    queryFn: telegramService.getBots,
  });

  React.useEffect(() => {
    if (isError) {
      toast.error('Failed to fetch bots');
    }
  }, [isError]);

  const createMutation = useMutation({
    mutationFn: telegramService.createBot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] });
      toast.success('Bot created successfully');
      setShowModal(false);
      resetForm();
    },
    onError: () => toast.error('Operation failed')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => telegramService.updateBot(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] });
      toast.success('Bot updated successfully');
      setShowModal(false);
      resetForm();
    },
    onError: () => toast.error('Operation failed')
  });

  const deleteMutation = useMutation({
    mutationFn: telegramService.deleteBot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] });
      toast.success('Bot deleted');
    },
    onError: () => toast.error('Failed to delete bot')
  });

  const resetForm = () => {
    setEditingBot(null);
    setFormData({ botName: '', botToken: '', isActive: true });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingBot) {
      updateMutation.mutate({ id: editingBot.botId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure?')) {
      deleteMutation.mutate(id);
    }
  };

  const openEdit = (bot) => {
    setEditingBot(bot);
    setFormData({ botName: bot.botName, botToken: bot.botToken, isActive: bot.isActive });
    setShowModal(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5" /> Managed Bots
        </h2>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Add Bot
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token (Masked)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bots.map((bot) => (
                <tr key={bot.botId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bot.botName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {bot.botToken ? `${bot.botToken.substring(0, 5)}...${bot.botToken.slice(-5)}` : '******'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bot.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {bot.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => openEdit(bot)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(bot.botId)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {bots.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No bots found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editingBot ? 'Edit Bot' : 'Add New Bot'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="bot-name-input" className="block text-sm font-medium text-gray-700">Bot Name</label>
                <input
                  id="bot-name-input"
                  name="bot_name"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                  value={formData.botName}
                  onChange={(e) => setFormData({ ...formData, botName: e.target.value })}
                />
              </div>
              <div className="mb-4">
                <label htmlFor="bot-token-input" className="block text-sm font-medium text-gray-700">Bot Token</label>
                <input
                  id="bot-token-input"
                  name="bot_token"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                  value={formData.botToken}
                  onChange={(e) => setFormData({ ...formData, botToken: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">Found in BotFather</p>
              </div>
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="bot-active-checkbox"
                  name="is_active"
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 mr-2"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <label htmlFor="bot-active-checkbox" className="text-sm font-medium text-gray-700">Active</label>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const RecipientsManager = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState(null);
  const [formData, setFormData] = useState({
    chatId: '',
    botId: '',
    alertLevels: ['critical'],
    isActive: true
  });

  const { data: recipients = [], isLoading: isLoadingRecipients, isError: isRecipientsError } = useQuery({
    queryKey: ['recipients'],
    queryFn: telegramService.getRecipients,
  });

  const { data: bots = [], isLoading: isLoadingBots, isError: isBotsError } = useQuery({
    queryKey: ['bots'],
    queryFn: telegramService.getBots,
  });

  React.useEffect(() => {
    if (isRecipientsError) {
      toast.error('Failed to fetch recipients');
    }
  }, [isRecipientsError]);

  React.useEffect(() => {
    if (isBotsError) {
      toast.error('Failed to fetch bots');
    }
  }, [isBotsError]);

  const createMutation = useMutation({
    mutationFn: telegramService.createRecipient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipients'] });
      toast.success('Recipient added');
      setShowModal(false);
      resetForm();
    },
    onError: () => toast.error('Operation failed')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => telegramService.updateRecipient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipients'] });
      toast.success('Recipient updated');
      setShowModal(false);
      resetForm();
    },
    onError: () => toast.error('Operation failed')
  });

  const deleteMutation = useMutation({
    mutationFn: telegramService.deleteRecipient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipients'] });
      toast.success('Recipient deleted');
    },
    onError: () => toast.error('Failed to delete recipient')
  });

  const resetForm = () => {
    setEditingRecipient(null);
    setFormData({
      chatId: '',
      botId: bots.length > 0 ? bots[0].botId : '',
      alertLevels: ['critical'],
      isActive: true
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      chatId: parseInt(formData.chatId),
      botId: parseInt(formData.botId)
    };

    if (editingRecipient) {
      updateMutation.mutate({ id: editingRecipient.recipientId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure?')) {
      deleteMutation.mutate(id);
    }
  };

  const openEdit = (recipient) => {
    setEditingRecipient(recipient);
    setFormData({
      chatId: recipient.chatId,
      botId: recipient.botId,
      alertLevels: recipient.alertLevels || [],
      isActive: recipient.isActive
    });
    setShowModal(true);
  };

  const toggleAlertLevel = (level) => {
    const currentLevels = formData.alertLevels;
    if (currentLevels.includes(level)) {
      setFormData({ ...formData, alertLevels: currentLevels.filter(l => l !== level) });
    } else {
      setFormData({ ...formData, alertLevels: [...currentLevels, level] });
    }
  };

  const isLoading = isLoadingRecipients || isLoadingBots;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <User className="w-5 h-5" /> Alert Recipients
        </h2>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Add Recipient
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chat ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bot</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alert Levels</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recipients.map((recipient) => {
                const bot = bots.find(b => b.botId === recipient.botId);
                return (
                  <tr key={recipient.recipientId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{recipient.chatId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bot ? bot.botName : 'Unknown Bot'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex gap-1 flex-wrap">
                        {recipient.alertLevels?.map(level => (
                          <span key={level} className="px-2 py-0.5 rounded text-xs bg-gray-100 border border-gray-300">
                            {level}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${recipient.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {recipient.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => openEdit(recipient)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(recipient.recipientId)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {recipients.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No recipients found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editingRecipient ? 'Edit Recipient' : 'Add New Recipient'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="recipient-chat-id" className="block text-sm font-medium text-gray-700">Chat ID</label>
                <input
                  id="recipient-chat-id"
                  name="chat_id"
                  type="number"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                  value={formData.chatId}
                  onChange={(e) => setFormData({ ...formData, chatId: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">From user's Telegram ID</p>
              </div>
              <div className="mb-4">
                <label htmlFor="recipient-bot-select" className="block text-sm font-medium text-gray-700">Bot</label>
                <select
                  id="recipient-bot-select"
                  name="bot_id"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                  value={formData.botId}
                  onChange={(e) => setFormData({ ...formData, botId: e.target.value })}
                >
                  <option value="">Select a bot</option>
                  {bots.map(bot => (
                    <option key={bot.botId} value={bot.botId}>{bot.botName}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Alert Levels</label>
                <div className="flex gap-2 flex-wrap">
                  {['info', 'warning', 'critical', 'resolved'].map(level => (
                    <button
                      type="button"
                      key={level}
                      onClick={() => toggleAlertLevel(level)}
                      className={`px-3 py-1 rounded-full text-sm border ${
                        formData.alertLevels.includes(level)
                          ? 'bg-blue-100 border-blue-500 text-blue-700'
                          : 'bg-gray-50 border-gray-300 text-gray-600'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="recipient-active-checkbox"
                  name="is_active"
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 mr-2"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <label htmlFor="recipient-active-checkbox" className="text-sm font-medium text-gray-700">Active</label>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const FeatureFlags = () => {
  const [v2LocalFlag, setV2LocalFlag] = React.useState(
    typeof window !== 'undefined' && localStorage.getItem('enableAnalysisV2') === 'true'
  );
  const v2EffectiveFlag =
    (typeof window !== 'undefined' && localStorage.getItem('enableAnalysisV2') === 'true') ||
    (import.meta.env && import.meta.env.VITE_ENABLE_ANALYSIS_V2 === 'true');
  const v1LocalRaw = (typeof window !== 'undefined') ? localStorage.getItem('enableAnalysisV1') : null;
  const v1EffectiveEnabled = (import.meta.env && import.meta.env.VITE_ENABLE_ANALYSIS_V1 === 'false')
    ? false
    : (v1LocalRaw === 'false' ? false : true);
  const v1LocalFlag = v1LocalRaw === 'false' ? false : true;

  const enableV2 = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('enableAnalysisV2', 'true');
    setV2LocalFlag(true);
    toast.success('Analisis V2 diaktifkan');
    setTimeout(() => window.location.reload(), 600);
  };
  const disableV2 = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('enableAnalysisV2');
    setV2LocalFlag(false);
    toast.success('Analisis V2 dimatikan');
    setTimeout(() => window.location.reload(), 600);
  };
  const showV1 = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('enableAnalysisV1', 'true');
    toast.success('Analisis V1 ditampilkan');
    setTimeout(() => window.location.reload(), 600);
  };
  const hideV1 = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('enableAnalysisV1', 'false');
    toast.success('Analisis V1 disembunyikan dari Sidebar');
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <div className="space-y-8">
      {/* V2 FLAG */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5" /> Analisis V2
          </h2>
          <p className="text-sm text-gray-600 mt-1">Mengaktifkan menu “Analisis V2” pada sidebar. V2 terisolasi penuh dari V1.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Status Efektif:</span>
            <span className={`px-2 py-0.5 rounded text-xs ${v2EffectiveFlag ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {v2EffectiveFlag ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Local Flag:</span>
            <span className={`px-2 py-0.5 rounded text-xs ${v2LocalFlag ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
              {v2LocalFlag ? 'true' : 'unset'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={enableV2}
            disabled={v2EffectiveFlag}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Aktifkan Analisis V2
          </button>
          <button
            onClick={disableV2}
            disabled={!v2EffectiveFlag && !v2LocalFlag}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Nonaktifkan Analisis V2
          </button>
        </div>
        <div className="text-xs text-gray-500">
          Jika environment VITE_ENABLE_ANALYSIS_V2=true, status efektif tetap aktif walaupun local flag dimatikan.
        </div>
      </div>

      {/* V1 FLAG */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" /> Analisis V1 (Hide/Show)
          </h2>
          <p className="text-sm text-gray-600 mt-1">Menyembunyikan/menampilkan menu “Analisis” (V1) pada sidebar. Tidak mengubah fungsi V1.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Status Efektif:</span>
            <span className={`px-2 py-0.5 rounded text-xs ${v1EffectiveEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {v1EffectiveEnabled ? 'Ditampilkan' : 'Tersembunyi'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Local Flag:</span>
            <span className={`px-2 py-0.5 rounded text-xs ${v1LocalFlag ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
              {v1LocalFlag ? 'true/unspecified' : 'false'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={showV1}
            disabled={v1EffectiveEnabled}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            Tampilkan Analisis V1
          </button>
          <button
            onClick={hideV1}
            disabled={!v1EffectiveEnabled}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Sembunyikan Analisis V1
          </button>
        </div>
        <div className="text-xs text-gray-500">
          Jika environment VITE_ENABLE_ANALYSIS_V1=false, menu V1 akan tetap tersembunyi meskipun local flag diatur ke true.
        </div>
      </div>
    </div>
  );
};

export default Settings;
