import { withHermes, Dialog } from 'hermes-javascript'
import bootstrap from './bootstrap'
import { mode, translation, logger } from './utils'
import { configFactory } from './factories'
import { 
    onIntentDetected,
    onSessionToggle
} from './binding'
import { SnipsPlayer } from './SnipsPlayer'
import { HandlerOptions } from './handlers';
import {
    CONFIDENCE_DEFAULT
} from './constants'

// Initialize hermes
export default function ({
    hermesOptions = {
        // debug mock
        address: 'snips-assistant-demo.local:1883'
    },
    bootstrapOptions = {}
} = {}) : Promise<() => void>{
    return new Promise((resolve, reject) => {
        withHermes(async (hermes, done) => {
            try {
                // Bootstrap config, locale, i18n…
                await bootstrap(bootstrapOptions)
                const config = configFactory.get()

                hermes.feedback().publish('notification_off', {
                    siteId: 'default'
                })

                const say: any = (text: string, siteId?: string) => {
                    hermes.dialog().publish('start_session', {
                        init: {
                            type: Dialog.enums.initType.notification,
                            text
                        },
                        siteId
                    })
                }

                const musicPlayer = new SnipsPlayer(hermes.dialog(), {
                    host: String(config.mpdHost) || undefined,
                    port: Number(config.mpdPort) || undefined,
                    volumeAutoReset: Boolean(config.volumeAutoReset) || undefined,
                    volumeTimeout: Number(config.volumeTimeout) || undefined,
                    playerMode: String(config.playerModeDefault) || undefined,
                    onReady: () => say('Hello there! I\'m an Offline Music Assistant pwered by Snips Flow.'),
                    onDisconnect: () => say(translation.randomTranslation('error.mpdConnectionEnd', {})),
                    onConnectionFaild: () => say(translation.randomTranslation('error.mpdConnectionFaild', {}))
                })

                // connect to mpd server, retry for 3 times in case it's booting
                await musicPlayer.connect(3, 30)

                logger.debug(config)

                //mode.setInti(hermes.dialog())
                
                // subscribe to intent handlers
                const handlerOptions: HandlerOptions = {
                    confidenceScore: {
                        intentStandard: Number(config.confidenceIntentStanderd) || CONFIDENCE_DEFAULT.INTENT_STANDARD,
                        intentDrop: Number(config.confidenceIntentDrop) || CONFIDENCE_DEFAULT.INTENT_DROP,
                        slotDrop: Number(config.confidenceSlotDrop) || CONFIDENCE_DEFAULT.SLOT_DROP,
                        asrDrop: Number(config.confidenceAsrDrop) || CONFIDENCE_DEFAULT.ASR
                    }
                }
                onIntentDetected(hermes, musicPlayer, handlerOptions)
                // subscribe to sessionStarted and sessionEnded
                onSessionToggle(hermes, musicPlayer)
    
                resolve(done)
            } catch (error) {
                // Output initialization errors to stderr and exit
                const message = await translation.errorMessage(error)
                logger.error(message)
                logger.error(error)
                // Exit
                done()
                // Reject
                reject(error)
            }
        }, hermesOptions)
    })
}