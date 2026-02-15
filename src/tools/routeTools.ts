import {RouteInterface} from "../types/routeTypes";
import {PageDescriptionType} from "../types/descriptionTypes";
import {lowerCaseFirstLetter} from "./stringTools";
import {isEmpty} from "./validationTools";
import type {AppDescription} from "../types/relayTypes";

/**
 * Generate URL by replacing path parameters with provided values
 * @param path - URL path with placeholders (e.g., "/user/:id")
 * @param parameters - Object with path parameter values to substitute
 * @param queryParameters - Object with query parameter values to append
 * @returns Generated URL with replaced parameters and query string
 */
export const generateUrl = (
    path: string,
    parameters: {[key: string]: string} = {},
    queryParameters: {[key: string]: string} = {}
) => {
    if (!isEmpty(parameters) && !isEmpty(path)) {
        const splitPath = path.split('/');
        Object.keys(splitPath).forEach(pathKey => {
            Object.keys(parameters).forEach(key => {
                if ( splitPath[parseInt(pathKey)] === ':' + key) {
                    splitPath[parseInt(pathKey)] = parameters[key];
                }
            });
        });
        path = splitPath.join('/');
    }

    // Append query parameters if provided
    if (!isEmpty(queryParameters)) {
        const queryString = new URLSearchParams(queryParameters).toString();
        path = `${path}?${queryString}`;
    }

    return path;
}

/**
 * Generate URL from route using path and query parameters
 */
export const generateUrlByRoute = (
    route: RouteInterface,
    parameters: {[key: string]: string} = {},
    queryParameters: {[key: string]: string} = {}
) => {
    return generateUrl(route.path, parameters, queryParameters)
}

/**
 * Convert page description to route interface
 */
export const generateRouteFromDescription = (
    pageDescription: PageDescriptionType,
    defaultTransPrefix: string = "lys.components.pages."
): RouteInterface => {
    return {
        name: pageDescription.name,
        transPrefix: defaultTransPrefix + lowerCaseFirstLetter(pageDescription.name) + ".",
        path: pageDescription.path,
        component: pageDescription.component,
        template: pageDescription.template,
        type: pageDescription.type,
        breadcrumbs: pageDescription.breadcrumbs,
        options: pageDescription.options,
        mainWebserviceName: pageDescription.mainWebserviceName,
    }
}

/**
 * Generate route table from app description
 */
export const generateRouteTable = (
    appDescription: AppDescription,
    defaultTransPrefix: string = "lys.components.pages."
): RouteInterface[] => {
    const pages: {[key: string]: PageDescriptionType} = appDescription?.components?.pages ?? {}

    return Object.keys(pages).map((pageName) => {
        const pageDescription: PageDescriptionType = pages[pageName];

        return generateRouteFromDescription(pageDescription, defaultTransPrefix)
    })
}
