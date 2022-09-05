import { Packaging } from "./Packaging.component"
import { Changes } from "./Changes.component"
import { Ignore } from "./Ignore.component"

export const PageView = ({page, client, depot, ignore, setBusy, where }) => {
    if (['Submitted', 'Pending', 'Shelved'].indexOf(page) >= 0)
        return <Changes depot={depot} client={client} setBusy={setBusy} type={page.toLowerCase()} />
    else if (page === 'Ignore')
        return <Ignore ignoreFile={ignore} setBusy={setBusy}
            client={client} depot={depot} />
    else if (page === 'Packaging')
        return <Packaging client={client} depot={depot} where={where} setBusy={setBusy} />
}