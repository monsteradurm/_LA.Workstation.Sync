import { useContext, useEffect, useState } from "react";
import { PerforceService } from "../../Services/Perforce.service";
import { take } from "rxjs/operators";
import { Stack } from "react-bootstrap";
import { RepositoryContext } from "../../App";

export const Ignore = ({repoDispatch}) => {
    const { IgnoreFile, ClientId, DepotId } = useContext(RepositoryContext);
    const [ignored, setIgnored] = useState(null);
    const [ignoredContents, setIgnoredContents] = useState(null);

    console.log("IGNORE", IgnoreFile);
    useEffect(() => {
        if (!IgnoreFile || !ClientId || !DepotId)
            setIgnoredContents(null);

        PerforceService.ReadIgnores(ClientId, DepotId).pipe(
            take(1)
        ).subscribe(result => {
            if (result?.prompt)
                setIgnoredContents(result.prompt);
            else setIgnoredContents(null);
        })

    }, [IgnoreFile, ClientId, DepotId])
    useEffect(() => {
        if (!IgnoreFile) {
            setIgnored(null);
            return;
        }

        PerforceService.ReadFile(IgnoreFile).pipe(
            take(1)
        ).subscribe(({data, error}) => {
            if (data)
                setIgnored(data);
        })
    }, [IgnoreFile])

    return (
    <>
    {
        IgnoreFile ? 
        <Stack direction="vertical" gap={3}>
            {
                ignored ? 
                <>
                    <Stack direction="horizontal" gap={1} style={{marginTop: 20}}>
                        <div>The</div> 
                        <div className="laws-attr-value">p4Ignore</div> 
                        <div>file for this</div> 
                        <div className="laws-attr-value">Repository</div> 
                        <div>contains:</div> 
                    </Stack>
                    <pre>{ignored}</pre>
                </> : null
            }
            {
                ignoredContents ?
                <>
                    <Stack direction="horizontal" gap={1} style={{marginTop: 20}}>
                        <div>The</div> 
                        <div className="laws-attr-value">Ignored</div> 
                        <div>contents for this</div> 
                        <div className="laws-attr-value">Repository</div> 
                        <div>includes:</div>
                    </Stack>
                    <pre>{ignoredContents}</pre>
                </> : null
            }
        </Stack> : 
        <Stack direction="horizontal" gap={1} style={{marginTop: 20}}>
                <div>A</div> 
                <div className="laws-attr-value">p4Ignore</div> 
                <div>file has not been set for this</div> 
                <div className="laws-attr-value">Repository</div> 
        </Stack>
    }
    </>)
}