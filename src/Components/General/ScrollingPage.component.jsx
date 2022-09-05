import { useEffect, useState } from "react"
import { ScrollPanel } from 'primereact/scrollpanel';

export const ScrollingPage = ({offsetY, children, offsetBottom, width}) => {
    let dOffsetY = offsetY ? offsetY + 68 : 70;
    dOffsetY -= offsetBottom ? offsetBottom : 0;

    return (
        <ScrollPanel className="pm" style={{width: width ? width: '100vw', height: 
            `calc(100vh - ${dOffsetY}px)`, padding:'0.5rem 2rem', overflowX: 'visible'}}>
            { children }
        </ScrollPanel>
    );
}