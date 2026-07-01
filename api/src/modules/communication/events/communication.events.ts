export const COMMUNICATION_EVENTS = {
  MESSAGE_RECEIVED: 'communication.messageOld.received',
  MESSAGE_SENT: 'communication.messageOld.sent',
  SESSION_STATUS_CHANGED: 'communication.session.status_changed',
  QR_CODE_GENERATED: 'communication.session.qr_code',
};

export class MessageReceivedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly provider: string,
    public readonly from: string,
    public readonly content: string,
    public readonly rawMessage: any
  ) {}
}

export class SessionStatusEvent {
  constructor(
    public readonly tenantId: string,
    public readonly provider: string,
    public readonly status: 'AUTHENTICATING' | 'READY' | 'DISCONNECTED' | 'QR_READY',
    public readonly data?: any
  ) {}
}