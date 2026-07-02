import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useTenant } from '../../../contexts/TenantContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3014';

export function useWorkspaceNotes() {
  const queryClient = useQueryClient();
  const { selectedTenant } = useTenant();
  const tenantId = selectedTenant?.id;

  const headers = {
    'x-tenant-id': tenantId || '',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  };

  const { data: notes, isLoading } = useQuery({
    queryKey: ['workspace-notes', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const res = await axios.get(`${API_URL}/api/workspace/notes`, { headers });
      return res.data;
    },
    enabled: !!tenantId,
  });

  const createNote = useMutation({
    mutationFn: async (data: any) => {
      const res = await axios.post(`${API_URL}/api/workspace/notes`, data, { headers });
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-notes', tenantId] }),
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await axios.patch(`${API_URL}/api/workspace/notes/${id}`, data, { headers });
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-notes', tenantId] }),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${API_URL}/api/workspace/notes/${id}`, { headers });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-notes', tenantId] }),
  });

  const voteNote = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const res = await axios.post(`${API_URL}/api/workspace/notes/${id}/vote`, { value }, { headers });
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-notes', tenantId] }),
  });

  return { notes, isLoading, createNote, updateNote, deleteNote, voteNote };
}
