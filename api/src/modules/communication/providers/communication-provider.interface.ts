export interface CommunicationProvider {
  /**
   * Connects or initializes a session for a specific tenant.
   * @param tenantId The unique identifier of the tenant
   */
  connect(tenantId: string): Promise<void>;

  /**
   * Disconnects the session for a specific tenant.
   * @param tenantId The unique identifier of the tenant
   */
  disconnect(tenantId: string): Promise<void>;

  /**
   * Sends a message via the provider.
   * @param tenantId The unique identifier of the tenant
   * @param to The recipient identifier (e.g., phone number)
   * @param content The text content of the message
   */
  sendMessage(tenantId: string, to: string, content: string): Promise<any>;
}