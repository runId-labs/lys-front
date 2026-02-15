import {TranslationType} from "../types/i18nTypes";

/**
 * Framework-level messages (logout, session, etc.)
 */
export const messagesTranslations: TranslationType = {
    logoutSuccess: {
        en: "You have been successfully logged out",
        fr: "Vous avez été déconnecté avec succès"
    },
    sessionExpired: {
        en: "Your session has expired. Please log in again.",
        fr: "Votre session a expiré. Veuillez vous reconnecter."
    }
};
