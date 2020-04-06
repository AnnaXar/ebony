import { Router } from 'express';
import PostbackRouter from './routers/PostbackRouter';
import ReferralsRouter from './routers/ReferralsRouter';
import TextMatcher from './routers/TextMatcher';
import User from './models/User';
import { IUser } from './models/UserSchema';
import { GenericAttachment } from './interfaces/attachment';
import { WitNLP } from './interfaces/nlp';
import { ISerializable } from '.';

// type UserModel = (new <T extends User>(...params: any) => T) | (new (...params: any) => User);

export interface UserModel<U extends User> {
    new (...params: any): U;
    findByProviderId: (id: string) => Promise<IUser | null>;
}

// TODO: Add all
export interface IRouters {
    PostbackRouter?: PostbackRouter;
    ReferralsRouter?: ReferralsRouter;
    TextMatcher?: TextMatcher;
}

export interface EbonyHandlers<U extends User> {
    attachment?: (user: User, attachment: GenericAttachment) => Promise<any>;
    text?: (message: { text: string }, nlp: WitNLP | undefined, user: U) => Promise<any>;
}

export interface IBaseMessageOptions {
    delay: number;
}

export interface IBaseMessage<T extends IBaseMessageOptions> {
    type: 'message' | 'typing_on' | 'typing_off' | 'mark_seen';
    id: string;
    message?: ISerializable;
    options?: Partial<T>;
}

export default abstract class GenericAdapter<U extends User = User> {
    public webhook: Router;
    protected handlers: EbonyHandlers<U>;
    protected routers: IRouters;
    protected userModel: UserModel<U | User>;

    // This is the sendAPI method
    public abstract sender: <T extends IBaseMessageOptions = IBaseMessageOptions>(
        messages: Array<IBaseMessage<T>>,
        order: 'ORDERED' | 'UNORDERED'
    ) => Promise<any>;

    protected providerName: string;

    constructor(providerName: string, userModel: UserModel<U | User> = User) {
        this.webhook = Router();
        this.handlers = {};

        this.routers = {};

        this.userModel = userModel;
        this.providerName = providerName;
    }

    get provider() {
        return this.providerName;
    }

    public setRouters(routers: IRouters) {
        this.routers = routers;
    }

    public setHandlers(handlers: EbonyHandlers<U>) {
        this.handlers = handlers;
    }

    public abstract initWebhook(): void;

    // Available Actions

    public userLoader(...args: any): (id: string) => Promise<U> {
        return async (id: string) => {
            try {
                const userData = await this.userModel.findByProviderId(id);
                if (!userData) {
                    const newUser = new this.userModel({
                        id,
                        provider: this.providerName
                    }) as U;
                    newUser.save();

                    return newUser;
                }

                return new this.userModel(userData) as U;
            } catch (err) {
                throw err;
            }
        };
    }

    public init(routers: InitOptionsRouters, handlers: InitOptionsHandlers<U>) {
        this.setRouters({
            PostbackRouter: routers.postbackRouter,
            ReferralsRouter: routers.referralsRouter,
            TextMatcher: routers.textMatcher
        });

        this.setHandlers({
            text: handlers.text
        });

        this.initWebhook();
    }
}

interface InitOptionsRouters {
    postbackRouter: PostbackRouter;
    referralsRouter: ReferralsRouter;
    textMatcher: TextMatcher;
}

interface InitOptionsHandlers<U extends User> {
    text: (message: { text: string }, nlp: WitNLP | undefined, user: U) => any;
}