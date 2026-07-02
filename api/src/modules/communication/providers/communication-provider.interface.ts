export interface CommunicationProvider {
  /**
   * Connects or initializes a session for a specific tenant and channel.
   * @param tenantId The unique identifier of the tenant
   * @param channelId The unique identifier of the channel
   */
  connect(tenantId: string, channelId: string): Promise<void>;

  /**
   * Disconnects the session for a specific tenant and channel.
   * @param tenantId The unique identifier of the tenant
   * @param channelId The unique identifier of the channel
   */
  disconnect(tenantId: string, channelId: string): Promise<void>;

  /**
   * Sends a message via the provider.
   * @param tenantId The unique identifier of the tenant
   * @param channelId The unique identifier of the channel
   * @param to The recipient identifier (e.g., phone number)
   * @param content The text content of the message
   */
  sendMessage(
    tenantId: string,
    channelId: string,
    to: string,
    content: string,
  ): Promise<any>;
}
