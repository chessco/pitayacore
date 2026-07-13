import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentsManager } from './AgentsManager';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock Tenant Context
vi.mock('../../contexts/TenantContext', () => ({
  useTenant: () => ({
    selectedTenant: { id: 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718', name: 'Acuaequipos' },
    flowApiKey: 'test_api_key_2026',
  }),
}));

describe('AgentsManager Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'mock_jwt_token');
  });

  it('debería renderizar la lista de agentes cargada desde el API', async () => {
    const mockAgents = [
      { id: 'agent-1', name: 'Agente de Ventas', slug: 'ventas', prompt: 'Prompt ventas', status: 'PRODUCTION', version: '1.0' },
      { id: 'agent-2', name: 'Agente de Soporte', slug: 'soporte', prompt: 'Prompt soporte', status: 'PRE_PRODUCTION', version: '0.5' }
    ];

    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/api/agents')) {
        return Promise.resolve({ data: mockAgents });
      }
      if (url.includes('/api/skills')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    render(<AgentsManager />);

    expect(screen.getByText(/Orquestador de Staff Virtual/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Agente de Ventas')).toBeInTheDocument();
      expect(screen.getByText('Agente de Soporte')).toBeInTheDocument();
    });
  });

  it('debería permitir abrir el modal de creación y enviar POST para crear un agente', async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/api/agents')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/api/skills')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    render(<AgentsManager />);

    // Click "Contratar Nuevo Perfil" button
    const newButton = screen.getByText(/Contratar Nuevo Perfil/i);
    fireEvent.click(newButton);

    // Modal forms fields should exist
    const nameInput = screen.getByPlaceholderText(/Ej: Don Juan/i);
    const slugInput = screen.getByPlaceholderText(/ej: marketing-pro/i);
    const promptInput = screen.getByPlaceholderText(/Describe cómo debe actuar/i);

    fireEvent.change(nameInput, { target: { value: 'Nuevo Agente Test' } });
    fireEvent.change(slugInput, { target: { value: 'nuevo-agente-test' } });
    fireEvent.change(promptInput, { target: { value: 'Prompt del nuevo agente' } });

    const createButton = screen.getByText(/Crear Perfil de Staff/i);
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/agents'),
        { name: 'Nuevo Agente Test', slug: 'nuevo-agente-test', prompt: 'Prompt del nuevo agente' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-tenant-id': 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718',
            'x-api-key': 'test_api_key_2026',
            'Authorization': 'Bearer mock_jwt_token',
          })
        })
      );
    });
  });

  it('debería permitir guardar cambios al editar un agente', async () => {
    const mockAgent = { id: 'agent-1', name: 'Agente Ventas', slug: 'ventas', prompt: 'Prompt ventas', status: 'PRODUCTION', version: '1.0' };
    
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/api/agents')) {
        return Promise.resolve({ data: [mockAgent] });
      }
      if (url.includes('/api/skills')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
    mockedAxios.patch.mockResolvedValue({ data: { success: true } });

    const { container } = render(<AgentsManager />);

    // Wait for list to load and select the agent
    const agentListItem = await screen.findByText('Agente Ventas');
    fireEvent.click(agentListItem);

    // Prompt editor text area should have prompt
    const textarea = screen.getByDisplayValue('Prompt ventas');
    fireEvent.change(textarea, { target: { value: 'Nuevo Prompt Ventas Modificado' } });

    // Click "Guardar Cambios"
    const saveButton = screen.getByRole('button', { name: /Guardar Cambios/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/api/agents/agent-1'),
        expect.objectContaining({
          name: 'Agente Ventas',
          prompt: 'Nuevo Prompt Ventas Modificado',
        }),
        expect.any(Object)
      );
    });
  });
});
