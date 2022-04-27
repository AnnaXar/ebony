import { Bot, InMemoryUser } from '@ebenos2/framework';
import { ViberAdapter } from '@ebenos2/viber-adapter';
import { viberConfig } from './secret';

import getStartedModule from './modules/getStarted';
import {
    IViberConversationStartedEvent,
    IViberSubscribedEvent,
    IViberUnsubscribedEvent
} from '@ebenos2/viber-adapter';

export const adapter = new ViberAdapter({
    authToken: viberConfig.auth_token,
    webhookHandlers: {
        conversationStartedWebhook: async (e: IViberConversationStartedEvent) => {
            console.log(e);
        },
        subscribeWebhook: async (e: IViberSubscribedEvent) => {
            console.log(e);
        },
        unsubscribeWebhook: async (e: IViberUnsubscribedEvent) => {
            console.log(e);
        }
    }
});

export const bot = new Bot<InMemoryUser>(adapter, {});

bot.addModule(getStartedModule);
