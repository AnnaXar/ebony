/**
 * ebony-framework
 *
 * @module bot
 * @author Christos Panagiotakopoulos <chrispanag@gmail.com>
 * @copyright Copyright(c) 2020 Christos Panagiotakopoulos
 * @license MIT
 */

import { Scenario, Module, BotOptions } from './interfaces/bot';
import { PostbackRoutes } from './routers/PostbackRouter';

import GenericAdapter from './adapter';

import User from './models/User';

import attachmentHandlerFactory from './handlers/attachment';
import textHandlerFactory from './handlers/text';
import nlpHandlerFactory from './handlers/nlp';

// Router Classes
import PostbackRouter from './routers/PostbackRouter';
import ReferralsRouter from './routers/ReferralsRouter';
import IntentRouter from './routers/IntentRouter';

import Actions from './utilities/actions';
import TextMatcher from './routers/TextMatcher';

import createScenario from './utilities/scenario';
/**
 * The Bot Class
 */
export default class Bot<U extends User<any>> {
    // Routers
    private postbackRouter = new PostbackRouter();
    private referralsRouter = new ReferralsRouter();
    private intentRouter = new IntentRouter();
    private textMatcher = new TextMatcher();

    public actions: Actions<U>;

    private adapter: GenericAdapter;
    private yesNoAnswer: any;
    public complexNlp: (...params: any) => Promise<any>;

    /**
     * Create a Bot
     */
    constructor(adapter: GenericAdapter, options: BotOptions<U>) {
        const { preSendMiddlewares = [], postSendMiddlewares = [] } = options;

        this.actions = new Actions<U>(preSendMiddlewares, postSendMiddlewares);

        this.adapter = adapter;

        this.complexNlp = defaultNlpHandler;

        const routers = {
            postbackRouter: this.postbackRouter,
            referralsRouter: this.referralsRouter,
            textMatcher: this.textMatcher
        };

        const nlpHandler = nlpHandlerFactory<U>(this.intentRouter, this.yesNoAnswer).bind(this);

        const handlers = {
            text: textHandlerFactory<U>(this.textMatcher, nlpHandler).bind(this),
            attachment: attachmentHandlerFactory<U>(this.yesNoAnswer)
        };

        this.adapter.init(routers, handlers);
    }

    /**
     * Adds a Module to the chatbot
     */
    public addModule(module: Module<U>) {
        const {
            routes = { stringPayloads: {}, objectPayloads: {} },
            actions = {},
            intents = {},
            referrals = {},
            text = [],
            nlp = () => Promise.resolve(),
            preMiddlewares = [],
            postMiddlewares = []
        } = module;

        this.actions.importActions(actions);
        this.actions.addMiddlewares('pre', preMiddlewares);
        this.actions.addMiddlewares('post', postMiddlewares);

        const postbackRoutes = this.compileRules(routes);
        this.postbackRouter.importRoutes(postbackRoutes);
        this.intentRouter.importRoutes(intents);
        this.referralsRouter.importRoutes(referrals);
        this.textMatcher.importRules(text);

        this.complexNlp = nlp;
    }

    // Actions
    public scenario(user: U): Scenario<GenericAdapter> {
        return createScenario(user.id, this.adapter);
    }

    private compileRules(routes: Module<U>['routes']) {
        const bot = this;
        if (routes === undefined) {
            return {};
        }

        const postbackRules: PostbackRoutes<U> = { stringPayloads: {}, objectPayloads: {} };
        for (const r in routes.stringPayloads) {
            if (postbackRules.stringPayloads) {
                postbackRules.stringPayloads[r] = (user: U, payload?: string) =>
                    bot.actions.exec(routes.stringPayloads[r], user, payload);
            }
        }
        for (const r in routes.objectPayloads) {
            if (postbackRules.objectPayloads) {
                postbackRules.objectPayloads[r] = (user: U, payload: any) =>
                    bot.actions.exec(routes.objectPayloads[r], user, payload);
            }
        }

        return postbackRules;
    }
}

function defaultNlpHandler() {
    return Promise.resolve();
}
