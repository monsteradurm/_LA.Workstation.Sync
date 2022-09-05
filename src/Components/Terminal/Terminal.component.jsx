import { useEffect, useState } from "react";
import { Stack } from "react-bootstrap";
import { NavigationService } from "../../Services/Navigation.service";
import { PerforceService } from "../../Services/Perforce.service";
import { ScrollingPage } from "../General/ScrollingPage.component";

export const Terminal = ({}) => {
    const [output, setOutput] = useState(null);

    useEffect(() => {
        const subs = [];
        NavigationService.SetTitles(['Terminal']);

        subs.push(
            PerforceService.Console$.subscribe(
                setOutput
            )
        );

        return () => subs.forEach(s => s.unsubscribe());
    }, [])

    return (<>
        <div style={{padding: '10px 50px'}}>
            {
                output ?
                <Stack direction="horizontal" gap={1} style={{marginTop: 20, marginBottom: 20}}>
                    <div>{output.length}</div>
                    <div>lines...</div>
                </Stack> : null
            }
            <div style={{height: '90%', border: 'solid 1px black'}}>
                <ScrollingPage offsetBottom={-110} width={'100%'}>
                    <Stack className="laws-terminal" direction="vertical" gap={1} >
                    {
                        output ? 
                        Object.entries(output).map(t => <div key={t[0]}>{t[1]}</div>)
                        : null
                    }
                    </Stack>
                </ScrollingPage>
            </div>
        </div>
    </>)
}