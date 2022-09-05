export const DisplayWhen = ({alt, condition, children}) => {
    return (
    <>
    {
        !condition ? alt : null 
    }
    {
        <div style={{display: condition ? null : "none"}}>{children}</div>
    }
    </>)
}