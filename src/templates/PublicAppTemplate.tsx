import * as React from "react";
import {useEffect} from "react";
import {Navigate} from "react-router-dom";
import {useConnectedUserInfo} from "../providers/ConnectedUserProvider/hooks";
import {useChatbot} from "../providers/ChatbotProvider/hooks";
import {RouteInterface} from "../types/routeTypes";

interface PublicAppTemplateProps {
    route: RouteInterface
    defaultPrivateRoute: RouteInterface
    defaultPublicRoute: RouteInterface
    children: React.ReactNode
}

/**
 * Public app template
 * Wraps public pages and redirects authenticated users to private area
 * Unless route.options?.opened is true (public pages accessible when connected)
 */
const PublicAppTemplate: React.ComponentType<PublicAppTemplateProps> = (
    {
        route,
        defaultPrivateRoute,
        children
    }) => {

    /*******************************************************************************************************************
     *                                                  HOOKS
     ******************************************************************************************************************/

    const {user} = useConnectedUserInfo();
    const {setIsChatbotEnabled} = useChatbot();

    /*******************************************************************************************************************
     *                                                  EFFECTS
     ******************************************************************************************************************/

    // Disable chatbot on public pages
    useEffect(() => {
        setIsChatbotEnabled(false);
        return () => setIsChatbotEnabled(true);
    }, [setIsChatbotEnabled]);

    /*******************************************************************************************************************
     *                                                  RENDER
     ******************************************************************************************************************/

    // Redirect authenticated users to private area (unless page is opened)
    const isOpened = route.options?.opened === true;
    if (user && !isOpened) {
        return <Navigate to={defaultPrivateRoute.path} replace />;
    }

    return (
        <>
            {children}
        </>
    );
};

export default PublicAppTemplate;
