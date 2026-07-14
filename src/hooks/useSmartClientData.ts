import { supabase } from '@/integrations/supabase/client';

export interface SmartClientData {
  // Client data
  clientName: string;
  clientCpfCnpj: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientAge: string;
  clientProfession: string;
  contractNumber: string;
  // Project data
  presentationNumber: string;
  projectId: string | null;
  clientId: string | null;
}

export const emptyClientData: SmartClientData = {
  clientName: '',
  clientCpfCnpj: '',
  clientPhone: '',
  clientEmail: '',
  clientAddress: '',
  clientCity: '',
  clientState: '',
  clientAge: '',
  clientProfession: '',
  contractNumber: '',
  presentationNumber: '',
  projectId: null,
  clientId: null,
};

/**
 * Fetches existing client data based on FOCCO project number
 * Returns data to auto-fill form fields
 */
export async function fetchClientDataByFocco(foccoNumber: string): Promise<SmartClientData | null> {
  if (!foccoNumber.trim()) return null;
  
  try {
    // First, find the project by FOCCO number
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, client_id')
      .eq('focco_project_number', foccoNumber.trim())
      .maybeSingle();
    
    if (projectError) throw projectError;
    if (!project) return null;
    
    // If project has a client, fetch client data
    if (project.client_id) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', project.client_id)
        .single();
      
      if (clientError) throw clientError;
      
      if (client) {
        return {
          clientName: client.name || '',
          clientCpfCnpj: client.cpf_cnpj || '',
          clientPhone: client.phone || '',
          clientEmail: client.email || '',
          clientAddress: client.address || '',
          clientCity: client.city || '',
          clientState: client.state || '',
          clientAge: client.age?.toString() || '',
          clientProfession: client.profession || '',
          contractNumber: client.contract_number || '',
          presentationNumber: '',
          projectId: project.id,
          clientId: project.client_id,
        };
      }
    }
    
    // Project exists but no client data yet
    return {
      ...emptyClientData,
      projectId: project.id,
    };
  } catch (error) {
    console.error('Error fetching client data by FOCCO:', error);
    return null;
  }
}

/**
 * Fetches existing client data based on contract number
 * Returns data to auto-fill form fields
 */
export async function fetchClientDataByContract(contractNumber: string): Promise<SmartClientData | null> {
  if (!contractNumber.trim()) return null;
  
  try {
    // Find client by contract number
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('contract_number', contractNumber.trim())
      .maybeSingle();
    
    if (clientError) throw clientError;
    if (!client) return null;
    
    // Try to find associated project
    const { data: project } = await supabase
      .from('projects')
      .select('id, focco_project_number')
      .eq('client_id', client.id)
      .maybeSingle();
    
    return {
      clientName: client.name || '',
      clientCpfCnpj: client.cpf_cnpj || '',
      clientPhone: client.phone || '',
      clientEmail: client.email || '',
      clientAddress: client.address || '',
      clientCity: client.city || '',
      clientState: client.state || '',
      clientAge: client.age?.toString() || '',
      clientProfession: client.profession || '',
      contractNumber: client.contract_number || '',
      presentationNumber: '',
      projectId: project?.id || null,
      clientId: client.id,
    };
  } catch (error) {
    console.error('Error fetching client data by contract:', error);
    return null;
  }
}

/**
 * Updates client data with new values (only updates non-empty fields)
 * Used for progressive data filling
 */
export async function updateClientData(
  clientId: string,
  updates: Partial<{
    name: string;
    cpf_cnpj: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    age: number;
    profession: string;
    contract_number: string;
  }>
): Promise<boolean> {
  try {
    // Filter out empty values - only update fields that have data
    const filteredUpdates: Record<string, unknown> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        filteredUpdates[key] = value;
      }
    });
    
    if (Object.keys(filteredUpdates).length === 0) return true;
    
    const { error } = await supabase
      .from('clients')
      .update(filteredUpdates as never)
      .eq('id', clientId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating client data:', error);
    return false;
  }
}
