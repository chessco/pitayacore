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
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

export function OperationsManager() {
  const { selectedTenant, flowApiKey } = useTenant();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
  
  const [activeTab, setActiveTab] = useState<'workers' | 'jobs' | 'executions'>('workers');
  
  const [workers, setWorkers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const loadData = async () => {
    setIsLoading(true);
    if (activeTab === 'workers') await fetchWorkers();
    if (activeTab === 'jobs') await fetchJobs();
    if (activeTab === 'executions') await fetchExecutions();
    setIsLoading(false);
  };

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
        
        <div className="flex items-center gap-4 mt-6 max-w-6xl mx-auto w-full">
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
                          <th className="p-4 font-medium">Prioridad</th>
                          <th className="p-4 font-medium">Estado</th>
                          <th className="p-4 font-medium text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map((job) => (
                          <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-4">
                              <p className="font-medium text-slate-800">{job.name}</p>
                              <p className="text-xs text-slate-500">{job.id.substring(0, 8)}...</p>
                            </td>
                            <td className="p-4 text-slate-600 text-sm">
                              <span className="px-2 py-1 bg-slate-100 rounded text-xs">{job.jobType}</span>
                            </td>
                            <td className="p-4 text-slate-600 text-sm">{job.priority}</td>
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
                              <button className="text-blue-600 hover:text-blue-800 p-1 bg-blue-50 rounded" title="Ejecutar ahora">
                                <Play className="w-4 h-4" />
                              </button>
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
    </div>
  );
}
