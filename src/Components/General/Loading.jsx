import { Stack } from "react-bootstrap"
import { BreedingRhombusSpinner, LoopingRhombusesSpinner, SemipolarSpinner } from "react-epic-spinners"

export const Loading = ({size, fontSize, text, opacity, gap, weight, color, spinner, marginTop, children}) => {
    const dSize = size ? size : 100;
    const dColor = color ? color : 'gray';
    const dWeight = weight ? weight : 600;
    const dGap = gap ? gap : 3;
    const dOpacity = opacity ? opacity : 0.5;
    const dFontSize = fontSize ? fontSize : 20;
    const dMarginTop = marginTop ? marginTop : 0;

    const Spinner = () => {
        if (!spinner)
        return <SemipolarSpinner color={dColor} className="mx-auto" size={dSize}
            style={{opacity:dOpacity}}/>

        switch (spinner) {
            case 'looping-rhombuses-spinner':
                return <LoopingRhombusesSpinner color={dColor} className="mx-auto" size={dSize}
                style={{opacity:dOpacity}}/>

            case 'breeding-rhombus-spinner': 
                return <BreedingRhombusSpinner color={dColor} className="mx-auto" size={dSize}
                style={{opacity:dOpacity}} />
            default:
                return <SemipolarSpinner color={dColor} className="mx-auto" size={dSize}
                        style={{opacity:dOpacity}}/>
        }
    }
    return (
        <Stack direction="vertical" gap={dGap} className="mx-auto my-auto" 
            style={{justifyContent: 'center', opacity:{dOpacity}, height: '100%'}}>
            <Spinner />
            {
                text ? 
                <div style={{fontWeight: {dWeight}, color: {dColor}, marginTop: {dMarginTop},
                    fontSize:{dFontSize}, textAlign: 'center'}}>
                    {text}
                </div> : null
            }
        </Stack>
    )
}