declare module 'africastalking' {
  interface Credentials {
    apiKey: string;
    username: string;
  }

  interface SmsSendOptions {
    to: string[];
    message: string;
    from?: string;
  }

  interface SmsRecipient {
    number: string;
    cost: string;
    status: string;
    statusCode: number;
    messageId: string;
  }

  interface SmsSendResponse {
    SMSMessageData: {
      Message: string;
      Recipients: SmsRecipient[];
    };
  }

  interface SmsService {
    send(options: SmsSendOptions): Promise<SmsSendResponse>;
  }

  interface AfricasTalkingServices {
    SMS: SmsService;
  }

  function AfricasTalking(credentials: Credentials): AfricasTalkingServices;

  export = AfricasTalking;
}
