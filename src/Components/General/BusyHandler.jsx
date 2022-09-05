import { useEffect, useRef, useState } from "react"
import { DisplayWhen } from "./DisplayWhen";
import { Loading } from "./Loading";

export const BusyHandler = ({message$, children}) => {
    const [message, setMessage] = useState(null);
    const subscription = useRef();

    useEffect(() => {
        if (!message$)
            return;

        if (subscription.current)
            subscription.unsubscribe();
        
        subscription.current = message$.subscribe(setMessage);
        return () => {
            if (subscription.current)
            subscription.current.unsubscribe();
        }
    }, [message$])

    return <DisplayWhen condition={!message} alt={
        <div style={{height: 'calc(100vh - 70px)'}}>
            <Loading text={message} />
        </div>
    }>
        {children}
    </DisplayWhen>
}