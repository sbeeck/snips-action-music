import { IntentMessage, slotType, NluSlot } from 'hermes-javascript'
import { message, camelize } from '../utils'
import {
    SLOT_CONFIDENCE_THRESHOLD,
    VOLUME_MINIMUM,
    VOLUME_MAXIMUM
} from '../constants'

export const checkVolumeRange = function (rawVolume: number): number {
    return rawVolume > VOLUME_MAXIMUM ? VOLUME_MAXIMUM : rawVolume < VOLUME_MINIMUM ? VOLUME_MINIMUM : rawVolume
}

export const extractVolumeNumber = function(msg: IntentMessage): number {

    let slotNamesRaw = [
        'volume_set_absolute',
        'volume_set_min_max'
    ]

    let res: any = {}

    slotNamesRaw.forEach( (slot_name_raw) => {
        let tempSlot: NluSlot<slotType.custom> | null = message.getSlotsByName(msg, slot_name_raw, {
            onlyMostConfident: true,
            threshold: SLOT_CONFIDENCE_THRESHOLD
        })
        if (tempSlot) {
            res[camelize.camelize(slot_name_raw)] = tempSlot.value.value
        }
    })

    if (res.volumeSetMinMax == 'minimum') {
        return VOLUME_MINIMUM
    }

    if (res.volumeSetMinMax == 'maximum') {
        return VOLUME_MAXIMUM
    }

    if (res.volumeSetAbsolute) {
        return checkVolumeRange(res.volumeSetAbsolute)
    }

    // If no value found, report an intent error
    throw new Error('nluIntentErrorStanderd')
}