import { useState, useEffect } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { motion } from 'motion/react';
import axios from 'axios';
import { 
  Server, 
  Activity, 
  ListTodo, 
  History,
  Terminal,
  Play,
  RefreshCw,
  Clock,
  Edit3,
  Save,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Code,
  Square
} from 'lucide-react';

export function OperationsManager() {
  const { selectedTenant, flowApiKey } = useTenant();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
  
  const [activeTab, setActiveTab] = useState<'workers' | 'jobs' | 'executions' | 'scripts'>('workers');
  
  const [workers, setWorkers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [scripts, setScripts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [isEditScriptModalOpen, setIsEditScriptModalOpen] = useState(false);
  
  // Forms state
  const [newWorkerForm, setNewWorkerForm] = useState({ name: '', workerType: 'WINDOWS_NATIVE' });
  const [newScriptForm, setNewScriptForm] = useState({ name: '', language: 'NODEJS', content: '' });
  const [newJobForm, setNewJobForm] = useState({ name: '', jobType: 'SCRAPING', priority: 1, payload: '{}', cronExpression: '' });
  const [editJob, setEditJob] = useState<any>(null);
  const [editJobForm, setEditJobForm] = useState({ name: '', jobType: '', cronExpression: '' });
  const [isEditJobModalOpen, setIsEditJobModalOpen] = useState(false);
  const [editScript, setEditScript] = useState<any>(null);
  const [editScriptForm, setEditScriptForm] = useState({ name: '', language: '', content: '' });
  const [isSavingScript, setIsSavingScript] = useState(false);

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${apiUrl}/api/operations/workers`, newWorkerForm, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      });
      setIsWorkerModalOpen(false);
      setNewWorkerForm({ name: '', workerType: 'WINDOWS_NATIVE' });
      fetchWorkers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${apiUrl}/api/operations/jobs`, {
        ...newJobForm,
        isActive: newJobForm.isActive || false
      }, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      });
      setIsJobModalOpen(false);
      setNewJobForm({ name: '', jobType: 'SCRAPING', priority: 1, payload: '{}', cronExpression: '', isActive: false });
      fetchJobs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditJob = (job: any) => {
    setEditJob(job);
    setEditJobForm({ name: job.name, jobType: job.jobType, cronExpression: job.cronExpression || '' });
    setIsEditJobModalOpen(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editJob) return;
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${apiUrl}/api/operations/jobs/${editJob.id}`, editJobForm, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      });
      setIsEditJobModalOpen(false);
      setEditJob(null);
      fetchJobs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este Job?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${apiUrl}/api/operations/jobs/${jobId}`, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      });
      fetchJobs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${apiUrl}/api/operations/scripts`, newScriptForm, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      });
      setIsScriptModalOpen(false);
      setNewScriptForm({ name: '', language: 'NODEJS', content: '' });
      fetchScripts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditScript = (script: any) => {
    setEditScript(script);
    setEditScriptForm({ name: script.name, language: script.language, content: script.content || '' });
    setIsEditScriptModalOpen(true);
  };

  const handleSaveScript = async () => {
    if (!editScript) return;
    setIsSavingScript(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${apiUrl}/api/operations/scripts/${editScript.id}`, editScriptForm, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      });
      setIsEditScriptModalOpen(false);
      setEditScript(null);
      fetchScripts();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingScript(false);
    }
  };

  const handleExecuteJob = async (jobId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${apiUrl}/api/operations/executions/${jobId}/execute`, {}, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      });
      setActiveTab('executions');
    } catch (err) {
      console.error(err);
    }
  };

  const handleStopJob = async (jobId: string) => {
    if (!window.confirm('¿Seguro que deseas detener el cron automático de este Job en el Worker?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${apiUrl}/api/operations/executions/${jobId}/stop`, {}, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      });
      fetchJobs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (job: any) => {
    const newActive = !job.isActive;
    try {
      const token = localStorage.getItem('token');
      // Update the state
      await axios.patch(`${apiUrl}/api/operations/jobs/${job.id}`, { isActive: newActive }, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      });
      // Also emit start/stop to worker
      if (newActive) {
        await axios.post(`${apiUrl}/api/operations/executions/${job.id}/execute`, {}, {
          headers: { 'x-tenant-id': selectedTenant?.id || '', 'x-api-key': flowApiKey, 'Authorization': `Bearer ${token}` }
        });
      } else {
        await axios.post(`${apiUrl}/api/operations/executions/${job.id}/stop`, {}, {
          headers: { 'x-tenant-id': selectedTenant?.id || '', 'x-api-key': flowApiKey, 'Authorization': `Bearer ${token}` }
        });
      }
      fetchJobs();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWorkers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${apiUrl}/api/operations/workers`, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      });
      setWorkers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${apiUrl}/api/operations/jobs`, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      });
      setJobs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExecutions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${apiUrl}/api/operations/executions`, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      });
      setExecutions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchScripts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${apiUrl}/api/operations/scripts`, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      });
      setScripts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    if (activeTab === 'workers') await fetchWorkers();
    if (activeTab === 'scripts') await fetchScripts();
    if (activeTab === 'jobs') {
      await fetchJobs();
      await fetchScripts();
    }
    if (activeTab === 'executions') await fetchExecutions();
    setIsLoading(false);
  };


  useEffect(() => {
    let interval: any;
    if (activeTab === 'jobs' && selectedTenant) {
      interval = setInterval(() => {
        fetchJobs();
      }, 60000); // 1 minuto
    }
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [activeTab, selectedTenant]);

  useEffect(() => {
    loadData();
  }, [selectedTenant, activeTab]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="flex-none p-6 border-b border-slate-200 bg-white">
        <div className="flex justify-between items-center max-w-6xl mx-auto w-full">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Server className="w-6 h-6 text-blue-600" />
              Runtime Operations
            </h1>
            <p className="text-slate-500 mt-1">
              Gestión de Workers Deterministas y Orquestación de Trabajos para {selectedTenant?.name || 'la organización'}.
            </p>
          </div>
          <button 
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Actualizar Datos"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-6 max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('workers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'workers' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-4 h-4" />
              Workers
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'jobs' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ListTodo className="w-4 h-4" />
              Jobs
            </button>
            <button
              onClick={() => setActiveTab('scripts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'scripts' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Code className="w-4 h-4" />
              Scripts
            </button>
            <button
              onClick={() => setActiveTab('executions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'executions' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <History className="w-4 h-4" />
              Ejecuciones
            </button>
          </div>
          <div>
            {activeTab === 'workers' && (
              <button 
                onClick={() => setIsWorkerModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium">
                <Plus className="w-4 h-4" />
                Registrar Worker
              </button>
            )}
            {activeTab === 'jobs' && (
              <button 
                onClick={() => setIsJobModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                <Plus className="w-4 h-4" />
                Crear Job
              </button>
            )}
            {activeTab === 'scripts' && (
              <button 
                onClick={() => setIsScriptModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                <Plus className="w-4 h-4" />
                Crear Script
              </button>
            )}
            {activeTab === 'executions' && (
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors font-medium">
                <Play className="w-4 h-4" />
                Forzar Ejecución
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'workers' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {workers.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200">
                      <Server className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-slate-800">No hay Workers registrados</h3>
                      <p className="text-slate-500 mt-1">Los workers aparecerán aquí cuando se conecten al Runtime.</p>
                    </div>
                  ) : (
                    workers.map((worker) => (
                      <div key={worker.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${worker.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                              <Terminal className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-800">{worker.name}</h3>
                              <p className="text-xs text-slate-500">{worker.workerType}</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            worker.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-700' : 
                            worker.status === 'BUSY' ? 'bg-blue-100 text-blue-700' : 
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {worker.status}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between text-slate-600">
                            <span>Versión</span>
                            <span className="font-medium">{worker.version}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Último Latido</span>
                            <span className="font-medium">{worker.lastHeartbeat ? new Date(worker.lastHeartbeat).toLocaleTimeString() : 'Nunca'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'scripts' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {scripts.length === 0 ? (
                    <div className="text-center py-12">
                      <Code className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-slate-800">No hay Scripts</h3>
                      <p className="text-slate-500 mt-1">Crea un script para que tus workers puedan ejecutarlo.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                          <th className="p-4 font-medium">Nombre</th>
                          <th className="p-4 font-medium">Lenguaje</th>
                          <th className="p-4 font-medium">Versión</th>
                          <th className="p-4 font-medium">Fecha</th>
                          <th className="p-4 font-medium text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scripts.map((script) => (
                          <tr key={script.id} className="border-b border-slate-100 hover:bg-blue-50 cursor-pointer transition-colors" onClick={() => handleOpenEditScript(script)}>
                            <td className="p-4">
                              <p className="font-medium text-slate-800">{script.name}</p>
                              <p className="text-xs text-slate-500 font-mono">{script.id.substring(0, 8)}...</p>
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600 font-medium">
                                {script.language}
                              </span>
                            </td>
                            <td className="p-4 text-slate-600 text-sm">v{script.version}</td>
                            <td className="p-4 text-slate-600 text-sm">
                              {new Date(script.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-right">
                              <button className="text-purple-600 hover:text-purple-800 p-1 bg-purple-50 rounded" title="Editar Script">
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'jobs' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {jobs.length === 0 ? (
                    <div className="text-center py-12">
                      <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-slate-800">No hay Jobs</h3>
                      <p className="text-slate-500 mt-1">Crea un Job en la base de datos para verlo aquí.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                          <th className="p-4 font-medium">Nombre</th>
                          <th className="p-4 font-medium">Tipo</th>
                          <th className="p-4 font-medium">Última Ejecución</th>
                          <th className="p-4 font-medium">Estado</th>
                          <th className="p-4 font-medium text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map((job) => (
                          <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-800">{job.name}</p>
                                {job.cronExpression && (
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold" title="Automático (Cron)">
                                    Cron: {job.cronExpression}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">{job.id.substring(0, 8)}...</p>
                            </td>
                            <td className="p-4 text-slate-600 text-sm">
                              <span className="px-2 py-1 bg-slate-100 rounded text-xs">{job.jobType}</span>
                            </td>
                            <td className="p-4 text-slate-600 text-sm">
                              {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'Nunca'}
                            </td>
                            <td className="p-4">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                job.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                job.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {job.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-1">
                                {job.cronExpression ? (
                                  <button 
                                    onClick={() => handleToggleActive(job)} 
                                    className={`p-1 rounded text-xs font-medium px-2 flex items-center gap-1 ${
                                      job.isActive 
                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                    title={job.isActive ? "Desactivar Cron" : "Activar Cron"}
                                  >
                                    {job.isActive ? 'Activo' : 'Inactivo'}
                                  </button>
                                ) : (
                                  <button onClick={() => handleExecuteJob(job.id)} className="text-emerald-600 hover:text-emerald-800 p-1 bg-emerald-50 rounded" title="Ejecutar ahora">
                                    <Play className="w-4 h-4" />
                                  </button>
                                )}
                                <button onClick={() => handleOpenEditJob(job)} className="text-blue-600 hover:text-blue-800 p-1 bg-blue-50 rounded" title="Editar">
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteJob(job.id)} className="text-red-600 hover:text-red-800 p-1 bg-red-50 rounded" title="Eliminar">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'executions' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {executions.length === 0 ? (
                    <div className="text-center py-12">
                      <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-slate-800">No hay Ejecuciones</h3>
                      <p className="text-slate-500 mt-1">El historial de ejecuciones se mostrará aquí.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                          <th className="p-4 font-medium">Job ID</th>
                          <th className="p-4 font-medium">Worker ID</th>
                          <th className="p-4 font-medium">Inicio / Fin</th>
                          <th className="p-4 font-medium">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {executions.map((exec) => (
                          <tr key={exec.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-4">
                              <p className="text-sm text-slate-800 font-mono">{exec.jobId?.substring(0, 8)}</p>
                            </td>
                            <td className="p-4">
                              <p className="text-sm text-slate-600 font-mono">{exec.workerId?.substring(0, 8) || 'N/A'}</p>
                            </td>
                            <td className="p-4 text-sm text-slate-600">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {new Date(exec.startedAt).toLocaleString()}
                              </div>
                              {exec.completedAt && (
                                <div className="text-xs text-slate-500 mt-1">
                                  Terminado: {new Date(exec.completedAt).toLocaleTimeString()}
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {exec.status === 'COMPLETED' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                                 exec.status === 'FAILED' ? <XCircle className="w-4 h-4 text-red-500" /> :
                                 <AlertCircle className="w-4 h-4 text-blue-500" />}
                                <span className={`text-xs font-medium ${
                                  exec.status === 'COMPLETED' ? 'text-emerald-700' :
                                  exec.status === 'FAILED' ? 'text-red-700' :
                                  'text-blue-700'
                                }`}>
                                  {exec.status}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Modals */}
      {isWorkerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-semibold text-slate-800">Registrar Worker de Prueba</h2>
              <button onClick={() => setIsWorkerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateWorker} className="p-4 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Worker</label>
                  <input 
                    type="text" 
                    required 
                    value={newWorkerForm.name}
                    onChange={(e) => setNewWorkerForm({...newWorkerForm, name: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ej. DESKTOP-HQ123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Worker</label>
                  <select 
                    value={newWorkerForm.workerType}
                    onChange={(e) => setNewWorkerForm({...newWorkerForm, workerType: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="WINDOWS_NATIVE">Windows Native (C#)</option>
                    <option value="NODEJS">Node.js (Puppeteer/Playwright)</option>
                    <option value="PYTHON_CLI">Python CLI</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsWorkerModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isJobModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-semibold text-slate-800">Crear Nuevo Job</h2>
              <button onClick={() => setIsJobModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateJob} className="p-4 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Job</label>
                  <input 
                    type="text" 
                    required 
                    value={newJobForm.name}
                    onChange={(e) => setNewJobForm({...newJobForm, name: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ej. Descarga masiva SAT"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Trabajo</label>
                  <select 
                    value={newJobForm.jobType}
                    onChange={(e) => setNewJobForm({...newJobForm, jobType: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SCRAPING">Web Scraping (Selenium/Puppeteer)</option>
                    <option value="FILE_PROCESSING">Procesamiento de Archivos</option>
                    <option value="API_SYNC">Sincronización API</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vincular a Script (Opcional)</label>
                  <select 
                    onChange={(e) => {
                      if (e.target.value) {
                        setNewJobForm({...newJobForm, payload: JSON.stringify({ scriptId: e.target.value }, null, 2)});
                      }
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Sin Script (usar JSON) --</option>
                    {scripts.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.language})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad (1-100)</label>
                  <input 
                    type="number" 
                    min="1" max="100"
                    required 
                    value={newJobForm.priority}
                    onChange={(e) => setNewJobForm({...newJobForm, priority: parseInt(e.target.value) || 1})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payload (JSON)</label>
                  <textarea 
                    rows={4}
                    value={newJobForm.payload}
                    onChange={(e) => setNewJobForm({...newJobForm, payload: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="{}"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cron Expression (Opcional)</label>
                  <input 
                    type="text" 
                    value={newJobForm.cronExpression}
                    onChange={(e) => setNewJobForm({...newJobForm, cronExpression: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="ej. * * * * *"
                  />
                  <p className="text-xs text-slate-500 mt-1">El worker lo ejecutará automáticamente (ej. cada minuto: * * * * *)</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsJobModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Crear Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditJobModalOpen && editJob && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-semibold text-slate-800">Editar Job</h2>
              <button onClick={() => setIsEditJobModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveJob} className="p-4 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                  <input 
                    type="text" 
                    required 
                    value={editJobForm.name}
                    onChange={(e) => setEditJobForm({...editJobForm, name: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cron Expression (Opcional)</label>
                  <input 
                    type="text" 
                    value={editJobForm.cronExpression}
                    onChange={(e) => setEditJobForm({...editJobForm, cronExpression: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-1">Dejar vacío para ejecución manual.</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsEditJobModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isScriptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Code className="w-5 h-5 text-purple-600" />
                Registrar Nuevo Script
              </h2>
              <button onClick={() => setIsScriptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateScript} className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Script</label>
                  <input 
                    type="text" 
                    required 
                    value={newScriptForm.name}
                    onChange={(e) => setNewScriptForm({...newScriptForm, name: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="ej. Login SAT"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lenguaje</label>
                  <select 
                    value={newScriptForm.language}
                    onChange={(e) => setNewScriptForm({...newScriptForm, language: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="NODEJS">Node.js</option>
                    <option value="PYTHON">Python</option>
                    <option value="POWERSHELL">PowerShell</option>
                    <option value="BASH">Bash</option>
                  </select>
                </div>
              </div>
              <div className="flex-1 min-h-[300px] flex flex-col">
                <label className="block text-sm font-medium text-slate-700 mb-1">Código Fuente</label>
                <textarea 
                  required
                  value={newScriptForm.content}
                  onChange={(e) => setNewScriptForm({...newScriptForm, content: e.target.value})}
                  className="w-full flex-1 border border-slate-300 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50 whitespace-pre"
                  placeholder={`// Escribe aquí tu código en ${newScriptForm.language}\nconsole.log("Iniciando script...");`}
                />
              </div>
              <div className="mt-2 flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsScriptModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Guardar Script
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditScriptModalOpen && editScript && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-600" />
                Editar Script: {editScript.name}
              </h2>
              <button onClick={() => setIsEditScriptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                  <input 
                    type="text" 
                    value={editScriptForm.name}
                    onChange={(e) => setEditScriptForm({...editScriptForm, name: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lenguaje</label>
                  <select 
                    value={editScriptForm.language}
                    onChange={(e) => setEditScriptForm({...editScriptForm, language: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="NODEJS">Node.js</option>
                    <option value="PYTHON">Python</option>
                    <option value="POWERSHELL">PowerShell</option>
                    <option value="BASH">Bash</option>
                  </select>
                </div>
              </div>
              <div className="flex-1 min-h-[400px] flex flex-col">
                <label className="block text-sm font-medium text-slate-700 mb-1">Código Fuente</label>
                <textarea 
                  value={editScriptForm.content}
                  onChange={(e) => setEditScriptForm({...editScriptForm, content: e.target.value})}
                  className="w-full flex-1 border border-slate-300 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-900 text-green-400 whitespace-pre"
                  style={{ minHeight: '400px', tabSize: 2 }}
                  spellCheck={false}
                />
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500">ID: {editScript.id}</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsEditScriptModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveScript}
                    disabled={isSavingScript}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingScript ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
