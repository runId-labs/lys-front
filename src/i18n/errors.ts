import {I18nLocaleEnum} from "../types/i18nTypes";

/**
 * System error message translations
 *
 * Error constants match those defined in the backend:
 * - mimir-api/app/libs/lys/src/lys/core/consts/errors.py
 * - mimir-api/app/libs/lys/src/lys/apps/user_auth/errors.py
 * - mimir-api/app/libs/lys/src/lys/apps/user_role/errors.py
 *
 * Plus frontend-specific errors (REACT_RENDER_ERROR, NETWORK_ERROR, etc.)
 */
export const errorTranslations = {
    // Core errors (400)
    NOT_UUID: {
        en: "Invalid identifier format.",
        fr: "Format d'identifiant invalide."
    },

    // Core errors (403)
    PERMISSION_DENIED: {
        en: "You do not have permission to perform this action.",
        fr: "Vous n'avez pas la permission d'effectuer cette action."
    },

    // Core errors (404)
    NOT_FOUND: {
        en: "Resource not found.",
        fr: "Ressource introuvable."
    },
    UNKNOWN_WEBSERVICE: {
        en: "Unknown service.",
        fr: "Service inconnu."
    },
    SEARCH_TOO_LONG: {
        en: "Search query is too long.",
        fr: "La recherche est trop longue."
    },
    UNSAFE_URL: {
        en: "The provided URL is not allowed.",
        fr: "L'URL fournie n'est pas autorisée."
    },

    // User authentication errors (400)
    EMPTY_LOGIN_ERROR: {
        en: "Login cannot be empty.",
        fr: "L'identifiant ne peut pas être vide."
    },
    EMPTY_PASSWORD_ERROR: {
        en: "Password cannot be empty.",
        fr: "Le mot de passe ne peut pas être vide."
    },
    WEAK_PASSWORD: {
        en: "Password is too weak. Please use a stronger password.",
        fr: "Le mot de passe est trop faible. Veuillez utiliser un mot de passe plus fort."
    },
    INVALID_NAME: {
        en: "Invalid name format.",
        fr: "Format de nom invalide."
    },
    INVALID_GENDER: {
        en: "Invalid gender.",
        fr: "Genre invalide."
    },
    INVALID_LANGUAGE: {
        en: "Invalid language.",
        fr: "Langue invalide."
    },
    INVALID_RESET_TOKEN_ERROR: {
        en: "Invalid password reset token.",
        fr: "Jeton de réinitialisation de mot de passe invalide."
    },
    EXPIRED_RESET_TOKEN_ERROR: {
        en: "Password reset token has expired.",
        fr: "Le jeton de réinitialisation de mot de passe a expiré."
    },
    EMAIL_ALREADY_VALIDATED_ERROR: {
        en: "Email address is already validated.",
        fr: "L'adresse email est déjà validée."
    },
    INVALID_STATUS_CHANGE: {
        en: "Invalid status change.",
        fr: "Changement de statut invalide."
    },
    INVALID_USER_STATUS: {
        en: "Invalid user status.",
        fr: "Statut utilisateur invalide."
    },
    INVALID_USER_ID: {
        en: "Invalid user identifier.",
        fr: "Identifiant utilisateur invalide."
    },
    USER_ALREADY_ANONYMIZED: {
        en: "User is already anonymized.",
        fr: "L'utilisateur est déjà anonymisé."
    },

    // User authentication errors (401)
    ACCESS_DENIED_ERROR: {
        en: "Access denied. Please log in.",
        fr: "Accès refusé. Veuillez vous connecter."
    },
    INVALID_REFRESH_TOKEN_ERROR: {
        en: "Your session has expired. Please log in again.",
        fr: "Votre session a expiré. Veuillez vous reconnecter."
    },
    INVALID_CREDENTIALS_ERROR: {
        en: "Invalid email or password.",
        fr: "Email ou mot de passe incorrect."
    },
    WRONG_REFRESH_TOKEN_ERROR: {
        en: "Invalid session. Please log in again.",
        fr: "Session invalide. Veuillez vous reconnecter."
    },

    // User authentication errors (403)
    BLOCKED_USER_ERROR: {
        en: "Your account has been blocked. Please contact support.",
        fr: "Votre compte a été bloqué. Veuillez contacter le support."
    },
    INVALID_XSRF_TOKEN_ERROR: {
        en: "Security token expired. Please refresh the page.",
        fr: "Jeton de sécurité expiré. Veuillez actualiser la page."
    },
    ALREADY_CONNECTED_ERROR: {
        en: "You are already connected.",
        fr: "Vous êtes déjà connecté."
    },

    // User authentication errors (409)
    USER_ALREADY_EXISTS: {
        en: "An account with this email already exists.",
        fr: "Un compte avec cet email existe déjà."
    },

    // User authentication errors (429)
    RATE_LIMIT_ERROR: {
        en: "Too many requests. Please try again later.",
        fr: "Trop de requêtes. Veuillez réessayer plus tard."
    },

    // User role errors (403)
    UNAUTHORIZED_ROLE_ASSIGNMENT: {
        en: "You are not authorized to assign this role.",
        fr: "Vous n'êtes pas autorisé à assigner ce rôle."
    },

    // Frontend-specific errors
    REACT_RENDER_ERROR: {
        en: "An unexpected error occurred while rendering the page.",
        fr: "Une erreur inattendue s'est produite lors de l'affichage de la page."
    },
    NETWORK_ERROR: {
        en: "Network error. Please check your internet connection.",
        fr: "Erreur réseau. Veuillez vérifier votre connexion internet."
    },
    CONNECTION_FAILED: {
        en: "Connection failed. Please try again.",
        fr: "Échec de la connexion. Veuillez réessayer."
    },
    TIMEOUT_ERROR: {
        en: "Request timeout. Please try again.",
        fr: "Délai d'attente dépassé. Veuillez réessayer."
    },
    UNKNOWN_ERROR: {
        en: "An unknown error occurred.",
        fr: "Une erreur inconnue s'est produite."
    },

    // SSO errors
    SSO_USER_NOT_FOUND: {
        en: "No account found for this SSO identity. Please sign up first.",
        fr: "Aucun compte trouvé pour cette identité SSO. Veuillez d'abord vous inscrire."
    },
    SSO_SESSION_EXPIRED: {
        en: "SSO session has expired. Please try again.",
        fr: "La session SSO a expiré. Veuillez réessayer."
    },
    SSO_ACCOUNT_ALREADY_LINKED: {
        en: "This SSO provider is already linked to your account.",
        fr: "Ce fournisseur SSO est déjà lié à votre compte."
    },
    SSO_EXTERNAL_ID_CONFLICT: {
        en: "This SSO identity is already linked to another account.",
        fr: "Cette identité SSO est déjà liée à un autre compte."
    },
    SSO_NOT_AUTHENTICATED: {
        en: "You must be logged in to link an SSO provider.",
        fr: "Vous devez être connecté pour lier un fournisseur SSO."
    },
    SSO_CALLBACK_ERROR: {
        en: "SSO authentication failed. Please try again.",
        fr: "L'authentification SSO a échoué. Veuillez réessayer."
    },

    // Subscription/License errors
    MAX_LICENSED_USERS_REACHED: {
        en: "License quota exceeded. Please upgrade your subscription.",
        fr: "Quota de licences dépassé. Veuillez mettre à niveau votre abonnement."
    },

    // Billing mode errors
    PROVIDER_SUBSCRIPTION_ACTIVE: {
        en: "This subscription is still collected automatically. Cancel it and wait for the cancellation to take effect before billing manually.",
        fr: "Cet abonnement est encore prélevé automatiquement. Résiliez-le et attendez que la résiliation prenne effet avant de facturer manuellement."
    },
    UNKNOWN_BILLING_MODE: {
        en: "This billing mode does not exist or is disabled.",
        fr: "Ce mode de facturation n'existe pas ou est désactivé."
    },
    PLAN_VERSION_PRICE_NOT_FOUND: {
        en: "This price does not exist.",
        fr: "Ce tarif n'existe pas."
    },

    // Catalogue administration errors
    PLAN_NOT_AVAILABLE: {
        en: "This plan is not available for a new subscription.",
        fr: "Cette offre n'est pas disponible pour une nouvelle souscription."
    },
    PLAN_VERSION_NOT_FOUND: {
        en: "This plan version does not exist.",
        fr: "Cette version d'offre n'existe pas."
    },
    PLAN_VERSION_NOT_PRICED: {
        en: "This plan version has no price for the requested terms.",
        fr: "Cette version d'offre n'a pas de tarif pour les conditions demandées."
    },
    DUPLICATE_PRICE: {
        en: "Two prices share the same billing period, currency and commitment.",
        fr: "Deux tarifs partagent la même périodicité, devise et engagement."
    },
    INVALID_PRICE_AMOUNT: {
        en: "A price must be a strictly positive amount.",
        fr: "Un tarif doit être un montant strictement positif."
    },
    UNKNOWN_PRICE_PERIOD: {
        en: "This billing period does not exist or is disabled.",
        fr: "Cette périodicité de facturation n'existe pas ou est désactivée."
    },
    UNKNOWN_CURRENCY: {
        en: "This currency does not exist or is disabled.",
        fr: "Cette devise n'existe pas ou est désactivée."
    },
    UNKNOWN_COMMITMENT: {
        en: "This commitment does not exist or is disabled.",
        fr: "Cet engagement n'existe pas ou est désactivé."
    },
    INVALID_COMMITMENT_DURATION: {
        en: "This commitment does not span a whole number of billing periods.",
        fr: "Cet engagement ne couvre pas un nombre entier de périodes de facturation."
    },
    NO_RULE_ON_VERSION: {
        en: "A plan version must declare at least one rule. Leave a limit empty to grant it without a cap.",
        fr: "Une version d'offre doit déclarer au moins une règle. Laissez une limite vide pour l'accorder sans plafond."
    },
    DUPLICATE_RULE: {
        en: "The same rule is set twice on this version.",
        fr: "La même règle est définie deux fois sur cette version."
    },
    UNKNOWN_RULE: {
        en: "This rule does not exist or is disabled.",
        fr: "Cette règle n'existe pas ou est désactivée."
    },
    INVALID_RULE_LIMIT: {
        en: "A quota limit cannot be negative.",
        fr: "La limite d'un quota ne peut pas être négative."
    }
} satisfies Record<string, Record<I18nLocaleEnum, string>>;

/**
 * Type representing all available error translation keys
 */
export type ErrorTranslationKey = keyof typeof errorTranslations;

/**
 * Check if a string is a known error key
 */
export function isErrorKey(key: string): key is ErrorTranslationKey {
    return key in errorTranslations;
}
