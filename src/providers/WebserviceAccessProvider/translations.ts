import {createComponentTranslations} from "../../tools/translationTools";

const translations = {
    errorTitle: {
        en: "Permission System Error",
        fr: "Erreur du système de permissions"
    },
    errorMessage: {
        en: "Unable to load permission system. Please check your connection and try refreshing the page.",
        fr: "Impossible de charger le système de permissions. Veuillez vérifier votre connexion et rafraîchir la page."
    },
    loadingPermissions: {
        en: "Loading permissions...",
        fr: "Chargement des permissions..."
    }
};

const {config, useTranslations} = createComponentTranslations(
    "WebserviceAccessProvider",
    translations
);

export const webserviceAccessProviderConfig = config;
export const useWebserviceAccessProviderTranslations = useTranslations;
